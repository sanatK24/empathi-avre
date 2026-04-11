"""Add admin moderation features: vendor verification, request flagging, scoring config (FR-401-406)

Revision ID: 20260411_02
Revises: 20260411_01
Create Date: 2026-04-11 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite, postgresql

# revision identifiers, used by Alembic.
revision = '20260411_02'
down_revision = '20260411_01'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create VendorStatus enum (using string storage)
    # Add fields to vendors table
    with op.batch_alter_table('vendors', schema=None) as batch_op:
        batch_op.add_column(sa.Column('status', sa.String(), nullable=True, server_default='pending'))
        batch_op.add_column(sa.Column('verification_reason', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('flagged', sa.Boolean(), server_default=sa.false(), nullable=False))
        batch_op.add_column(sa.Column('flag_reason', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('deactivation_reason', sa.String(), nullable=True))
        batch_op.add_column(sa.Column('deactivated_by', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('deactivated_at', sa.DateTime(), nullable=True))
        batch_op.create_foreign_key('fk_vendors_deactivated_by', 'users', ['deactivated_by'], ['id'])

    # Add fields to requests table
    with op.batch_alter_table('requests', schema=None) as batch_op:
        batch_op.add_column(sa.Column('flagged', sa.Boolean(), server_default=sa.false(), nullable=False))
        batch_op.add_column(sa.Column('flag_reason', sa.String(), nullable=True))

    # Create scoring_config table
    op.create_table(
        'scoring_config',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('distance_weight', sa.Float(), server_default='0.35', nullable=False),
        sa.Column('stock_weight', sa.Float(), server_default='0.20', nullable=False),
        sa.Column('rating_weight', sa.Float(), server_default='0.15', nullable=False),
        sa.Column('speed_weight', sa.Float(), server_default='0.15', nullable=False),
        sa.Column('urgency_weight', sa.Float(), server_default='0.15', nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['updated_by'], ['users.id'], name='fk_scoring_config_updated_by')
    )
    op.create_index(op.f('ix_scoring_config_id'), 'scoring_config', ['id'], unique=False)


def downgrade() -> None:
    # Drop scoring_config table
    op.drop_table('scoring_config')

    # Remove fields from requests table
    with op.batch_alter_table('requests', schema=None) as batch_op:
        batch_op.drop_column('flag_reason')
        batch_op.drop_column('flagged')

    # Remove fields from vendors table
    with op.batch_alter_table('vendors', schema=None) as batch_op:
        batch_op.drop_constraint('fk_vendors_deactivated_by', type_='foreignkey')
        batch_op.drop_column('deactivated_at')
        batch_op.drop_column('deactivated_by')
        batch_op.drop_column('flag_reason')
        batch_op.drop_column('flagged')
        batch_op.drop_column('verification_reason')
        batch_op.drop_column('status')
