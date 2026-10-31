"""Add categorized administrative faculty roles.

Revision ID: 004_faculty_designations
Revises: 003_faculty_teaching_groups
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "004_faculty_designations"
down_revision = "003_faculty_teaching_groups"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if not inspect(bind).has_table("faculty_designations"):
        op.create_table(
            "faculty_designations",
            sa.Column("designation_id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("faculty_id", sa.Integer(), nullable=False),
            sa.Column("title", sa.String(length=50), nullable=False),
            sa.Column("division_id", sa.Integer(), nullable=True),
            sa.ForeignKeyConstraint(["faculty_id"], ["faculty.faculty_id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["division_id"], ["division.division_id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("designation_id"),
            sa.UniqueConstraint("faculty_id", "title", "division_id", name="uq_faculty_designation_scope"),
        )
        op.create_index("ix_faculty_designations_faculty_id", "faculty_designations", ["faculty_id"])
        op.create_index("ix_faculty_designations_division_id", "faculty_designations", ["division_id"])


def downgrade() -> None:
    bind = op.get_bind()
    if inspect(bind).has_table("faculty_designations"):
        op.drop_table("faculty_designations")
