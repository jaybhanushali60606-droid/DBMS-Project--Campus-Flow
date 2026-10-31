from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import time, date

class ScheduleBase(BaseModel):
    room_id: int
    course_id: Optional[int] = None
    faculty_id: Optional[int] = None
    activity_type: str  # LECTURE, LAB, EXTRACURRICULAR
    title: str
    day_of_week: str  # Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
    schedule_date: Optional[date] = None
    start_time: time
    end_time: time

class ScheduleCreate(ScheduleBase):
    pass

class ScheduleUpdate(BaseModel):
    room_id: Optional[int] = None
    course_id: Optional[int] = None
    faculty_id: Optional[int] = None
    activity_type: Optional[str] = None
    title: Optional[str] = None
    day_of_week: Optional[str] = None
    schedule_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None

class ScheduleOut(ScheduleBase):
    model_config = ConfigDict(from_attributes=True)

    schedule_id: int
    room_number: Optional[str] = None
    room_building: Optional[str] = None
    room_type: Optional[str] = None
    course_code: Optional[str] = None
    course_title: Optional[str] = None
    faculty_name: Optional[str] = None
