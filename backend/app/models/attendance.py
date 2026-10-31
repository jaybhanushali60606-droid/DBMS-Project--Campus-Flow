from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Attendance(Base):
    __tablename__ = "attendance"

    student_id = Column(Integer, ForeignKey("student.student_id", name="fk_attendance_student_id", ondelete="CASCADE"), primary_key=True)
    lecture_id = Column(Integer, ForeignKey("lecture.lecture_id", name="fk_attendance_lecture_id", ondelete="CASCADE"), primary_key=True)
    status = Column(String(10), nullable=False)  # PRESENT, ABSENT
    percentage = Column(Float, nullable=True)     # For relational schema compliance
    remarks = Column(String(255), nullable=True)
    marked_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    student = relationship("Student", back_populates="attendance_records")
    lecture = relationship("Lecture", back_populates="attendances")
