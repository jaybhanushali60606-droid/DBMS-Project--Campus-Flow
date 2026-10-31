"""initial schema

Revision ID: 001_initial
Revises: 
Create Date: 2026-10-14 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '001_initial'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # 1. Department table
    op.create_table(
        'department',
        sa.Column('dept_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('dept_name', sa.String(length=100), nullable=False),
        sa.Column('building', sa.String(length=100), nullable=False),
        sa.Column('head_id', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('dept_id')
    )
    op.create_index(op.f('ix_department_dept_id'), 'department', ['dept_id'], unique=False)
    op.create_index(op.f('ix_department_dept_name'), 'department', ['dept_name'], unique=True)

    # 2. Faculty table
    op.create_table(
        'faculty',
        sa.Column('faculty_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('dept_id', sa.Integer(), nullable=False),
        sa.Column('f_name', sa.String(length=50), nullable=False),
        sa.Column('m_name', sa.String(length=50), nullable=True),
        sa.Column('l_name', sa.String(length=50), nullable=False),
        sa.Column('designation', sa.String(length=50), nullable=False, server_default='Assistant Professor'),
        sa.Column('email', sa.String(length=100), nullable=True),
        sa.ForeignKeyConstraint(['dept_id'], ['department.dept_id'], name='fk_faculty_dept_id'),
        sa.PrimaryKeyConstraint('faculty_id'),
        sa.UniqueConstraint('email')
    )
    op.create_index(op.f('ix_faculty_faculty_id'), 'faculty', ['faculty_id'], unique=False)

    # Circular Head FK
    try:
        op.create_foreign_key('fk_department_head_id', 'department', 'faculty', ['head_id'], ['faculty_id'])
    except Exception:
        pass

    # 3. Course table
    op.create_table(
        'course',
        sa.Column('course_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('dept_id', sa.Integer(), nullable=False),
        sa.Column('course_code', sa.String(length=20), nullable=False),
        sa.Column('title', sa.String(length=100), nullable=False),
        sa.Column('credits', sa.Integer(), nullable=False, server_default='3'),
        sa.ForeignKeyConstraint(['dept_id'], ['department.dept_id'], name='fk_course_dept_id'),
        sa.PrimaryKeyConstraint('course_id')
    )
    op.create_index(op.f('ix_course_course_id'), 'course', ['course_id'], unique=False)
    op.create_index(op.f('ix_course_course_code'), 'course', ['course_code'], unique=True)

    # 4. Student table
    op.create_table(
        'student',
        sa.Column('student_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('dept_id', sa.Integer(), nullable=False),
        sa.Column('f_name', sa.String(length=50), nullable=False),
        sa.Column('m_name', sa.String(length=50), nullable=True),
        sa.Column('l_name', sa.String(length=50), nullable=False),
        sa.Column('dob', sa.Date(), nullable=False),
        sa.Column('roll_no', sa.String(length=50), nullable=True),
        sa.Column('email', sa.String(length=100), nullable=True),
        sa.ForeignKeyConstraint(['dept_id'], ['department.dept_id'], name='fk_student_dept_id'),
        sa.PrimaryKeyConstraint('student_id'),
        sa.UniqueConstraint('email')
    )
    op.create_index(op.f('ix_student_student_id'), 'student', ['student_id'], unique=False)
    op.create_index(op.f('ix_student_roll_no'), 'student', ['roll_no'], unique=True)

    # 5. Course enrollments
    op.create_table(
        'enrollments',
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('course_id', sa.Integer(), nullable=False),
        sa.Column('enrolled_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('status', sa.String(length=20), server_default='ENROLLED', nullable=False),
        sa.ForeignKeyConstraint(['course_id'], ['course.course_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['student_id'], ['student.student_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('student_id', 'course_id')
    )

    # 6. Faculty Courses (teaches)
    op.create_table(
        'faculty_courses',
        sa.Column('faculty_id', sa.Integer(), nullable=False),
        sa.Column('course_id', sa.Integer(), nullable=False),
        sa.Column('assigned_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['course_id'], ['course.course_id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['faculty_id'], ['faculty.faculty_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('faculty_id', 'course_id')
    )

    # 7. Room table
    op.create_table(
        'room',
        sa.Column('room_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('room_number', sa.String(length=50), nullable=False),
        sa.Column('building', sa.String(length=100), nullable=False),
        sa.Column('capacity', sa.Integer(), server_default='40', nullable=False),
        sa.Column('room_type', sa.String(length=50), server_default='CLASSROOM', nullable=False),
        sa.PrimaryKeyConstraint('room_id')
    )
    op.create_index(op.f('ix_room_room_id'), 'room', ['room_id'], unique=False)
    op.create_index(op.f('ix_room_room_number'), 'room', ['room_number'], unique=True)

    # 8. Lecture table
    op.create_table(
        'lecture',
        sa.Column('lecture_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('course_id', sa.Integer(), nullable=False),
        sa.Column('faculty_id', sa.Integer(), nullable=False),
        sa.Column('room_id', sa.Integer(), nullable=True),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
        sa.Column('duration', sa.Integer(), nullable=False),
        sa.Column('topic', sa.String(length=255), nullable=True),
        sa.Column('status', sa.String(length=20), server_default='COMPLETED', nullable=False),
        sa.ForeignKeyConstraint(['course_id'], ['course.course_id'], name='fk_lecture_course_id'),
        sa.ForeignKeyConstraint(['faculty_id'], ['faculty.faculty_id'], name='fk_lecture_faculty_id'),
        sa.ForeignKeyConstraint(['room_id'], ['room.room_id'], name='fk_lecture_room_id'),
        sa.PrimaryKeyConstraint('lecture_id')
    )
    op.create_index(op.f('ix_lecture_date'), 'lecture', ['date'], unique=False)
    op.create_index(op.f('ix_lecture_lecture_id'), 'lecture', ['lecture_id'], unique=False)

    # 9. Attendance table
    op.create_table(
        'attendance',
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('lecture_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=10), nullable=False),
        sa.Column('percentage', sa.Float(), nullable=True),
        sa.Column('remarks', sa.String(length=255), nullable=True),
        sa.Column('marked_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['lecture_id'], ['lecture.lecture_id'], name='fk_attendance_lecture_id', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['student_id'], ['student.student_id'], name='fk_attendance_student_id', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('student_id', 'lecture_id')
    )

    # 10. Exam table
    op.create_table(
        'exam',
        sa.Column('exam_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('course_id', sa.Integer(), nullable=False),
        sa.Column('faculty_id', sa.Integer(), nullable=True),
        sa.Column('exam_type', sa.String(length=50), nullable=False),
        sa.Column('exam_date', sa.Date(), nullable=False),
        sa.Column('max_marks', sa.Float(), server_default='100.0', nullable=False),
        sa.Column('grade', sa.String(length=20), nullable=True),
        sa.ForeignKeyConstraint(['course_id'], ['course.course_id'], name='fk_exam_course_id', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['faculty_id'], ['faculty.faculty_id'], name='fk_exam_faculty_id'),
        sa.PrimaryKeyConstraint('exam_id')
    )
    op.create_index(op.f('ix_exam_exam_id'), 'exam', ['exam_id'], unique=False)

    # 11. Result table
    op.create_table(
        'result',
        sa.Column('exam_id', sa.Integer(), nullable=False),
        sa.Column('student_id', sa.Integer(), nullable=False),
        sa.Column('marks', sa.Float(), nullable=False),
        sa.Column('grade', sa.String(length=5), nullable=False),
        sa.Column('submitted_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['exam_id'], ['exam.exam_id'], name='fk_result_exam_id', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['student_id'], ['student.student_id'], name='fk_result_student_id', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('exam_id', 'student_id')
    )

    # 12. Schedule table
    op.create_table(
        'schedule',
        sa.Column('schedule_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('room_id', sa.Integer(), nullable=False),
        sa.Column('course_id', sa.Integer(), nullable=True),
        sa.Column('faculty_id', sa.Integer(), nullable=True),
        sa.Column('activity_type', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=100), nullable=False),
        sa.Column('day_of_week', sa.String(length=20), nullable=False),
        sa.Column('schedule_date', sa.Date(), nullable=True),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
        sa.ForeignKeyConstraint(['course_id'], ['course.course_id'], name='fk_schedule_course_id', ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['faculty_id'], ['faculty.faculty_id'], name='fk_schedule_faculty_id', ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['room_id'], ['room.room_id'], name='fk_schedule_room_id', ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('schedule_id')
    )
    op.create_index(op.f('ix_schedule_day_of_week'), 'schedule', ['day_of_week'], unique=False)
    op.create_index(op.f('ix_schedule_schedule_id'), 'schedule', ['schedule_id'], unique=False)

    # 13. Users table
    op.create_table(
        'users',
        sa.Column('user_id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('username', sa.String(length=50), nullable=False),
        sa.Column('email', sa.String(length=100), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=20), server_default='STUDENT', nullable=False),
        sa.Column('faculty_id', sa.Integer(), nullable=True),
        sa.Column('student_id', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['faculty_id'], ['faculty.faculty_id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['student_id'], ['student.student_id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('user_id'),
        sa.UniqueConstraint('faculty_id'),
        sa.UniqueConstraint('student_id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_user_id'), 'users', ['user_id'], unique=False)
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)

def downgrade() -> None:
    op.drop_table('users')
    op.drop_table('schedule')
    op.drop_table('result')
    op.drop_table('exam')
    op.drop_table('attendance')
    op.drop_table('lecture')
    op.drop_table('room')
    op.drop_table('faculty_courses')
    op.drop_table('enrollments')
    op.drop_table('student')
    op.drop_table('course')
    try:
        op.drop_constraint('fk_department_head_id', 'department', type_='foreignkey')
    except Exception:
        pass
    op.drop_table('faculty')
    op.drop_table('department')
