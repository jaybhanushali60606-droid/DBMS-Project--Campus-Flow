from sqlalchemy import Column, Integer, String, Date, Time, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Lecture(Base):
    __tablename__ = "lecture"

    lecture_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    course_id = Column(Integer, ForeignKey("course.course_id", name="fk_lecture_course_id"), nullable=False)
    faculty_id = Column(Integer, ForeignKey("faculty.faculty_id", name="fk_lecture_faculty_id"), nullable=False)
    room_id = Column(Integer, ForeignKey("room.room_id", name="fk_lecture_room_id"), nullable=True)
    date = Column(Date, nullable=False, index=True)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    duration = Column(Integer, nullable=False)  # in minutes
    topic = Column(String(255), nullable=True)
    status = Column(String(20), nullable=False, default="COMPLETED")  # COMPLETED, SCHEDULED, CANCELLED

    # Relationships
    course = relationship("Course", back_populates="lectures")
    faculty = relationship("Faculty", back_populates="lectures")
    room = relationship("Room", back_populates="lectures")
    attendances = relationship("Attendance", back_populates="lecture", cascade="all, delete-orphan")
