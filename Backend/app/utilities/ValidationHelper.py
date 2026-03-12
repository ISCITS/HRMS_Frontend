import re


def isValidPassword(strPassword: str) -> bool:
    # Shared validation helpers live here so rules can be reused across services and routes.
    return bool(re.match(r"^(?=.*[A-Za-z])(?=.*\d).{8,}$", strPassword))
