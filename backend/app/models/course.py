from sqlalchemy import Column, Integer, String, ForeignKey, Table
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.enrollment import faculty_courses, Enrollment

course_divisions = Table(
    "course_divisions",
    Base.metadata,
    Column("course_id", Integer, ForeignKey("course.course_id", ondelete="CASCADE"), primary_key=True),
    Column("division_id", Integer, ForeignKey("division.division_id", ondelete="RESTRICT"), primary_key=True),
)

class Course(Base):
    __tablename__ = "course"

    course_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    dept_id = Column(Integer, ForeignKey("department.dept_id", name="fk_course_dept_id"), nullable=True)
    course_code = Column(String(20), unique=True, nullable=False, index=True)
    title = Column(String(100), nullable=False)
    credits = Column(Integer, nullable=False, default=3)

    # Relationships
    department = relationship("Department", back_populates="courses")
    assigned_faculty = relationship("Faculty", secondary=faculty_courses, back_populates="taught_courses")
    assigned_divisions = relationship("Division", secondary=course_divisions, back_populates="assigned_courses")
    enrolled_students = relationship("Student", secondary="enrollments", back_populates="enrolled_courses", overlaps="enrollment_records")
    enrollment_records = relationship("Enrollment", foreign_keys=[Enrollment.course_id], cascade="all, delete-orphan", overlaps="enrolled_students")
    lectures = relationship("Lecture", back_populates="course", cascade="all, delete-orphan")
    exams = relationship("Exam", back_populates="course", cascade="all, delete-orphan")
    schedules = relationship("Schedule", back_populates="course")
