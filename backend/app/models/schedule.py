from sqlalchemy import Column, Integer, String, Time, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Schedule(Base):
    __tablename__ = "schedule"

    schedule_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    room_id = Column(Integer, ForeignKey("room.room_id", name="fk_schedule_room_id", ondelete="CASCADE"), nullable=False)
    course_id = Column(Integer, ForeignKey("course.course_id", name="fk_schedule_course_id", ondelete="SET NULL"), nullable=True)
    faculty_id = Column(Integer, ForeignKey("faculty.faculty_id", name="fk_schedule_faculty_id", ondelete="SET NULL"), nullable=True)
    activity_type = Column(String(50), nullable=False)  # LECTURE, LAB, EXTRACURRICULAR
    title = Column(String(100), nullable=False)
    day_of_week = Column(String(20), nullable=False, index=True)  # Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
    schedule_date = Column(Date, nullable=True)  # Optional specific date or recurring weekly
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)

    # Relationships
    room = relationship("Room", back_populates="schedules")
    course = relationship("Course", back_populates="schedules")
    faculty = relationship("Faculty", back_populates="schedules")
