"""Store faculty expertise and multiple eligible class groups.

Revision ID: 003_faculty_teaching_groups
Revises: 002_course_classes
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "003_faculty_teaching_groups"
down_revision = "002_course_classes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if not inspector.has_table("faculty_profile"):
        op.create_table(
            "faculty_profile",
            sa.Column("faculty_id", sa.Integer(), nullable=False),
            sa.Column("specialization", sa.String(length=255), nullable=False),
            sa.ForeignKeyConstraint(["faculty_id"], ["faculty.faculty_id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("faculty_id"),
        )
    if not inspector.has_table("faculty_teaching_groups"):
        op.create_table(
            "faculty_teaching_groups",
            sa.Column("faculty_id", sa.Integer(), nullable=False),
            sa.Column("division_id", sa.Integer(), nullable=False),
            sa.ForeignKeyConstraint(["faculty_id"], ["faculty.faculty_id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["division_id"], ["division.division_id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("faculty_id", "division_id"),
        )
        op.create_index("ix_faculty_teaching_groups_division_id", "faculty_teaching_groups", ["division_id"])


def downgrade() -> None:
    bind = op.get_bind()
    if inspect(bind).has_table("faculty_teaching_groups"):
        op.drop_index("ix_faculty_teaching_groups_division_id", table_name="faculty_teaching_groups")
        op.drop_table("faculty_teaching_groups")
    if inspect(bind).has_table("faculty_profile"):
        op.drop_table("faculty_profile")
