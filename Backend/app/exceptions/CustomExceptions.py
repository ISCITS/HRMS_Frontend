class AppException(Exception):
    # Services raise typed exceptions so the API layer can return controlled error responses.
    def __init__(self, strMessage: str, intStatusCode: int = 400) -> None:
        super().__init__(strMessage)
        self.strMessage = strMessage
        self.intStatusCode = intStatusCode


class ResourceNotFoundException(AppException):
    def __init__(self, strMessage: str = "Resource not found.") -> None:
        super().__init__(strMessage=strMessage, intStatusCode=404)


class ConflictException(AppException):
    def __init__(self, strMessage: str = "Resource conflict.") -> None:
        super().__init__(strMessage=strMessage, intStatusCode=409)
