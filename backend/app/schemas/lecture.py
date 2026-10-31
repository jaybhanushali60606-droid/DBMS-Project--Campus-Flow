from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import date, time

class LectureBase(BaseModel):
    course_id: int
    faculty_id: int
    room_id: Optional[int] = None
    date: date
    start_time: time
    end_time: time
    duration: Optional[int] = None  # derived if not provided
    topic: Optional[str] = None
    status: str = "SCHEDULED"  # SCHEDULED, COMPLETED, CANCELLED
    division_id: Optional[int] = None

class LectureCreate(LectureBase):
    pass

class LectureUpdate(BaseModel):
    course_id: Optional[int] = None
    faculty_id: Optional[int] = None
    room_id: Optional[int] = None
    date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    duration: Optional[int] = None
    topic: Optional[str] = None
    status: Optional[str] = None
    division_id: Optional[int] = None

class LectureOut(LectureBase):
    model_config = ConfigDict(from_attributes=True)
    lecture_id: int
    course_title: Optional[str] = None
    course_code: Optional[str] = None
    faculty_name: Optional[str] = None
    room_number: Optional[str] = None
    attendance_recorded: Optional[bool] = False
    present_count: Optional[int] = 0
    absent_count: Optional[int] = 0
    total_enrolled: Optional[int] = 0
    division_name: Optional[str] = None
    branch: Optional[str] = None
    academic_year: Optional[int] = None
