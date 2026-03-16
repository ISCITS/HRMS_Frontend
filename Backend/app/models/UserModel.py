from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.BaseModel import clsBaseModel


class clsUserModel(clsBaseModel):
    # This ORM model maps directly to the `users` login table used during authentication.
    __tablename__ = "users"

    # Maps to users.id and is returned after successful validation.
    intID: Mapped[int] = mapped_column("id", Integer, primary_key=True, autoincrement=True)
    # Maps to users.user_id and is used as the login identity.
    UserID: Mapped[str] = mapped_column("user_id", String(255), nullable=False, unique=True, index=True)
    # Maps to users.password_hash and is compared as the incoming payload value.
    PasswordHash: Mapped[str] = mapped_column("password_hash", String(255), nullable=False)
    # Maps to users.is_active and gates whether a login user can authenticate.
    IsActive: Mapped[bool] = mapped_column("is_active", Boolean, nullable=False, default=True)
