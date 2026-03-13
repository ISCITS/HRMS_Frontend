import logging
from typing import Any

objLogger = logging.getLogger(__name__)


class clsEventPublisher:
    def publishEvent(self, strEventName: str, dicPayload: dict[str, Any]) -> None:
        # Domain events can flow out through this abstraction when integrations need to react to state changes.
        objLogger.info("Published event=%s payload=%s", strEventName, dicPayload)
