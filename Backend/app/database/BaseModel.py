from datetime import datetime

from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


objMetadata = MetaData(
    naming_convention={
        "ix": "ix_%(column_0_label)s",
        "uq": "uq_%(table_name)s_%(column_0_name)s",
        "ck": "ck_%(table_name)s_%(constraint_name)s",
        "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
        "pk": "pk_%(table_name)s",
    }
)


class clsBaseModel(DeclarativeBase):
    # All ORM entities inherit from this base so Alembic sees one metadata graph.
    metadata = objMetadata


class clsTimestampMixin:
    # Shared timestamps keep persistence flow consistent across entities.
    dtCreatedAt: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    dtUpdatedAt: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)
