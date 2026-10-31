from sqlalchemy import Column, Integer, Float, String, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Result(Base):
    __tablename__ = "result"

    exam_id = Column(Integer, ForeignKey("exam.exam_id", name="fk_result_exam_id", ondelete="CASCADE"), primary_key=True)
    student_id = Column(Integer, ForeignKey("student.student_id", name="fk_result_student_id", ondelete="CASCADE"), primary_key=True)
    marks = Column(Float, nullable=False)
    grade = Column(String(5), nullable=False)  # e.g., A+, A, B+, B, C, D, F
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    exam = relationship("Exam", back_populates="results")
    student = relationship("Student", back_populates="results")
