from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import date, time, datetime

class AttendanceRecordIn(BaseModel):
    student_id: int
    status: str  # PRESENT, ABSENT
    remarks: Optional[str] = None

class AttendanceSubmitRequest(BaseModel):
    lecture_id: int
    records: List[AttendanceRecordIn]

class AttendanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    student_id: int
    lecture_id: int
    status: str
    percentage: Optional[float] = None
    remarks: Optional[str] = None
    student_name: Optional[str] = None
    roll_no: Optional[str] = None
    lecture_date: Optional[date] = None
    course_title: Optional[str] = None
    course_code: Optional[str] = None
    topic: Optional[str] = None
    marked_at: Optional[datetime] = None

class StudentCourseAttendanceSummary(BaseModel):
    student_id: int
    student_name: str
    roll_no: Optional[str] = None
    course_id: int
    course_code: str
    course_title: str
    attended_lectures: int
    total_lectures: int
    attendance_percentage: float
    is_defaulter: bool

class MonthlyDefaulterItem(BaseModel):
    student_id: int
    student_name: str
    roll_no: Optional[str] = None
    dept_name: str
    course_id: int
    course_code: str
    course_title: str
    month: int
    year: int
    month_name: str
    attended_lectures: int
    total_lectures: int
    attendance_percentage: float
    threshold: float = 75.0
    is_defaulter: bool
