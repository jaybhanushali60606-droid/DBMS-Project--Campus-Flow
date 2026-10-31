from sqlalchemy import Column, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base


class Division(Base):
    __tablename__ = "division"
    __table_args__ = (
        UniqueConstraint("academic_year", "branch", "division_name", name="uq_division_year_branch_name"),
    )

    division_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    academic_year = Column(Integer, nullable=False, index=True)
    branch = Column(String(10), nullable=False, index=True)
    division_name = Column(String(20), nullable=False)
    assigned_courses = relationship("Course", secondary="course_divisions", back_populates="assigned_divisions")


class StudentDivision(Base):
    __tablename__ = "student_division"

    student_id = Column(Integer, ForeignKey("student.student_id", ondelete="CASCADE"), primary_key=True)
    division_id = Column(Integer, ForeignKey("division.division_id", ondelete="RESTRICT"), nullable=False, index=True)

    division = relationship("Division")
    student = relationship("Student", back_populates="division_assignment")


class LectureDivision(Base):
    __tablename__ = "lecture_division"

    lecture_id = Column(Integer, ForeignKey("lecture.lecture_id", ondelete="CASCADE"), primary_key=True)
    division_id = Column(Integer, ForeignKey("division.division_id", ondelete="RESTRICT"), nullable=False, index=True)

    division = relationship("Division")
