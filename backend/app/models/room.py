from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base

class Room(Base):
    __tablename__ = "room"

    room_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    room_number = Column(String(50), unique=True, nullable=False, index=True)
    building = Column(String(100), nullable=False)
    capacity = Column(Integer, nullable=False, default=40)
    room_type = Column(String(50), nullable=False, default="CLASSROOM")  # CLASSROOM, LABORATORY, ACTIVITY_SPACE, SEMINAR_HALL

    # Relationships
    schedules = relationship("Schedule", back_populates="room", cascade="all, delete-orphan")
    lectures = relationship("Lecture", back_populates="room")
