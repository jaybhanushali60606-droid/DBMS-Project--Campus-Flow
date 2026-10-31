from pydantic import BaseModel, ConfigDict
from typing import Optional, List

class DepartmentBase(BaseModel):
    dept_name: str
    building: str
    head_id: Optional[int] = None

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentUpdate(BaseModel):
    dept_name: Optional[str] = None
    building: Optional[str] = None
    head_id: Optional[int] = None

class DepartmentOut(DepartmentBase):
    model_config = ConfigDict(from_attributes=True)
    dept_id: int
    head_name: Optional[str] = None
    student_count: Optional[int] = 0
    faculty_count: Optional[int] = 0
    course_count: Optional[int] = 0
