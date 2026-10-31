from pydantic import BaseModel, EmailStr, ConfigDict, Field
from typing import Optional, List
from datetime import date

class StudentBase(BaseModel):
    dept_id: int
    f_name: str
    m_name: Optional[str] = None
    l_name: str
    dob: date
    roll_no: Optional[str] = None
    email: Optional[EmailStr] = None

class StudentCreate(BaseModel):
    dept_id: int
    f_name: str
    m_name: Optional[str] = None
    l_name: str
    dob: date
    division_id: int
    create_user_account: Optional[bool] = True
    password: Optional[str] = Field(default=None, min_length=8, max_length=72)

class StudentUpdate(BaseModel):
    dept_id: Optional[int] = None
    f_name: Optional[str] = None
    m_name: Optional[str] = None
    l_name: Optional[str] = None
    dob: Optional[date] = None
    email: Optional[EmailStr] = None
    division_id: Optional[int] = None
    password: Optional[str] = Field(default=None, min_length=8, max_length=72)

class StudentOut(StudentBase):
    model_config = ConfigDict(from_attributes=True)
    student_id: int
    full_name: str
    dept_name: Optional[str] = None
    enrolled_courses_count: Optional[int] = 0
    academic_year: Optional[int] = None
    branch: Optional[str] = None
    division_id: Optional[int] = None
    division_name: Optional[str] = None

class StudentCourseEnrollRequest(BaseModel):
    course_ids: List[int]
