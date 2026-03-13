from app.cache.RedisClient import clsRedisClient
from app.exceptions.CustomExceptions import ResourceNotFoundException
from app.repositories.UserRepository import clsUserRepository
from app.schemas.UserSchema import ValidateUserRequestSchema
from app.security.SessionService import clsSessionService


class clsUserService:
    def __init__(
        self,
        objRepository: clsUserRepository,
        objRedisClient: clsRedisClient,
        objSessionService: clsSessionService,
    ) -> None:
        # The service coordinates cache access, credential validation, and session creation.
        self.objRepository = objRepository
        self.objRedisClient = objRedisClient
        self.objSessionService = objSessionService

    async def validateUser(self, objValidateUser: ValidateUserRequestSchema) -> dict:
        # Login validation flows from the router into the repository and creates a Redis session on success.
        objUser = self.objRepository.validateUser(objValidateUser.UserID, objValidateUser.Password)
        if not objUser:
            raise ResourceNotFoundException("Invalid UserID or Password.")
        dicSessionContext = await self.objSessionService.createSession(objUser.intID, objUser.UserID)
        return {
            "intUserID": objUser.intID,
            "strSessionToken": dicSessionContext["strSessionToken"],
            "success": True,
            "message": "Authentication successful",
        }
