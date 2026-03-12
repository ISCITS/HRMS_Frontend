import logging
from typing import Any

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.exceptions.CustomExceptions import AppException

objLogger = logging.getLogger(__name__)


def commitOrRollback(objSession: Session) -> None:
    # Database writes can use this helper so transaction success and rollback flow stay consistent.
    try:
        objSession.commit()
    except SQLAlchemyError as objException:
        objSession.rollback()
        objLogger.exception("Database transaction failed.")
        raise AppException("Database operation failed.", 500) from objException


def safeRefresh(objSession: Session, objEntity: Any) -> None:
    # Refresh pulls database-generated values back into the ORM entity after persistence.
    objSession.refresh(objEntity)
