from app.cache.RedisClient import clsRedisClient
from app.exceptions.CustomExceptions import ResourceNotFoundException
from app.repositories.UserRepository import clsUserRepository
from app.schemas.UserSchema import ValidateUserRequestSchema
from app.security.EncryptionService import clsEncryptionService
from app.security.SessionService import clsSessionService


class clsUserService:
    def __init__(
        self,
        objRepository: clsUserRepository,
        objRedisClient: clsRedisClient,
        objSessionService: clsSessionService,
        objEncryptionService: clsEncryptionService,
    ) -> None:
        # The service coordinates cache access, credential validation, and session creation.
        self.objRepository = objRepository
        self.objRedisClient = objRedisClient
        self.objSessionService = objSessionService
        self.objEncryptionService = objEncryptionService

    async def validateUser(self, objValidateUser: ValidateUserRequestSchema) -> dict:
        # Login validation aligns the frontend contract with backend persistence and creates a session on success.
        objUser = self.objRepository.getUserByUserID(objValidateUser.UserID, objValidateUser.Password)
        if not objUser:
            raise ResourceNotFoundException("Invalid UserID or Password.")

        if objValidateUser.Password != objUser.PasswordHash:
            raise ResourceNotFoundException("Invalid UserID or Password.")

        dicSessionContext = await self.objSessionService.createSession(objUser.intID, objUser.UserID)
        return {
            "intUserID": objUser.intID,
            "strSessionToken": dicSessionContext["strSessionToken"],
            "success": True,
            "message": "Authentication successful",
        }
