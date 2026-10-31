from pydantic import BaseModel, ConfigDict
from typing import Optional, List

class CourseBase(BaseModel):
    dept_id: Optional[int] = None
    course_code: str
    title: str
    credits: int = 3

class CourseCreate(CourseBase):
    pass

class CourseUpdate(BaseModel):
    dept_id: Optional[int] = None
    course_code: Optional[str] = None
    title: Optional[str] = None
    credits: Optional[int] = None

class CourseFacultySummary(BaseModel):
    faculty_id: int
    full_name: str
    designation: str
    dept_name: Optional[str] = None
    specialization: str = ""
    eligible_division_ids: List[int] = []

class CourseDivisionSummary(BaseModel):
    division_id: int
    academic_year: int
    branch: str
    division_name: str
    students_count: int = 0

class FacultyAssignRequest(BaseModel):
    faculty_ids: List[int]

class CourseDivisionAssignRequest(BaseModel):
    division_ids: List[int]

class CourseOut(CourseBase):
    model_config = ConfigDict(from_attributes=True)
    course_id: int
    dept_name: Optional[str] = None
    enrolled_students_count: Optional[int] = 0
    assigned_faculty_count: Optional[int] = 0
    assigned_faculty: List[CourseFacultySummary] = []
    assigned_divisions: List[CourseDivisionSummary] = []
