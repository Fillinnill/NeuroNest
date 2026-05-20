from typing import Any, List
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.session import get_db
from db import models
from dependencies import get_current_user, require_child
from pydantic import BaseModel

router = APIRouter()

def update_daily_progress(db: Session, user_id: int, duration_minutes: int):
    # Find daily progress for today
    today = date.today()
    today_start = datetime.combine(today, datetime.min.time())
    today_end = datetime.combine(today, datetime.max.time())
    
    dp_today = db.query(models.DailyProgress).filter(
        models.DailyProgress.user_id == user_id,
        models.DailyProgress.date >= today_start,
        models.DailyProgress.date <= today_end
    ).first()
    
    if dp_today:
        dp_today.practice_minutes += duration_minutes
        dp_today.completed_tasks += 1
        db.add(dp_today)
        db.commit()
    else:
        # Find progress from yesterday to calculate streak
        yesterday = today - timedelta(days=1)
        yesterday_start = datetime.combine(yesterday, datetime.min.time())
        yesterday_end = datetime.combine(yesterday, datetime.max.time())
        
        dp_yesterday = db.query(models.DailyProgress).filter(
            models.DailyProgress.user_id == user_id,
            models.DailyProgress.date >= yesterday_start,
            models.DailyProgress.date <= yesterday_end
        ).first()
        
        streak = 1
        if dp_yesterday:
            streak = dp_yesterday.streak + 1
        else:
            # Let's see if there was any prior streak
            last_dp = db.query(models.DailyProgress).filter(
                models.DailyProgress.user_id == user_id
            ).order_by(models.DailyProgress.date.desc()).first()
            if last_dp:
                # If they missed days, streak resets to 1
                pass
                
        dp_new = models.DailyProgress(
            user_id=user_id,
            streak=streak,
            practice_minutes=duration_minutes,
            completed_tasks=1,
            date=datetime.utcnow()
        )
        db.add(dp_new)
        db.commit()

class SessionCreate(BaseModel):
    title: str
    description: str
    duration_minutes: int

class SessionOut(SessionCreate):
    id: int
    user_id: int
    
    class Config:
        from_attributes = True

@router.post("/", response_model=SessionOut)
def create_session(
    *,
    db: Session = Depends(get_db),
    session_in: SessionCreate,
    current_user: models.User = Depends(require_child)
) -> Any:
    """
    Create a new practice session and update progress / streaks.
    """
    db_obj = models.Session(
        user_id=current_user.id,
        title=session_in.title,
        description=session_in.description,
        duration_minutes=session_in.duration_minutes
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    
    # Track daily streaks and practice duration
    try:
        update_daily_progress(db, current_user.id, session_in.duration_minutes)
    except Exception as e:
        print(f"Error logging daily progress: {e}")
        
    return db_obj

@router.get("/", response_model=List[SessionOut])
def read_sessions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_child),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve sessions for the current user.
    """
    sessions = db.query(models.Session).filter(models.Session.user_id == current_user.id).offset(skip).limit(limit).all()
    return sessions
