"""add cancelled_by_requester to match status

Revision ID: 20260411_01
Revises:
Create Date: 2026-04-11
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260411_01"
down_revision = None
branch_labels = None
depends_on = None


def _migrate_sqlite_upgrade():
    conn = op.get_bind()
    conn.execute(sa.text("PRAGMA foreign_keys=OFF"))

    conn.execute(
        sa.text(
            """
            CREATE TABLE IF NOT EXISTS matches_new (
                id INTEGER NOT NULL,
                request_id INTEGER,
                vendor_id INTEGER,
                score FLOAT,
                distance_score FLOAT,
                stock_score FLOAT,
                rating_score FLOAT,
                speed_score FLOAT,
                urgency_score FLOAT,
                status VARCHAR(22),
                created_at DATETIME,
                PRIMARY KEY (id),
                FOREIGN KEY(request_id) REFERENCES requests (id),
                FOREIGN KEY(vendor_id) REFERENCES vendors (id),
                CHECK (status IN (
                    'pending',
                    'accepted_by_vendor',
                    'rejected_by_vendor',
                    'accepted_by_requester',
                    'cancelled_by_requester',
                    'completed'
                ))
            )
            """
        )
    )

    conn.execute(
        sa.text(
            """
            INSERT INTO matches_new (
                id,
                request_id,
                vendor_id,
                score,
                distance_score,
                stock_score,
                rating_score,
                speed_score,
                urgency_score,
                status,
                created_at
            )
            SELECT
                id,
                request_id,
                vendor_id,
                score,
                distance_score,
                stock_score,
                rating_score,
                speed_score,
                urgency_score,
                status,
                created_at
            FROM matches
            """
        )
    )

    conn.execute(sa.text("DROP TABLE matches"))
    conn.execute(sa.text("ALTER TABLE matches_new RENAME TO matches"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_matches_id ON matches (id)"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_matches_request_id ON matches (request_id)"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_matches_vendor_id ON matches (vendor_id)"))
    conn.execute(sa.text("PRAGMA foreign_keys=ON"))


def _migrate_sqlite_downgrade():
    conn = op.get_bind()
    conn.execute(sa.text("PRAGMA foreign_keys=OFF"))

    conn.execute(
        sa.text(
            """
            CREATE TABLE IF NOT EXISTS matches_old (
                id INTEGER NOT NULL,
                request_id INTEGER,
                vendor_id INTEGER,
                score FLOAT,
                distance_score FLOAT,
                stock_score FLOAT,
                rating_score FLOAT,
                speed_score FLOAT,
                urgency_score FLOAT,
                status VARCHAR(22),
                created_at DATETIME,
                PRIMARY KEY (id),
                FOREIGN KEY(request_id) REFERENCES requests (id),
                FOREIGN KEY(vendor_id) REFERENCES vendors (id),
                CHECK (status IN (
                    'pending',
                    'accepted_by_vendor',
                    'rejected_by_vendor',
                    'accepted_by_requester',
                    'completed'
                ))
            )
            """
        )
    )

    conn.execute(
        sa.text(
            """
            INSERT INTO matches_old (
                id,
                request_id,
                vendor_id,
                score,
                distance_score,
                stock_score,
                rating_score,
                speed_score,
                urgency_score,
                status,
                created_at
            )
            SELECT
                id,
                request_id,
                vendor_id,
                score,
                distance_score,
                stock_score,
                rating_score,
                speed_score,
                urgency_score,
                CASE
                    WHEN status = 'cancelled_by_requester' THEN 'rejected_by_vendor'
                    ELSE status
                END,
                created_at
            FROM matches
            """
        )
    )

    conn.execute(sa.text("DROP TABLE matches"))
    conn.execute(sa.text("ALTER TABLE matches_old RENAME TO matches"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_matches_id ON matches (id)"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_matches_request_id ON matches (request_id)"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_matches_vendor_id ON matches (vendor_id)"))
    conn.execute(sa.text("PRAGMA foreign_keys=ON"))


def upgrade() -> None:
    conn = op.get_bind()
    dialect = conn.dialect.name

    if dialect == "sqlite":
        _migrate_sqlite_upgrade()
        return

    with op.batch_alter_table("matches") as batch_op:
        batch_op.alter_column(
            "status",
            existing_type=sa.Enum(
                "pending",
                "accepted_by_vendor",
                "rejected_by_vendor",
                "accepted_by_requester",
                "completed",
                name="matchstatus",
            ),
            type_=sa.Enum(
                "pending",
                "accepted_by_vendor",
                "rejected_by_vendor",
                "accepted_by_requester",
                "cancelled_by_requester",
                "completed",
                name="matchstatus",
            ),
            existing_nullable=True,
        )


def downgrade() -> None:
    conn = op.get_bind()
    dialect = conn.dialect.name

    if dialect == "sqlite":
        _migrate_sqlite_downgrade()
        return

    with op.batch_alter_table("matches") as batch_op:
        batch_op.alter_column(
            "status",
            existing_type=sa.Enum(
                "pending",
                "accepted_by_vendor",
                "rejected_by_vendor",
                "accepted_by_requester",
                "cancelled_by_requester",
                "completed",
                name="matchstatus",
            ),
            type_=sa.Enum(
                "pending",
                "accepted_by_vendor",
                "rejected_by_vendor",
                "accepted_by_requester",
                "completed",
                name="matchstatus",
            ),
            existing_nullable=True,
        )
