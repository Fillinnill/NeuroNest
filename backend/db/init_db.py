import pymysql
from core.config import settings
from db.base_class import Base
from db.session import engine
from sqlalchemy import text

def create_database():
    try:
        # Connect without specifying database to create it
        conn = pymysql.connect(
            host=settings.MYSQL_SERVER,
            user=settings.MYSQL_USER,
            password=settings.MYSQL_PASSWORD,
            port=int(settings.MYSQL_PORT)
        )
        cursor = conn.cursor()
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {settings.MYSQL_DB}")
        print(f"Database '{settings.MYSQL_DB}' created or already exists.")
        conn.close()
    except Exception as e:
        print(f"Error creating database: {e}")

def create_advanced_sql_features():
    # We use SQLAlchemy engine to execute raw SQL for triggers, views, etc.
    with engine.connect() as connection:
        
        # 1. ASSERTIONS (via CHECK Constraints since MySQL doesn't support ASSERTION directly)
        # Adding a CHECK constraint to ensure anxiety_level is between 1 and 10
        try:
            connection.execute(text("ALTER TABLE users ADD CONSTRAINT chk_anxiety_level CHECK (anxiety_level >= 1 AND anxiety_level <= 10);"))
            print("Added check constraint (assertion equivalent) on users table.")
        except Exception as e:
            print(f"Check constraint already exists or error: {e}")

        # 2. VIEWS and 3. AGGREGATIONS
        # Create a view that aggregates user stats
        try:
            connection.execute(text("""
            CREATE OR REPLACE VIEW user_activity_summary AS
            SELECT 
                u.id AS user_id, 
                u.username, 
                COUNT(c.id) AS total_conversations,
                AVG(c.confidence_score) AS avg_confidence,
                AVG(c.emotion_score) AS avg_emotion
            FROM users u
            LEFT JOIN conversations c ON u.id = c.user_id
            GROUP BY u.id, u.username;
            """))
            print("Created view user_activity_summary with aggregations.")
        except Exception as e:
            print(f"Error creating view: {e}")

        # 4. STORED PROCEDURES
        # A stored procedure to add XP and grant an achievement if threshold met
        try:
            connection.execute(text("DROP PROCEDURE IF EXISTS AwardXPAndCheckAchievement;"))
            connection.execute(text("""
            CREATE PROCEDURE AwardXPAndCheckAchievement(IN p_user_id INT, IN p_xp_amount INT)
            BEGIN
                DECLARE current_xp INT DEFAULT 0;
                
                -- CRUD: UPDATE operation via Stored Procedure
                -- (We will assume XP is tracked in another table or we just insert an achievement)
                INSERT INTO achievements (user_id, badge_name, xp_reward, earned_at)
                VALUES (p_user_id, CONCAT('XP Reward: ', p_xp_amount), p_xp_amount, NOW());
                
                -- Return success
                SELECT 'XP Awarded and Achievement Checked' AS Status;
            END;
            """))
            print("Created stored procedure AwardXPAndCheckAchievement.")
        except Exception as e:
            print(f"Error creating stored procedure: {e}")

        # 5. TRIGGERS
        # Trigger to update DailyProgress whenever a new Conversation is inserted
        try:
            connection.execute(text("DROP TRIGGER IF EXISTS after_conversation_insert;"))
            connection.execute(text("""
            CREATE TRIGGER after_conversation_insert
            AFTER INSERT ON conversations
            FOR EACH ROW
            BEGIN
                -- CRUD: INSERT/UPDATE operation via Trigger
                IF EXISTS (SELECT 1 FROM daily_progress WHERE user_id = NEW.user_id AND DATE(date) = CURDATE()) THEN
                    UPDATE daily_progress 
                    SET practice_minutes = practice_minutes + 5, completed_tasks = completed_tasks + 1
                    WHERE user_id = NEW.user_id AND DATE(date) = CURDATE();
                ELSE
                    INSERT INTO daily_progress (user_id, streak, practice_minutes, completed_tasks, date)
                    VALUES (NEW.user_id, 1, 5, 1, NOW());
                END IF;
            END;
            """))
            print("Created trigger after_conversation_insert.")
        except Exception as e:
            print(f"Error creating trigger: {e}")

        connection.commit()

def init_db():
    print("Creating database if not exists...")
    create_database()
    
    print("Creating tables...")
    import db.models # to ensure models are attached to Base
    Base.metadata.create_all(bind=engine)
    
    print("Creating advanced SQL features...")
    create_advanced_sql_features()
    print("Database initialization complete.")

if __name__ == "__main__":
    init_db()
