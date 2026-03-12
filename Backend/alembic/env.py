from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.core.Config import getSettings
from app.database.BaseModel import clsBaseModel
from app.models.UserModel import clsUserModel  # noqa: F401

config = context.config
objSettings = getSettings()
# Migration configuration reads the same database settings as the runtime application.
config.set_main_option("sqlalchemy.url", objSettings.strDatabaseUrl)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = clsBaseModel.metadata


def runMigrationsOffline() -> None:
    # Offline mode emits SQL using the shared ORM metadata without opening a live connection.
    context.configure(
        url=objSettings.strDatabaseUrl,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def runMigrationsOnline() -> None:
    # Online mode connects to the target database and applies schema changes from ORM metadata.
    objConnectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with objConnectable.connect() as objConnection:
        context.configure(connection=objConnection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    runMigrationsOffline()
else:
    runMigrationsOnline()
