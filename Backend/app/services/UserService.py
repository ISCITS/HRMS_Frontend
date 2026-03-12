from app.cache.RedisClient import clsRedisClient
from app.exceptions.CustomExceptions import ConflictException, ResourceNotFoundException
from app.repositories.UserRepository import clsUserRepository
from app.schemas.UserSchema import UserCreateSchema, ValidateUserRequestSchema


class clsUserService:
    def __init__(self, objRepository: clsUserRepository, objRedisClient: clsRedisClient) -> None:
        # The service coordinates cache lookups, business checks, and repository access.
        self.objRepository = objRepository
        self.objRedisClient = objRedisClient


    def validateUser(self, objValidateUser: ValidateUserRequestSchema) -> dict:
        # Login validation flows from the router into the repository and returns a compact auth response.
        objUser = self.objRepository.validateUser(objValidateUser.UserID, objValidateUser.Password)
        if not objUser:
            raise ResourceNotFoundException("Invalid UserID or Password.")
        return {
            "intUserID": objUser.intID,
            "success": True,
            "message": "Authentication successful",
        }
