"""Initial schema — all core UniSOLV tables.

Creates:
  - PostgreSQL ENUM types via raw op.execute (no SQLAlchemy type-event conflicts)
  - institutions, users, issue_clusters, tickets, ticket_events,
    attributions, ratings
  - B-tree indexes on FK / filter columns
  - GIST spatial indexes on tickets.location and issue_clusters.centroid

Revision ID: 0001
Revises: None
Create Date: 2026-09-16
"""
from typing import Sequence, Union

import geoalchemy2
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# ---------------------------------------------------------------------------
# Revision identifiers
# ---------------------------------------------------------------------------
revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# ---------------------------------------------------------------------------
# upgrade
# ---------------------------------------------------------------------------
def upgrade() -> None:
    # ── 1. PostgreSQL ENUM types via raw SQL (avoids SQLAlchemy event conflicts)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE user_role AS ENUM (
                'citizen','university_admin','student','company','government_officer'
            );
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE institution_type AS ENUM ('university','company');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE ticket_status AS ENUM (
                'pending_validation','routed','accepted','in_progress',
                'piloting','verified','closed','escalated'
            );
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE event_type AS ENUM (
                'routed','accepted','escalated','proposal_submitted',
                'piloted','verified','closed'
            );
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE ip_outcome AS ENUM ('patent','startup','publication','none');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)

    # ── 2. institutions ──────────────────────────────────────────────────────
    op.create_table(
        "institutions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("type", sa.Text(), nullable=False),        # cast via CHECK
        sa.Column("domains_of_expertise", postgresql.JSONB(), nullable=False,
                  server_default="[]"),
        sa.Column("reputation_score", sa.Float(), nullable=False, server_default="0.5"),
        sa.Column("reputation_by_domain", postgresql.JSONB(), nullable=False,
                  server_default="{}"),
        sa.Column("current_load", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
    )
    # Alter column to use the real ENUM type (avoids event-hook conflicts)
    op.execute("ALTER TABLE institutions ALTER COLUMN type TYPE institution_type "
               "USING type::institution_type")

    # ── 3. users ─────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.Text(), nullable=False),
        sa.Column("institution_id", sa.Integer(),
                  sa.ForeignKey("institutions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
    )
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE user_role "
               "USING role::user_role")
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_institution_id", "users", ["institution_id"])

    # ── 4. issue_clusters ────────────────────────────────────────────────────
    op.create_table(
        "issue_clusters",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "centroid",
            geoalchemy2.types.Geography(geometry_type="POINT", srid=4326),
            nullable=True,
        ),
        sa.Column("domain", sa.String(100), nullable=False),
        sa.Column("member_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_hotspot", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
    )
    op.create_index("ix_issue_clusters_domain", "issue_clusters", ["domain"])
    op.create_index(
        "ix_issue_clusters_centroid_gist",
        "issue_clusters",
        ["centroid"],
        postgresql_using="gist",
    )

    # ── 5. tickets ───────────────────────────────────────────────────────────
    op.create_table(
        "tickets",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("reporter_id", sa.Integer(),
                  sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("media_urls", postgresql.JSONB(), nullable=False, server_default="[]"),
        sa.Column(
            "location",
            geoalchemy2.types.Geography(geometry_type="POINT", srid=4326),
            nullable=True,
        ),
        sa.Column("domain", sa.String(100), nullable=True),
        sa.Column("severity_score", sa.Float(), nullable=True),
        sa.Column("classification_confidence", sa.Float(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False,
                  server_default="pending_validation"),
        sa.Column("cluster_id", sa.Integer(),
                  sa.ForeignKey("issue_clusters.id", ondelete="SET NULL"), nullable=True),
        sa.Column("assigned_institution_id", sa.Integer(),
                  sa.ForeignKey("institutions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("sla_deadline", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
    )
    op.execute("ALTER TABLE tickets ALTER COLUMN status DROP DEFAULT")
    op.execute("ALTER TABLE tickets ALTER COLUMN status TYPE ticket_status "
               "USING status::ticket_status")
    op.execute("ALTER TABLE tickets ALTER COLUMN status "
               "SET DEFAULT 'pending_validation'::ticket_status")
    op.create_index("ix_tickets_reporter_id", "tickets", ["reporter_id"])
    op.create_index("ix_tickets_status", "tickets", ["status"])
    op.create_index("ix_tickets_domain", "tickets", ["domain"])
    op.create_index("ix_tickets_cluster_id", "tickets", ["cluster_id"])
    op.create_index("ix_tickets_assigned_institution_id", "tickets",
                    ["assigned_institution_id"])
    op.create_index(
        "ix_tickets_location_gist",
        "tickets",
        ["location"],
        postgresql_using="gist",
    )

    # ── 6. ticket_events ─────────────────────────────────────────────────────
    op.create_table(
        "ticket_events",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("ticket_id", sa.Integer(),
                  sa.ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("event_type", sa.Text(), nullable=False),
        sa.Column("actor_id", sa.Integer(),
                  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
    )
    op.execute("ALTER TABLE ticket_events ALTER COLUMN event_type TYPE event_type "
               "USING event_type::event_type")
    op.create_index("ix_ticket_events_ticket_id", "ticket_events", ["ticket_id"])
    op.create_index("ix_ticket_events_actor_id", "ticket_events", ["actor_id"])
    op.create_index("ix_ticket_events_created_at", "ticket_events", ["created_at"])

    # ── 7. attributions ──────────────────────────────────────────────────────
    op.create_table(
        "attributions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("ticket_id", sa.Integer(),
                  sa.ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("reporter_id", sa.Integer(),
                  sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("institution_id", sa.Integer(),
                  sa.ForeignKey("institutions.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("industry_partner_id", sa.Integer(),
                  sa.ForeignKey("institutions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("ip_outcome", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
    )
    op.execute("ALTER TABLE attributions ALTER COLUMN ip_outcome TYPE ip_outcome "
               "USING ip_outcome::ip_outcome")
    op.create_index("ix_attributions_ticket_id", "attributions", ["ticket_id"])
    op.create_index("ix_attributions_reporter_id", "attributions", ["reporter_id"])
    op.create_index("ix_attributions_institution_id", "attributions", ["institution_id"])

    # ── 8. ratings ───────────────────────────────────────────────────────────
    op.create_table(
        "ratings",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("ticket_id", sa.Integer(),
                  sa.ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("rated_by", sa.Integer(),
                  sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.CheckConstraint("score >= 1 AND score <= 5", name="ck_ratings_score_range"),
    )
    op.create_index("ix_ratings_ticket_id", "ratings", ["ticket_id"])
    op.create_index("ix_ratings_rated_by", "ratings", ["rated_by"])


# ---------------------------------------------------------------------------
# downgrade
# ---------------------------------------------------------------------------
def downgrade() -> None:
    op.drop_table("ratings")
    op.drop_table("attributions")
    op.drop_table("ticket_events")
    op.drop_table("tickets")
    op.drop_table("issue_clusters")
    op.drop_table("users")
    op.drop_table("institutions")

    op.execute("DROP TYPE IF EXISTS ip_outcome")
    op.execute("DROP TYPE IF EXISTS event_type")
    op.execute("DROP TYPE IF EXISTS ticket_status")
    op.execute("DROP TYPE IF EXISTS institution_type")
    op.execute("DROP TYPE IF EXISTS user_role")
