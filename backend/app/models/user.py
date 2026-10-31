from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="STUDENT")  # ADMIN, FACULTY, STUDENT
    faculty_id = Column(Integer, ForeignKey("faculty.faculty_id", ondelete="SET NULL"), nullable=True, unique=True)
    student_id = Column(Integer, ForeignKey("student.student_id", ondelete="SET NULL"), nullable=True, unique=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    faculty = relationship("Faculty", back_populates="user")
    student = relationship("Student", back_populates="user")
