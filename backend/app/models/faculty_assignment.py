from sqlalchemy import Column, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base


class FacultyProfile(Base):
    __tablename__ = "faculty_profile"

    faculty_id = Column(Integer, ForeignKey("faculty.faculty_id", ondelete="CASCADE"), primary_key=True)
    specialization = Column(String(255), nullable=False)

    faculty = relationship("Faculty", back_populates="profile")


class FacultyTeachingGroup(Base):
    __tablename__ = "faculty_teaching_groups"

    faculty_id = Column(Integer, ForeignKey("faculty.faculty_id", ondelete="CASCADE"), primary_key=True)
    division_id = Column(Integer, ForeignKey("division.division_id", ondelete="CASCADE"), primary_key=True, index=True)

    faculty = relationship("Faculty", back_populates="teaching_groups")
    division = relationship("Division")


class FacultyDesignation(Base):
    __tablename__ = "faculty_designations"
    __table_args__ = (UniqueConstraint("faculty_id", "title", "division_id", name="uq_faculty_designation_scope"),)

    designation_id = Column(Integer, primary_key=True, autoincrement=True)
    faculty_id = Column(Integer, ForeignKey("faculty.faculty_id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(50), nullable=False)
    division_id = Column(Integer, ForeignKey("division.division_id", ondelete="CASCADE"), nullable=True, index=True)

    faculty = relationship("Faculty", back_populates="administrative_designations")
    division = relationship("Division")
