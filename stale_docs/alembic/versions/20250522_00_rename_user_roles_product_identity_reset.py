"""Rename user roles: REQUESTER→DONOR, VENDOR→CREATOR

Revision ID: 20250522_00
Revises: 20260418_01
Create Date: 2025-05-22 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '20250522_00'
down_revision = '20260418_01'
branch_labels = None
depends_on = None


def upgrade():
    """Rename user roles for product identity alignment."""

    # Update existing role values in database
    op.execute(text("UPDATE users SET role = 'DONOR' WHERE role = 'REQUESTER'"))
    op.execute(text("UPDATE users SET role = 'CREATOR' WHERE role = 'VENDOR'"))
    op.execute(text("DELETE FROM users WHERE role = 'VOLUNTEER_NGO'"))

    print("✓ User roles renamed: REQUESTER→DONOR, VENDOR→CREATOR")
    print("✓ Removed unused VOLUNTEER_NGO role and associated users")


def downgrade():
    """Rollback user role changes."""

    op.execute(text("UPDATE users SET role = 'REQUESTER' WHERE role = 'DONOR'"))
    op.execute(text("UPDATE users SET role = 'VENDOR' WHERE role = 'CREATOR'"))

    print("✓ User roles rolled back")
