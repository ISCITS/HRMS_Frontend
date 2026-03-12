import logging
from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.Config import getSettings

objSettings = getSettings()
objLogger = logging.getLogger(__name__)

# Database configuration flows from settings into the SQLAlchemy engine.
# Repositories consume request-scoped sessions produced by this module.
objEngine = create_engine(
    objSettings.strDatabaseUrl,
    pool_pre_ping=True,
    pool_size=objSettings.DATABASE_POOL_SIZE,
    max_overflow=objSettings.DATABASE_MAX_OVERFLOW,
    pool_recycle=objSettings.DATABASE_POOL_RECYCLE,
)
clsSessionLocal = sessionmaker(bind=objEngine, autoflush=False, autocommit=False, expire_on_commit=False)


def getDbSession() -> Generator[Session, None, None]:
    # A fresh session is created for each dependency chain and closed after the request completes.
    objSession = clsSessionLocal()
    try:
        yield objSession
    finally:
        objSession.close()


def verifyDatabaseConnection() -> None:
    # Application startup calls this to check infrastructure readiness without touching business logic.
    with objEngine.connect() as objConnection:
        objConnection.execute(text("SELECT 1"))
    objLogger.info("Database connectivity verified.")


def isDatabaseConnected() -> bool:
    # Health checks call this to verify the database is reachable at request time.
    try:
        with objEngine.connect() as objConnection:
            objConnection.execute(text("SELECT 1"))
        return True
    except Exception:
        objLogger.warning("Database health check failed.")
        return False
