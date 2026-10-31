from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.enrollment import faculty_courses

class Faculty(Base):
    __tablename__ = "faculty"

    faculty_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    dept_id = Column(Integer, ForeignKey("department.dept_id", name="fk_faculty_dept_id"), nullable=False)
    f_name = Column(String(50), nullable=False)
    m_name = Column(String(50), nullable=True)
    l_name = Column(String(50), nullable=False)
    designation = Column(String(50), nullable=False, default="Assistant Professor")
    email = Column(String(100), unique=True, nullable=True)

    # Relationships
    department = relationship("Department", foreign_keys=[dept_id], back_populates="faculty_members")
    taught_courses = relationship("Course", secondary=faculty_courses, back_populates="assigned_faculty")
    lectures = relationship("Lecture", back_populates="faculty")
    exams = relationship("Exam", back_populates="faculty")
    schedules = relationship("Schedule", back_populates="faculty")
    user = relationship("User", back_populates="faculty", uselist=False)
    profile = relationship("FacultyProfile", back_populates="faculty", uselist=False, cascade="all, delete-orphan")
    teaching_groups = relationship("FacultyTeachingGroup", back_populates="faculty", cascade="all, delete-orphan")
    administrative_designations = relationship("FacultyDesignation", back_populates="faculty", cascade="all, delete-orphan")
    contact_profile = relationship("FacultyContactProfile", back_populates="faculty", uselist=False, cascade="all, delete-orphan")

    @property
    def full_name(self) -> str:
        if self.m_name:
            return f"{self.f_name} {self.m_name} {self.l_name}"
        return f"{self.f_name} {self.l_name}"
