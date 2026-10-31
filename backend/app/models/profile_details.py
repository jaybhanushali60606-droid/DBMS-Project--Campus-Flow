from sqlalchemy import Column, Date, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class FacultyContactProfile(Base):
    __tablename__ = "faculty_contact_profiles"

    faculty_id = Column(Integer, ForeignKey("faculty.faculty_id", ondelete="CASCADE"), primary_key=True)
    phone = Column(String(24), nullable=True)
    personal_email = Column(String(254), nullable=True)
    gender = Column(String(32), nullable=True)
    date_of_birth = Column(Date, nullable=True)
    address = Column(String(500), nullable=True)
    highest_qualification = Column(String(150), nullable=True)
    years_experience = Column(Integer, nullable=True)
    joining_date = Column(Date, nullable=True)
    emergency_contact_name = Column(String(120), nullable=True)
    emergency_contact_phone = Column(String(24), nullable=True)

    faculty = relationship("Faculty", back_populates="contact_profile")


class StudentContactProfile(Base):
    __tablename__ = "student_contact_profiles"

    student_id = Column(Integer, ForeignKey("student.student_id", ondelete="CASCADE"), primary_key=True)
    phone = Column(String(24), nullable=True)
    personal_email = Column(String(254), nullable=True)
    gender = Column(String(32), nullable=True)
    address = Column(String(500), nullable=True)
    guardian_name = Column(String(120), nullable=True)
    guardian_phone = Column(String(24), nullable=True)
    blood_group = Column(String(5), nullable=True)

    student = relationship("Student", back_populates="contact_profile")
