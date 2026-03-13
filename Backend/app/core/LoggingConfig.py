from logging.config import dictConfig

from app.core.Config import clsSettings


def configureLogging(objSettings: clsSettings) -> None:
    # Logging is initialized once during startup so every layer emits a consistent format.
    dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "structured": {
                    "format": "%(asctime)s | %(levelname)s | %(name)s | %(message)s",
                }
            },
            "handlers": {
                "default": {
                    "class": "logging.StreamHandler",
                    "formatter": "structured",
                    "level": objSettings.LOG_LEVEL,
                }
            },
            "root": {"handlers": ["default"], "level": objSettings.LOG_LEVEL},
        }
    )
