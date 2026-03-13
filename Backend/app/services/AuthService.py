from typing import Any

from app.core.Security import clsTokenValidator


class clsAuthService:
    def __init__(self, objTokenValidator: clsTokenValidator) -> None:
        # Middleware delegates token validation here to keep security rules out of HTTP plumbing.
        self.objTokenValidator = objTokenValidator

    def validateToken(self, strToken: str) -> dict[str, Any]:
        # Raw bearer tokens enter here and validated claims flow back to middleware.
        return self.objTokenValidator.validateToken(strToken)
