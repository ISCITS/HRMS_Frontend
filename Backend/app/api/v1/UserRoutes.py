from fastapi import APIRouter, Depends, status

from app.core.DependencyContainer import getUserService
from app.schemas.UserSchema import   ValidateUserRequestSchema
from app.services.UserService import clsUserService
from app.utilities.ResponseHelper import buildResponse

objRouter = APIRouter(prefix="/users", tags=["Users"])



@objRouter.post("/validateUser")
def validateUser(
    objValidateUser: ValidateUserRequestSchema,
    objUserService: clsUserService = Depends(getUserService),
) -> dict:
    # Authentication requests send a pydantic-validated body to the service and return the auth result.
    dicValidationResult = objUserService.validateUser(objValidateUser)
    return buildResponse(
        dicValidationResult["success"],
        dicValidationResult["message"],
        {"intUserID": dicValidationResult["intUserID"]},
    )
