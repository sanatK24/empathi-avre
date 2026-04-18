"""Add campaigns and donations tables for campaign discovery feature

Revision ID: 20260418_01
Revises: 20260411_02
Create Date: 2026-04-18 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision = '20260418_01'
down_revision = '20260411_02'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create campaigns table
    op.create_table(
        'campaigns',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('category', sa.String(), nullable=False),
        sa.Column('city', sa.String(), nullable=False),
        sa.Column('goal_amount', sa.Float(), nullable=False),
        sa.Column('raised_amount', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('urgency_level', sa.String(), server_default='medium', nullable=False),
        sa.Column('cover_image', sa.String(), nullable=True),
        sa.Column('status', sa.String(), server_default='draft', nullable=False),
        sa.Column('verified', sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column('deadline', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], name='fk_campaigns_created_by')
    )
    op.create_index(op.f('ix_campaigns_created_by'), 'campaigns', ['created_by'], unique=False)
    op.create_index(op.f('ix_campaigns_title'), 'campaigns', ['title'], unique=False)
    op.create_index(op.f('ix_campaigns_category'), 'campaigns', ['category'], unique=False)
    op.create_index(op.f('ix_campaigns_city'), 'campaigns', ['city'], unique=False)

    # Create donations table
    op.create_table(
        'donations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('campaign_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('anonymous', sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('status', sa.String(), server_default='completed', nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id'], name='fk_donations_campaign_id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='fk_donations_user_id')
    )
    op.create_index(op.f('ix_donations_campaign_id'), 'donations', ['campaign_id'], unique=False)
    op.create_index(op.f('ix_donations_user_id'), 'donations', ['user_id'], unique=False)

    # Create campaign_updates table
    op.create_table(
        'campaign_updates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('campaign_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['campaign_id'], ['campaigns.id'], name='fk_campaign_updates_campaign_id')
    )
    op.create_index(op.f('ix_campaign_updates_campaign_id'), 'campaign_updates', ['campaign_id'], unique=False)


def downgrade() -> None:
    # Drop campaign_updates table
    op.drop_index(op.f('ix_campaign_updates_campaign_id'), table_name='campaign_updates')
    op.drop_table('campaign_updates')

    # Drop donations table
    op.drop_index(op.f('ix_donations_user_id'), table_name='donations')
    op.drop_index(op.f('ix_donations_campaign_id'), table_name='donations')
    op.drop_table('donations')

    # Drop campaigns table
    op.drop_index(op.f('ix_campaigns_city'), table_name='campaigns')
    op.drop_index(op.f('ix_campaigns_category'), table_name='campaigns')
    op.drop_index(op.f('ix_campaigns_title'), table_name='campaigns')
    op.drop_index(op.f('ix_campaigns_created_by'), table_name='campaigns')
    op.drop_table('campaigns')
