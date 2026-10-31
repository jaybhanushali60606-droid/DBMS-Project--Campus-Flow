from sqlalchemy import Column, Integer, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.enrollment import Enrollment

class Student(Base):
    __tablename__ = "student"

    student_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    dept_id = Column(Integer, ForeignKey("department.dept_id", name="fk_student_dept_id"), nullable=False)
    f_name = Column(String(50), nullable=False)
    m_name = Column(String(50), nullable=True)
    l_name = Column(String(50), nullable=False)
    dob = Column(Date, nullable=False)
    roll_no = Column(String(50), unique=True, nullable=True, index=True)
    email = Column(String(100), unique=True, nullable=True)

    # Relationships
    department = relationship("Department", back_populates="students")
    enrolled_courses = relationship("Course", secondary="enrollments", back_populates="enrolled_students", overlaps="enrollment_records")
    enrollment_records = relationship("Enrollment", foreign_keys=[Enrollment.student_id], cascade="all, delete-orphan", overlaps="enrolled_courses,enrolled_students")
    attendance_records = relationship("Attendance", back_populates="student", cascade="all, delete-orphan")
    results = relationship("Result", back_populates="student", cascade="all, delete-orphan")
    user = relationship("User", back_populates="student", uselist=False)
    division_assignment = relationship("StudentDivision", back_populates="student", uselist=False, cascade="all, delete-orphan")
    contact_profile = relationship("StudentContactProfile", back_populates="student", uselist=False, cascade="all, delete-orphan")

    @property
    def full_name(self) -> str:
        if self.m_name:
            return f"{self.f_name} {self.m_name} {self.l_name}"
        return f"{self.f_name} {self.l_name}"
