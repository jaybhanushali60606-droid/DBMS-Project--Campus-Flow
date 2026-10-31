"""Add optional personal profiles for faculty and students.

Revision ID: 005_personal_profiles
Revises: 004_faculty_designations
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "005_personal_profiles"
down_revision = "004_faculty_designations"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    if not inspector.has_table("faculty_contact_profiles"):
        op.create_table(
            "faculty_contact_profiles",
            sa.Column("faculty_id", sa.Integer(), nullable=False),
            sa.Column("phone", sa.String(length=24), nullable=True),
            sa.Column("personal_email", sa.String(length=254), nullable=True),
            sa.Column("gender", sa.String(length=32), nullable=True),
            sa.Column("date_of_birth", sa.Date(), nullable=True),
            sa.Column("address", sa.String(length=500), nullable=True),
            sa.Column("highest_qualification", sa.String(length=150), nullable=True),
            sa.Column("years_experience", sa.Integer(), nullable=True),
            sa.Column("joining_date", sa.Date(), nullable=True),
            sa.Column("emergency_contact_name", sa.String(length=120), nullable=True),
            sa.Column("emergency_contact_phone", sa.String(length=24), nullable=True),
            sa.ForeignKeyConstraint(["faculty_id"], ["faculty.faculty_id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("faculty_id"),
        )
    if not inspector.has_table("student_contact_profiles"):
        op.create_table(
            "student_contact_profiles",
            sa.Column("student_id", sa.Integer(), nullable=False),
            sa.Column("phone", sa.String(length=24), nullable=True),
            sa.Column("personal_email", sa.String(length=254), nullable=True),
            sa.Column("gender", sa.String(length=32), nullable=True),
            sa.Column("address", sa.String(length=500), nullable=True),
            sa.Column("guardian_name", sa.String(length=120), nullable=True),
            sa.Column("guardian_phone", sa.String(length=24), nullable=True),
            sa.Column("blood_group", sa.String(length=5), nullable=True),
            sa.ForeignKeyConstraint(["student_id"], ["student.student_id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("student_id"),
        )


def downgrade() -> None:
    bind = op.get_bind()
    if inspect(bind).has_table("student_contact_profiles"):
        op.drop_table("student_contact_profiles")
    if inspect(bind).has_table("faculty_contact_profiles"):
        op.drop_table("faculty_contact_profiles")
