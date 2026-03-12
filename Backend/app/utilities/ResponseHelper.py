from typing import Any


def buildResponse(boolSuccess: bool, strMessage: str, objData: Any) -> dict[str, Any]:
    # Every route formats its final payload through this helper to keep the response contract consistent.
    return {"success": boolSuccess, "message": strMessage, "data": objData}
