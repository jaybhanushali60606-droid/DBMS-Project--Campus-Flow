from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class ResultRecordIn(BaseModel):
    student_id: int
    marks: float
    grade: Optional[str] = None  # Auto-calculated if not provided

class ResultBulkSubmitRequest(BaseModel):
    exam_id: int
    results: List[ResultRecordIn]

class ResultCreate(BaseModel):
    exam_id: int
    student_id: int
    marks: float
    grade: Optional[str] = None

class ResultUpdate(BaseModel):
    marks: Optional[float] = None
    grade: Optional[str] = None

class ResultOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    exam_id: int
    student_id: int
    marks: float
    grade: str
    student_name: Optional[str] = None
    roll_no: Optional[str] = None
    exam_type: Optional[str] = None
    course_title: Optional[str] = None
    course_code: Optional[str] = None
    max_marks: Optional[float] = 100.0
    percentage: Optional[float] = None
    submitted_at: Optional[datetime] = None
