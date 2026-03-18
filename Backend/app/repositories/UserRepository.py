from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.UserModel import clsUserModel
class clsUserRepository:
    def __init__(self, objSession: Session) -> None:
        # The repository receives a session and stays responsible only for persistence operations.
        self.objSession = objSession


    def getUserByUserID(self, strUserID: str, strPassword: str) -> clsUserModel | None:
        # Authentication first loads the user row by login id before password verification happens in the service.
        objStatement = select(clsUserModel).where(
            clsUserModel.UserID == strUserID,
            clsUserModel.PasswordHash == strPassword,
            clsUserModel.IsActive.is_(True),
        )
        return self.objSession.scalar(objStatement)
