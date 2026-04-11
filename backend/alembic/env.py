"""Alembic environment configuration.

This scripts runs all migration operations and is invoked via the alembic CLI.
"""

from logging.config import fileConfig
import os
import sys
from sqlalchemy import engine_from_config, pool
from alembic import context

# Add backend directory to path so we can import models
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + '/..')

from database import Base
from models import (
    User, Vendor, Request, Match, Inventory, 
    ResourceDeclaration, CampaignDonation, CampaignFund,
    VerificationAudit
)

# this is the Alembic Config object
config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set the target metadata for 'autogenerate' support
target_metadata = Base.metadata

# Get database URL from environment or config
def get_database_url():
    """Retrieve database URL from environment or use SQLite default."""
    db_url = os.environ.get('DATABASE_URL')
    if db_url:
        return db_url
    # Default to SQLite for development
    return 'sqlite:///./avre.db'

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.
    
    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well. By skipping the create
    Engine step we don't even need a DBAPI to be available.
    """
    configuration = config.get_section(config.config_ini_section)
    configuration['sqlalchemy.url'] = get_database_url()
    
    context.configure(
        url=configuration['sqlalchemy.url'],
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.
    """
    configuration = config.get_section(config.config_ini_section)
    configuration['sqlalchemy.url'] = get_database_url()
    
    connectable = engine_from_config(
        configuration,
        prefix='sqlalchemy.',
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
