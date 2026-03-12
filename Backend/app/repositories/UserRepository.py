from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.UserModel import clsUserModel
from app.schemas.UserSchema import UserCreateSchema


class clsUserRepository:
    def __init__(self, objSession: Session) -> None:
        # The repository receives a session and stays responsible only for persistence operations.
        self.objSession = objSession


    def validateUser(self, strUserID: str, strPassword: str) -> clsUserModel | None:
        # Authentication flow queries the users table by login id and stored password hash.
        objStatement = select(clsUserModel).where(
            clsUserModel.UserID == strUserID,
            clsUserModel.PasswordHash == strPassword,
        )
        return self.objSession.scalar(objStatement)

