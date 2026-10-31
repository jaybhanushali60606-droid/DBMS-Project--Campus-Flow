from sqlalchemy import Column, Integer, ForeignKey, DateTime, String, Table
from sqlalchemy.sql import func
from app.database import Base

# Secondary junction table for Faculty <-> Course (ER Diagram "teaches")
faculty_courses = Table(
    "faculty_courses",
    Base.metadata,
    Column("faculty_id", Integer, ForeignKey("faculty.faculty_id", ondelete="CASCADE"), primary_key=True),
    Column("course_id", Integer, ForeignKey("course.course_id", ondelete="CASCADE"), primary_key=True),
    Column("assigned_at", DateTime(timezone=True), server_default=func.now())
)

# Secondary junction table / Model for Student <-> Course (ER Diagram "enrolls-in")
class Enrollment(Base):
    __tablename__ = "enrollments"

    student_id = Column(Integer, ForeignKey("student.student_id", ondelete="CASCADE"), primary_key=True)
    course_id = Column(Integer, ForeignKey("course.course_id", ondelete="CASCADE"), primary_key=True)
    enrolled_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String(20), default="ENROLLED", nullable=False)  # ENROLLED, COMPLETED, DROPPED
