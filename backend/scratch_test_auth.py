from db.session import SessionLocal
from db import models
from core.security import verify_password
from sqlalchemy import func
import traceback

def test_verify():
    db = SessionLocal()
    try:
        # Retrieve parent
        parent = db.query(models.User).filter(models.User.email == "parent_test@example.com").first()
        student = db.query(models.User).filter(models.User.username == "student_test").first()
        
        print(f"Parent found: {parent.username if parent else 'None'}, Role: {parent.role if parent else 'None'}")
        print(f"Student found: {student.username if student else 'None'}, Role: {student.role if student else 'None'}")
        
        # Test guardian-verify logic manually to see what fails
        print("Testing guardian-verify logic...")
        
        # 1. func.lower check
        student_check = db.query(models.User).filter(
            func.lower(models.User.username) == "student_test",
            models.User.role == "child"
        ).first()
        print(f"student_check: {student_check.username if student_check else 'None'}")
        
        # 2. GuardianUserAccess query
        conn = db.query(models.GuardianUserAccess).filter(
            models.GuardianUserAccess.guardian_id == parent.id,
            models.GuardianUserAccess.student_id == student.id,
        ).first()
        print(f"Existing connection: {conn}")
        
        # 3. Create active approved connection
        if not conn:
            conn = models.GuardianUserAccess(
                guardian_id=parent.id,
                student_id=student.id,
                relationship_type="Guardian",
                is_active=1,
            )
            db.add(conn)
            db.commit()
            print("Successfully created connection record!")
            
    except Exception as e:
        print("CRITICAL ERROR ENCOUNTERED:")
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_verify()
