from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Exam(Base):
    __tablename__ = "exam"

    exam_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey("course.course_id", name="fk_exam_course_id", ondelete="CASCADE"), nullable=False)
    faculty_id = Column(Integer, ForeignKey("faculty.faculty_id", name="fk_exam_faculty_id"), nullable=True)
    exam_type = Column(String(50), nullable=False)  # Midterm, Final, Quiz, Practical, Assignment
    exam_date = Column(Date, nullable=False)
    max_marks = Column(Float, nullable=False, default=100.0)
    grade = Column(String(20), nullable=True)  # Overall grade distribution / benchmark if applicable

    # Relationships
    course = relationship("Course", back_populates="exams")
    faculty = relationship("Faculty", back_populates="exams")
    results = relationship("Result", back_populates="exam", cascade="all, delete-orphan")


class ExamDivision(Base):
    """Class assignment for an exam; separate table keeps existing exam rows compatible."""
    __tablename__ = "exam_division"

    exam_id = Column(Integer, ForeignKey("exam.exam_id", ondelete="CASCADE"), primary_key=True)
    division_id = Column(Integer, ForeignKey("division.division_id", ondelete="RESTRICT"), nullable=False, index=True)

    exam = relationship("Exam")
    division = relationship("Division")
