"""Allow shared courses and assign them to multiple class divisions.

Revision ID: 002_course_classes
Revises: 001_initial
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "002_course_classes"
down_revision = "001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    # The app also uses create_all(), so this table may already exist by migration time.
    if not inspector.has_table("course_divisions"):
        op.create_table(
            "course_divisions",
            sa.Column("course_id", sa.Integer(), nullable=False),
            sa.Column("division_id", sa.Integer(), nullable=False),
            sa.ForeignKeyConstraint(["course_id"], ["course.course_id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["division_id"], ["division.division_id"], ondelete="RESTRICT"),
            sa.PrimaryKeyConstraint("course_id", "division_id"),
        )

    course_columns = {column["name"]: column for column in inspect(bind).get_columns("course")}
    if course_columns.get("dept_id", {}).get("nullable") is False:
        with op.batch_alter_table("course") as batch_op:
            batch_op.alter_column(
                "dept_id",
                existing_type=sa.Integer(),
                nullable=True,
            )


def downgrade() -> None:
    bind = op.get_bind()
    null_courses = bind.execute(sa.text("SELECT COUNT(*) FROM course WHERE dept_id IS NULL")).scalar_one()
    if null_courses:
        raise RuntimeError("Cannot make course.dept_id required while unowned shared courses exist.")

    with op.batch_alter_table("course") as batch_op:
        batch_op.alter_column("dept_id", existing_type=sa.Integer(), nullable=False)
    if inspect(bind).has_table("course_divisions"):
        op.drop_table("course_divisions")
