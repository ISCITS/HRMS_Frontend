from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.cache.RedisClient import clsRedisClient
from app.core.DependencyContainer import getUserRepository, getUserService
from app.database.BaseModel import clsBaseModel
from app.main import app
from app.repositories.UserRepository import clsUserRepository
from app.services.UserService import clsUserService

objEngine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
clsTestingSessionLocal = sessionmaker(bind=objEngine, autoflush=False, autocommit=False)


class clsFakeRedisClient(clsRedisClient):
    def __init__(self) -> None:
        # Tests replace Redis with a no-op implementation so API behavior can be isolated from infrastructure.
        self.objClient = None

    def get(self, strKey: str):
        return None

    def set(self, strKey: str, objValue, intExpireSeconds: int = 300) -> None:
        return None


def overrideUserRepository() -> Generator[clsUserRepository, None, None]:
    # Test dependency overrides route repository access into an in-memory SQLite session.
    objSession: Session = clsTestingSessionLocal()
    try:
        yield clsUserRepository(objSession)
    finally:
        objSession.close()


def overrideUserService() -> Generator[clsUserService, None, None]:
    # Tests wire the service layer with fake infrastructure while preserving the production call flow.
    objSession: Session = clsTestingSessionLocal()
    try:
        yield clsUserService(clsUserRepository(objSession), clsFakeRedisClient())
    finally:
        objSession.close()


@pytest.fixture(autouse=True)
def setupDatabase() -> Generator[None, None, None]:
    # Tables are created before each test and dropped after it so cases remain isolated.
    clsBaseModel.metadata.create_all(bind=objEngine)
    yield
    clsBaseModel.metadata.drop_all(bind=objEngine)


@pytest.fixture()
def objClient() -> Generator[TestClient, None, None]:
    # The test client exercises the same HTTP entry points used by real frontend applications.
    app.dependency_overrides[getUserRepository] = overrideUserRepository
    app.dependency_overrides[getUserService] = overrideUserService
    with TestClient(app) as objTestClient:
        yield objTestClient
    app.dependency_overrides.clear()
