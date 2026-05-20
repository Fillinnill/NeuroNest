from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel
from db.session import get_db
from db import models
from dependencies import get_current_user, require_parent, require_child
from datetime import datetime

router = APIRouter()


class AccessRequestCreate(BaseModel):
    student_username: str
    relationship_type: str
    reason: Optional[str] = ""


class ResponseAction(BaseModel):
    action: str  # "accept" or "reject"


class ConnectionOut(BaseModel):
    id: int
    guardian_id: int
    student_id: int
    relationship_type: str
    granted_at: datetime
    student_name: Optional[str] = None
    student_username: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_username: Optional[str] = None

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
#  Access Requests
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/requests/create", status_code=status.HTTP_201_CREATED)
def create_access_request(
    data: AccessRequestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_parent),
) -> Any:
    """Guardian requests access to a student user account."""
    student = db.query(models.User).filter(
        models.User.username == data.student_username,
        models.User.role == "child"
    ).first()

    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student learner username '{data.student_username}' not found. Please verify spelling."
        )

    existing = db.query(models.AccessRequest).filter(
        models.AccessRequest.guardian_id == current_user.id,
        models.AccessRequest.student_id == student.id,
        models.AccessRequest.status == "pending"
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An access request for this student is already pending approval."
        )

    active_access = db.query(models.GuardianUserAccess).filter(
        models.GuardianUserAccess.guardian_id == current_user.id,
        models.GuardianUserAccess.student_id == student.id,
        models.GuardianUserAccess.is_active == 1
    ).first()

    if active_access:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have active connection permissions for this student."
        )

    req = models.AccessRequest(
        guardian_id=current_user.id,
        student_id=student.id,
        relationship_type=data.relationship_type,
        reason=data.reason,
        status="pending"
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    notification = models.Notification(
        user_id=student.id,
        message=(
            f"Guardian {current_user.fullname} (@{current_user.username}) is requesting access "
            f"to your NeuroNest reports and progress analytics."
        ),
        type="access_request"
    )
    db.add(notification)
    db.commit()

    return {"message": "Access connection request sent successfully.", "request_id": req.id}


@router.get("/requests/pending", response_model=List[Any])
def get_pending_requests(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_child),
) -> Any:
    """Get all pending access requests for the logged-in student."""
    requests = db.query(models.AccessRequest).filter(
        models.AccessRequest.student_id == current_user.id,
        models.AccessRequest.status == "pending"
    ).all()

    result = []
    for req in requests:
        guardian = db.query(models.User).filter(models.User.id == req.guardian_id).first()
        result.append({
            "id": req.id,
            "guardian_id": req.guardian_id,
            "guardian_name": guardian.fullname if guardian else "Unknown Parent",
            "guardian_username": guardian.username if guardian else "unknown",
            "relationship_type": req.relationship_type,
            "reason": req.reason,
            "created_at": req.created_at
        })
    return result


@router.post("/requests/{id}/respond")
def respond_to_access_request(
    id: int,
    data: ResponseAction,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_child),
) -> Any:
    """Student accepts or declines the connection access request."""
    req = db.query(models.AccessRequest).filter(
        models.AccessRequest.id == id,
        models.AccessRequest.student_id == current_user.id
    ).first()

    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Access request not found or unauthorized.")
    if req.status != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Already processed: {req.status}")
    if data.action not in ["accept", "reject"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid action. Use 'accept' or 'reject'.")

    req.status = "accepted" if data.action == "accept" else "rejected"
    db.commit()

    if data.action == "accept":
        access = models.GuardianUserAccess(
            guardian_id=req.guardian_id,
            student_id=req.student_id,
            relationship_type=req.relationship_type,
            is_active=1
        )
        db.add(access)
        notif = models.Notification(
            user_id=req.guardian_id,
            message=f"Student {current_user.fullname} (@{current_user.username}) ACCEPTED your connection access request.",
            type="access_alert"
        )
        db.add(notif)
    else:
        notif = models.Notification(
            user_id=req.guardian_id,
            message=f"Student {current_user.fullname} (@{current_user.username}) DECLINED your connection access request.",
            type="access_alert"
        )
        db.add(notif)

    db.commit()
    return {"message": f"Connection request successfully {data.action}ed."}


# ─────────────────────────────────────────────────────────────────────────────
#  Notifications
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/notifications", response_model=List[Any])
def get_user_notifications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> Any:
    """Fetch all notifications for the active account (newest first)."""
    return db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id
    ).order_by(models.Notification.created_at.desc()).all()


