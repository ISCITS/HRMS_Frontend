from pydantic import BaseModel, ConfigDict, Field


class UserCreateSchema(BaseModel):
    # Create flows can still insert login users through the same users table shape.
    UserID: str = Field(min_length=1, max_length=255)
    PasswordHash: str = Field(min_length=1, max_length=255)


class ValidateUserRequestSchema(BaseModel):
    # The validateUser API accepts a login identifier and password hash payload.
    UserID: str = Field(min_length=1, max_length=255)
    Password: str = Field(min_length=1, max_length=255)


class UserResponseSchema(BaseModel):
    # ORM user records are serialized through this schema before leaving the API boundary.
    model_config = ConfigDict(from_attributes=True)

    intID: int
    UserID: str


class ValidateUserResponseSchema(BaseModel):
    # Successful authentication responses return the internal numeric user key.
    intUserID: int
