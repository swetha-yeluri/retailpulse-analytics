
from urllib.parse import quote_plus

DB_USER = "postgres"
DB_PASSWORD = "Sujatha@21"       
DB_HOST = "localhost"
DB_PORT = 8008
DB_NAME = "retailpulse"


class Settings:
    DATABASE_URL = (
        f"postgresql://{DB_USER}:{quote_plus(DB_PASSWORD)}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    )
    JWT_SECRET = "retailpulse-secret-key-change-in-production"
    JWT_ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 30
    REFRESH_TOKEN_EXPIRE_DAYS = 7


settings = Settings()