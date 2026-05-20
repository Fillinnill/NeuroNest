import pymysql
from core.config import settings

def migrate():
    try:
        conn = pymysql.connect(
            host=settings.MYSQL_SERVER,
            user=settings.MYSQL_USER,
            password=settings.MYSQL_PASSWORD,
            port=int(settings.MYSQL_PORT),
            database=settings.MYSQL_DB
        )
        cursor = conn.cursor()
        
        # Check if linked_child_id column already exists
        cursor.execute("SHOW COLUMNS FROM users LIKE 'linked_child_id'")
        result = cursor.fetchone()
        
        if not result:
            print("Column 'linked_child_id' does not exist. Adding column...")
            cursor.execute("ALTER TABLE users ADD COLUMN linked_child_id INT NULL, ADD CONSTRAINT fk_users_linked_child FOREIGN KEY (linked_child_id) REFERENCES users(id)")
            conn.commit()
            print("Column 'linked_child_id' and foreign key constraint successfully added!")
        else:
            print("Column 'linked_child_id' already exists. Skipping migration.")
            
        conn.close()
    except Exception as e:
        print(f"Error during migration: {e}")

if __name__ == "__main__":
    migrate()
