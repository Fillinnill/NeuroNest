from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from db.session import get_db
from db import models
from dependencies import require_parent

router = APIRouter()

class StudentSummary(BaseModel):
    student_id: int
    name: str
    confidence_score: float
    emotion_score: float
    practice_hours: float
    streak: int
    completed_sessions: int

class ParentDashboardResponse(BaseModel):
    total_students: int
    students: List[StudentSummary]
    safe_sessions_percentage: float

@router.get("/dashboard", response_model=ParentDashboardResponse)
def get_parent_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_parent)
) -> Any:
    """
    Retrieve real aggregated progress and metrics for students associated with a parent/guardian.
    """
    # Fetch student IDs that this guardian has active approved access to
    access_records = db.query(models.GuardianUserAccess).filter(
        models.GuardianUserAccess.guardian_id == current_user.id,
        models.GuardianUserAccess.is_active == 1
    ).all()
    
    student_ids = [r.student_id for r in access_records]
    
    # Query only linked students
    students = db.query(models.User).filter(
        models.User.id.in_(student_ids),
        models.User.role == "child"
    ).all() if student_ids else []

        
    student_summaries = []
    
    for student in students:
        # 1. Calculate average scores from real Conversation records
        conversations = db.query(models.Conversation).filter(models.Conversation.user_id == student.id).all()
        if conversations:
            avg_conf = sum(c.confidence_score for c in conversations if c.confidence_score is not None) / len(conversations)
            avg_emot = sum(c.emotion_score for c in conversations if c.emotion_score is not None) / len(conversations)
        else:
            avg_conf = 75.0  # Safe healthy defaults if starting fresh
            avg_emot = 80.0
            
        # 2. Calculate practice hours from Sessions
        sessions = db.query(models.Session).filter(models.Session.user_id == student.id).all()
        total_mins = sum(s.duration_minutes for s in sessions if s.duration_minutes is not None)
        practice_hours = float(round(total_mins / 60.0, 1))
        
        # 3. Calculate streak from DailyProgress
        progress_records = db.query(models.DailyProgress).filter(models.DailyProgress.user_id == student.id).all()
        streak = max([p.streak for p in progress_records]) if progress_records else 0
        
        student_summaries.append(
            StudentSummary(
                student_id=student.id,
                name=student.fullname or student.username,
                confidence_score=round(float(avg_conf), 1),
                emotion_score=round(float(avg_emot), 1),
                practice_hours=practice_hours,
                streak=streak,
                completed_sessions=len(sessions)
            )
        )
        
    # Safe sessions represents percentage of sessions without severe emotional drop / anxiety spike (e.g. emotion_score < 40)
    total_convs = db.query(models.Conversation).count()
    low_emotions = db.query(models.Conversation).filter(models.Conversation.emotion_score < 40.0).count()
    
    safe_percentage = 100.0
    if total_convs > 0:
        safe_percentage = round(float((total_convs - low_emotions) / total_convs * 100.0), 1)
        
    return ParentDashboardResponse(
        total_students=len(student_summaries),
        students=student_summaries,
        safe_sessions_percentage=safe_percentage
    )
