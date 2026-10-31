from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Department(Base):
    __tablename__ = "department"

    dept_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    dept_name = Column(String(100), unique=True, nullable=False, index=True)
    building = Column(String(100), nullable=False)
    
    # head_id references Faculty(faculty_id). Circular dependency handled using use_alter=True.
    head_id = Column(
        Integer, 
        ForeignKey("faculty.faculty_id", name="fk_department_head_id", use_alter=True), 
        nullable=True
    )

    # Relationships
    head = relationship("Faculty", foreign_keys=[head_id], post_update=True)
    faculty_members = relationship("Faculty", foreign_keys="Faculty.dept_id", back_populates="department")
    courses = relationship("Course", back_populates="department", cascade="all, delete-orphan")
    students = relationship("Student", back_populates="department", cascade="all, delete-orphan")
