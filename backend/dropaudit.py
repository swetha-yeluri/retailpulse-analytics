from src.config.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text("DROP TABLE IF EXISTS audit_logs CASCADE"))
    conn.commit()
    print("audit_logs dropped!")