@router.post("/notifications/{id}/read")
def mark_notification_as_read(
    id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> Any:
    """Mark a notification as read."""
    notif = db.query(models.Notification).filter(
        models.Notification.id == id,
        models.Notification.user_id == current_user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")
    notif.is_read = 1
    db.commit()
    return {"message": "Notification marked as read."}


@router.post("/notifications/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> Any:
    """Mark ALL notifications for the current user as read."""
    db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == 0
    ).update({"is_read": 1})
    db.commit()
    return {"message": "All notifications marked as read."}


# ─────────────────────────────────────────────────────────────────────────────
#  Active Connections
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/connections", response_model=List[Any])
def get_active_connections(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> Any:
    """Fetch active approved connections for either student or parent accounts."""
    if current_user.role == "parent":
        connections = db.query(models.GuardianUserAccess).filter(
            models.GuardianUserAccess.guardian_id == current_user.id,
            models.GuardianUserAccess.is_active == 1
        ).all()
        result = []
        for conn in connections:
            student = db.query(models.User).filter(models.User.id == conn.student_id).first()
            if student:
                result.append({
                    "id": conn.id,
                    "student_id": conn.student_id,
                    "student_name": student.fullname,
                    "student_username": student.username,
                    "relationship_type": conn.relationship_type,
                    "granted_at": conn.granted_at,
                    "last_accessed_at": conn.last_accessed_at,
                    "report_visibility": conn.report_visibility,
                })
        return result
    else:
        # Student sees their connected guardians
        connections = db.query(models.GuardianUserAccess).filter(
            models.GuardianUserAccess.student_id == current_user.id,
            models.GuardianUserAccess.is_active == 1
        ).all()
        result = []
        for conn in connections:
            guardian = db.query(models.User).filter(models.User.id == conn.guardian_id).first()
            if guardian:
                result.append({
                    "id": conn.id,
                    "guardian_id": conn.guardian_id,
                    "guardian_name": guardian.fullname,
                    "guardian_username": guardian.username,
                    "relationship_type": conn.relationship_type,
                    "granted_at": conn.granted_at,
                    "last_accessed_at": conn.last_accessed_at,
                    "report_visibility": conn.report_visibility,
                    "is_active": conn.is_active,
                })
        return result


@router.delete("/connections/{id}")
def revoke_active_connection(
    id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
) -> Any:
    """Revoke or terminate access connection between Student and Guardian."""
    conn = db.query(models.GuardianUserAccess).filter(
        models.GuardianUserAccess.id == id,
        models.GuardianUserAccess.is_active == 1
    ).first()

    if not conn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active connection link not found.")
    if current_user.id != conn.guardian_id and current_user.id != conn.student_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized to revoke this connection.")

    conn.is_active = 0
    db.commit()

    if current_user.id == conn.student_id:
        alert = models.Notification(
            user_id=conn.guardian_id,
            message=f"Student {current_user.fullname} (@{current_user.username}) revoked your guardian access and disabled progress tracking.",
            type="permission_change"
        )
    else:
        alert = models.Notification(
            user_id=conn.student_id,
            message=f"Guardian {current_user.fullname} (@{current_user.username}) disconnected from your account and stopped monitoring.",
            type="permission_change"
        )

    db.add(alert)
    db.commit()
    return {"message": "Connection successfully revoked and other party notified."}


@router.patch("/connections/{id}/visibility")
def toggle_report_visibility(
    id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_child),
) -> Any:
    """Student can toggle full/limited report visibility for a guardian connection."""
    conn = db.query(models.GuardianUserAccess).filter(
        models.GuardianUserAccess.id == id,
        models.GuardianUserAccess.student_id == current_user.id,
        models.GuardianUserAccess.is_active == 1
    ).first()

    if not conn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found.")

    conn.report_visibility = 0 if conn.report_visibility == 1 else 1
    db.commit()

    visibility_label = "full" if conn.report_visibility == 1 else "limited"
    # Notify guardian of the visibility change
    guardian = db.query(models.User).filter(models.User.id == conn.guardian_id).first()
    if guardian:
        alert = models.Notification(
            user_id=conn.guardian_id,
            message=(
                f"Student {current_user.fullname} changed report visibility to "
                f"'{visibility_label}' for your guardian connection."
            ),
            type="permission_change"
        )
        db.add(alert)
        db.commit()

    return {"message": f"Report visibility set to {visibility_label}.", "report_visibility": conn.report_visibility}


# ─────────────────────────────────────────────────────────────────────────────
#  Student Metrics for Guardian Dashboard
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/students/metrics/{student_id}")
def get_student_metrics_for_guardian(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_parent),
) -> Any:
    """
    Basic metrics for the guardian overview (used by GuardianOverview page).
    Logs an access_alert notification to the student.
    """

    conn = db.query(models.GuardianUserAccess).filter(
        models.GuardianUserAccess.guardian_id == current_user.id,
        models.GuardianUserAccess.student_id == student_id,
        models.GuardianUserAccess.is_active == 1
    ).first()

    if not conn:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No active approved connection for this student.")

    # Update last_accessed_at
    conn.last_accessed_at = datetime.utcnow()
    db.commit()

    # Audit notification
    audit_log = models.Notification(
        user_id=student_id,
        message=f"Guardian {current_user.fullname} (@{current_user.username}) viewed your progress metrics.",
        type="access_alert"
    )
    db.add(audit_log)
    db.commit()

    student = db.query(models.User).filter(models.User.id == student_id).first()
    progress = db.query(models.DailyProgress).filter(
        models.DailyProgress.user_id == student_id
    ).order_by(models.DailyProgress.date.desc()).first()

    streak = progress.streak if progress else 0
    practice_minutes = progress.practice_minutes if progress else 0
    completed_tasks = progress.completed_tasks if progress else 0

    sessions = db.query(models.Session).filter(
        models.Session.user_id == student_id
    ).order_by(models.Session.created_at.desc()).all()

    session_logs = [{
        "id": s.id, "title": s.title, "description": s.description,
        "duration_minutes": s.duration_minutes, "created_at": s.created_at
    } for s in sessions]

    convs = db.query(models.Conversation).filter(models.Conversation.user_id == student_id).all()
    avg_confidence = sum(c.confidence_score for c in convs if c.confidence_score) / len(convs) if convs else 70.0
    avg_emotion = sum(c.emotion_score for c in convs if c.emotion_score) / len(convs) if convs else 75.0

    achievements = db.query(models.Achievement).filter(models.Achievement.user_id == student_id).all()
    earned_badges = [{
        "id": a.id, "badge_name": a.badge_name,
        "xp_reward": a.xp_reward, "earned_at": a.earned_at
    } for a in achievements]

    reports = db.query(models.AIReport).filter(
        models.AIReport.user_id == student_id
    ).order_by(models.AIReport.generated_at.desc()).all()
    ai_summaries = [{
        "id": r.id, "strengths": r.strengths, "weaknesses": r.weaknesses,
        "recommendations": r.recommendations, "generated_at": r.generated_at
    } for r in reports]

    return {
        "student": {
            "fullname": student.fullname,
            "username": student.username,
            "email": student.email,
            "age": student.age,
            "communication_goals": student.communication_goals,
            "anxiety_level": student.anxiety_level if conn.report_visibility == 1 else None,
        },
        "streak": streak,
        "practice_minutes": practice_minutes,
        "completed_tasks": completed_tasks,
        "avg_confidence": round(avg_confidence, 1),
        "avg_emotion": round(avg_emotion, 1),
        "sessions": session_logs,
        "achievements": earned_badges,
        "ai_reports": ai_summaries,
        "report_visibility": conn.report_visibility,
    }


@router.get("/students/metrics/{student_id}/full")
def get_student_full_metrics(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_parent),
) -> Any:
    """
    Extended metrics for the Guardian Analytics page.
    Returns per-conversation confidence/emotion scores and all daily progress
    records for chart rendering.
    """

    conn = db.query(models.GuardianUserAccess).filter(
        models.GuardianUserAccess.guardian_id == current_user.id,
        models.GuardianUserAccess.student_id == student_id,
        models.GuardianUserAccess.is_active == 1
    ).first()

    if not conn:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No active approved connection for this student.")

    conn.last_accessed_at = datetime.utcnow()
    db.commit()

    # Audit notification for the student when a guardian opens extended analytics
    audit_log = models.Notification(
        user_id=student_id,
        message=(
            f"Guardian {current_user.fullname} (@{current_user.username}) opened your detailed progress analytics."
        ),
        type="access_alert"
    )
    db.add(audit_log)
    db.commit()

    try:
        from api.api_v1.endpoints.ws import manager
        import asyncio
        ws_payload = {
            "type": "guardian_access",
            "message": audit_log.message,
            "guardian_name": current_user.fullname or current_user.username,
            "timestamp": datetime.utcnow().isoformat(),
        }
        asyncio.create_task(manager.broadcast_to_user(student_id, ws_payload))
    except Exception:
        pass

    # Per-conversation scores (for trend charts) — NO transcripts
    convs = db.query(models.Conversation).filter(
        models.Conversation.user_id == student_id
    ).order_by(models.Conversation.created_at.asc()).all()

    conversation_trend = [{
        "date": c.created_at.strftime("%b %d"),
        "confidence": round(c.confidence_score or 0, 1),
        "emotion": round(c.emotion_score or 0, 1),
        "scenario": c.scenario,
        "type": c.conversation_type,
    } for c in convs]

    # Daily progress history for streak calendar
    progress_records = db.query(models.DailyProgress).filter(
        models.DailyProgress.user_id == student_id
    ).order_by(models.DailyProgress.date.asc()).all()

    daily_history = [{
        "date": p.date.strftime("%Y-%m-%d"),
        "streak": p.streak,
        "practice_minutes": p.practice_minutes,
        "completed_tasks": p.completed_tasks,
    } for p in progress_records]

    # Session timeline with per-session confidence
    sessions = db.query(models.Session).filter(
        models.Session.user_id == student_id
    ).order_by(models.Session.created_at.asc()).all()

    session_timeline = [{
        "id": s.id,
        "title": s.title,
        "date": s.created_at.strftime("%b %d, %Y"),
        "duration_minutes": s.duration_minutes,
        "created_at": s.created_at,
    } for s in sessions]

    # AI Reports
    reports = db.query(models.AIReport).filter(
        models.AIReport.user_id == student_id
    ).order_by(models.AIReport.generated_at.desc()).all()

    ai_reports = [{
        "id": r.id, "strengths": r.strengths, "weaknesses": r.weaknesses,
        "recommendations": r.recommendations,
        "generated_at": r.generated_at.strftime("%b %d, %Y") if r.generated_at else "",
    } for r in reports]

    return {
        "conversation_trend": conversation_trend,
        "daily_history": daily_history,
        "session_timeline": session_timeline,
        "ai_reports": ai_reports,
        "total_sessions": len(sessions),
        "total_conversations": len(convs),
        "report_visibility": conn.report_visibility,
    }


@router.get("/access-log/{student_id}")
def get_guardian_access_log(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_parent),
) -> Any:
    """
    Returns the access audit trail for a specific guardian-student pair.
    Only the guardian who owns the connection can see their own log.
    """

    conn = db.query(models.GuardianUserAccess).filter(
        models.GuardianUserAccess.guardian_id == current_user.id,
        models.GuardianUserAccess.student_id == student_id,
        models.GuardianUserAccess.is_active == 1
    ).first()

    if not conn:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No active connection for this student.")

    # Access log = notifications sent to the guardian about this student
    logs = db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
    ).order_by(models.Notification.created_at.desc()).limit(50).all()

    return [{
        "id": n.id,
        "message": n.message,
        "type": n.type,
        "is_read": n.is_read,
        "created_at": n.created_at,
    } for n in logs]
