from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import date

class ExamBase(BaseModel):
    course_id: int
    faculty_id: Optional[int] = None
    exam_type: str  # Midterm, Final, Quiz, Practical, Assignment
    exam_date: date
    max_marks: float = 100.0
    grade: Optional[str] = None
    division_id: Optional[int] = None

class ExamCreate(ExamBase):
    pass

class ExamUpdate(BaseModel):
    course_id: Optional[int] = None
    faculty_id: Optional[int] = None
    exam_type: Optional[str] = None
    exam_date: Optional[date] = None
    max_marks: Optional[float] = None
    grade: Optional[str] = None
    division_id: Optional[int] = None

class ExamOut(ExamBase):
    model_config = ConfigDict(from_attributes=True)
    exam_id: int
    course_title: Optional[str] = None
    course_code: Optional[str] = None
    faculty_name: Optional[str] = None
    total_results: Optional[int] = 0
    average_marks: Optional[float] = None
    academic_year: Optional[int] = None
    branch: Optional[str] = None
    division_name: Optional[str] = None
