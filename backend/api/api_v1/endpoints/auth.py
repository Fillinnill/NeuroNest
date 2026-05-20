from typing import Any, Optional
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from db.session import get_db
from db import models
from schemas import user as schemas_user
from schemas.guardian import GuardianVerifyRequest, GuardianVerifyResponse
from core.security import get_password_hash, verify_password, create_access_token
from dependencies import get_current_user

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
#  LOGIN — returns role in token response so frontend can route immediately
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=schemas_user.Token)
def login(
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> dict:
    """Authenticate user and return JWT token including role."""
    user = db.query(models.User).filter(
        (models.User.username == form_data.username) |
        (models.User.email == form_data.username)
    ).first()

    if not user:
        print(f"[Auth Debug] Login failure: User '{form_data.username}' not found in database.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password. Please try again."
        )

    if not verify_password(form_data.password, user.password_hash):
        print(f"[Auth Debug] Login failure: Password verification failed for user '{user.username}' (ID: {user.id}).")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password. Please try again."
        )

    # Embed role in JWT so the frontend can route without an extra /me call
    access_token = create_access_token({
        "sub": str(user.id),
        "role": user.role or "child",
    })
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role or "child",
    }



# ─────────────────────────────────────────────────────────────────────────────
#  GUARDIAN VERIFY — called from inside the Guardian Dashboard
#  Step: Guardian enters student username + password to unlock their reports
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/guardian-verify", response_model=GuardianVerifyResponse)
async def guardian_verify(
    data: GuardianVerifyRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> Any:
    """
    Guardian enters student credentials from inside the Guardian Dashboard.
    On success:
      - Auto-creates or refreshes a GuardianUserAccess connection record
      - Issues a guardian-scoped JWT containing student_id
      - Sends a real-time WebSocket notification to the student
      - Logs an audit notification in the DB
    """
    if current_user.role != "parent":
        print(f"[Auth Debug] Rejected role: '{current_user.role}' in guardian_verify for user '{current_user.username}' (ID: {current_user.id})")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Guardian/Parent accounts can access student reports."
        )

    # Find the student by username (case-insensitive)
    from sqlalchemy import func
    student = db.query(models.User).filter(
        func.lower(models.User.username) == data.student_username.strip().lower(),
        models.User.role == "child"
    ).first()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No learner account found with username '@{data.student_username}'. Please check the spelling."
        )

    # Verify student credentials (password or access code)
    verification_ok = False

    if data.student_password:
        verification_ok = verify_password(data.student_password, student.password_hash)

    if not verification_ok and data.student_verification_code:
        student_code = None
        if student.preferences and isinstance(student.preferences, dict):
            student_code = student.preferences.get("guardian_access_code")
        if student_code and data.student_verification_code == student_code:
            verification_ok = True

    if not verification_ok:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect student password or verification code. Please double-check and try again."
        )

    # Auto-create connection if it doesn't exist yet, or refresh existing one
    conn = db.query(models.GuardianUserAccess).filter(
        models.GuardianUserAccess.guardian_id == current_user.id,
        models.GuardianUserAccess.student_id == student.id,
    ).first()

    if conn:
        conn.is_active = 1
        conn.last_accessed_at = datetime.utcnow()
    else:
        conn = models.GuardianUserAccess(
            guardian_id=current_user.id,
            student_id=student.id,
            relationship_type="Guardian",
            is_active=1,
            last_accessed_at=datetime.utcnow(),
            report_visibility=1,
        )
        db.add(conn)

    db.commit()

    # Issue a guardian-scoped JWT (8-hour session)
    token_payload = {
        "sub": str(current_user.id),
        "role": "parent",
        "student_id": student.id,
        "session_type": "guardian",
        "guardian_name": current_user.fullname or current_user.username,
    }
    access_token = create_access_token(token_payload, expires_delta=timedelta(hours=8))

    # Audit notification for the student (persisted)
    try:
        import pytz
        ist = pytz.timezone("Asia/Kolkata")
        now_ist = datetime.now(ist)
        time_str = now_ist.strftime("%I:%M %p").lstrip("0")
    except Exception:
        time_str = datetime.utcnow().strftime("%H:%M UTC")

    notification_msg = (
        f"Your guardian {current_user.fullname or current_user.username} "
        f"(@{current_user.username}) accessed your NeuroNest reports at {time_str}."
    )
    notification = models.Notification(
        user_id=student.id,
        message=notification_msg,
        type="guardian_login",
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)

    # Real-time WebSocket push to student (best-effort, never blocks response)
    try:
        from api.api_v1.endpoints.ws import manager
        import asyncio
        import pytz
        ist = pytz.timezone("Asia/Kolkata")
        now_ist = datetime.now(ist)
        ws_payload = {
            "type": "guardian_access",
            "message": notification_msg,
            "guardian_name": current_user.fullname or current_user.username,
            "timestamp": now_ist.isoformat(),
        }
        asyncio.create_task(manager.broadcast_to_user(student.id, ws_payload))
    except Exception:
        pass

    return GuardianVerifyResponse(
        access_token=access_token,
        student_id=student.id,
        student_name=student.fullname or student.username,
        guardian_name=current_user.fullname or current_user.username,
    )


# ─────────────────────────────────────────────────────────────────────────────
#  REGISTER
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/register", response_model=schemas_user.User)
def register(
    *,
    db: Session = Depends(get_db),
    user_in: schemas_user.UserCreate,
) -> models.User:
    """Create a new student or guardian account."""
    if db.query(models.User).filter(models.User.email == user_in.email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    if db.query(models.User).filter(models.User.username == user_in.username).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already taken")

    role = "child"
    if user_in.preferences and "role" in user_in.preferences:
        pref_role = user_in.preferences["role"]
        if pref_role == "parent":
            role = "parent"
        else:
            role = "child"

    db_user = models.User(
        email=user_in.email,
        username=user_in.username,
        fullname=user_in.fullname,
        age=user_in.age,
        anxiety_level=user_in.anxiety_level,
        communication_goals=user_in.communication_goals,
        preferences=user_in.preferences,
        password_hash=get_password_hash(user_in.password),
        role=role,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    if role == "parent":
        rel = "Parent"
        phone = ""
        if user_in.preferences:
            rel = user_in.preferences.get("relationship_to_user", "Parent")
            phone = user_in.preferences.get("phone_number", "")

        db_guardian = models.Guardian(
            user_id=db_user.id,
            relationship_to_user=rel,
            phone_number=phone,
        )
        db.add(db_guardian)
        db.commit()

    return db_user


# ─────────────────────────────────────────────────────────────────────────────
#  ME
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/me", response_model=schemas_user.User)
def read_user_me(
    current_user: models.User = Depends(get_current_user),
) -> Any:
    """Get current authenticated user details (includes role)."""
    return current_user
