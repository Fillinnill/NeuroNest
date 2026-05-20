from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from db.base_class import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    fullname = Column(String(100))
    username = Column(String(50), unique=True, index=True)
    email = Column(String(100), unique=True, index=True)
    password_hash = Column(String(255))
    age = Column(Integer)
    anxiety_level = Column(Integer) # e.g., 1-10
    communication_goals = Column(Text)
    preferences = Column(JSON) # Store theme, accessibility settings
    role = Column(String(20), default="child") # parent, child
    linked_child_id = Column(Integer, ForeignKey('users.id'), nullable=True)  # for parent linking

    created_at = Column(DateTime, default=datetime.utcnow)

    conversations = relationship("Conversation", back_populates="user")
    achievements = relationship("Achievement", back_populates="user")
    daily_progress = relationship("DailyProgress", back_populates="user")
    ai_reports = relationship("AIReport", back_populates="user")
    sessions = relationship("Session", back_populates="user")
    guardian_profile = relationship("Guardian", back_populates="user", uselist=False)
    notifications = relationship("Notification", back_populates="user")


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    scenario = Column(String(100))
    conversation_type = Column(String(50)) # e.g., text, voice
    transcript = Column(JSON) # Store the list of messages
    ai_feedback = Column(Text)
    confidence_score = Column(Float)
    emotion_score = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="conversations")


class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    badge_name = Column(String(100))
    xp_reward = Column(Integer)
    earned_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="achievements")


class DailyProgress(Base):
    __tablename__ = "daily_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    streak = Column(Integer, default=0)
    practice_minutes = Column(Integer, default=0)
    completed_tasks = Column(Integer, default=0)
    date = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="daily_progress")


class AIReport(Base):
    __tablename__ = "ai_reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    strengths = Column(Text)
    weaknesses = Column(Text)
    recommendations = Column(Text)
    generated_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="ai_reports")


class ParentReport(Base):
    __tablename__ = "parent_reports"

    id = Column(Integer, primary_key=True, index=True)
    parent_id = Column(Integer, index=True) 
    student_id = Column(Integer, ForeignKey("users.id"))
    report_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String(100))
    description = Column(Text)
    duration_minutes = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="sessions")


class Guardian(Base):
    __tablename__ = "guardians"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    relationship_to_user = Column(String(50))
    phone_number = Column(String(20))

    user = relationship("User", back_populates="guardian_profile")


class GuardianUserAccess(Base):
    __tablename__ = "guardian_user_access"

    id = Column(Integer, primary_key=True, index=True)
    guardian_id = Column(Integer, ForeignKey("users.id"))
    student_id = Column(Integer, ForeignKey("users.id"))
    relationship_type = Column(String(50))
    granted_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Integer, default=1)
    last_accessed_at = Column(DateTime, nullable=True)  # Audit: when guardian last viewed data
    report_visibility = Column(Integer, default=1)  # 1=full, 0=limited (student can restrict)

    guardian = relationship("User", foreign_keys=[guardian_id])
    student = relationship("User", foreign_keys=[student_id])


class AccessRequest(Base):
    __tablename__ = "access_requests"

    id = Column(Integer, primary_key=True, index=True)
    guardian_id = Column(Integer, ForeignKey("users.id"))
    student_id = Column(Integer, ForeignKey("users.id"))
    relationship_type = Column(String(50))
    reason = Column(Text)
    status = Column(String(20), default="pending") # pending, accepted, rejected
    created_at = Column(DateTime, default=datetime.utcnow)

    guardian = relationship("User", foreign_keys=[guardian_id])
    student = relationship("User", foreign_keys=[student_id])


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    message = Column(Text)
    is_read = Column(Integer, default=0) # 0 = unread, 1 = read
    type = Column(String(50)) # access_request, access_alert, permission_change
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")
