from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class FacultyBase(BaseModel):
    dept_id: int
    f_name: str
    m_name: Optional[str] = None
    l_name: str
    designation: str = "Assistant Professor"
    email: Optional[EmailStr] = None


class FacultyTeachingGroupOut(BaseModel):
    division_id: int
    academic_year: int
    branch: str
    division_name: str


class FacultyCourseOut(BaseModel):
    course_id: int
    course_code: str
    title: str


class FacultyCreate(BaseModel):
    dept_id: int
    f_name: str
    m_name: Optional[str] = None
    l_name: str
    designation: str = "Assistant Professor"
    specialization: Optional[str] = Field(default=None, min_length=2, max_length=255)
    course_ids: List[int] = Field(default_factory=list)
    division_ids: List[int] = Field(min_length=1)
    administrative_roles: List[str] = Field(default_factory=list)
    coordinator_division_ids: List[int] = Field(default_factory=list)
    create_user_account: Optional[bool] = True
    password: Optional[str] = Field(default="faculty123", min_length=8, max_length=72)


class FacultyUpdate(BaseModel):
    dept_id: Optional[int] = None
    f_name: Optional[str] = None
    m_name: Optional[str] = None
    l_name: Optional[str] = None
    designation: Optional[str] = None
    specialization: Optional[str] = Field(default=None, min_length=2, max_length=255)
    course_ids: Optional[List[int]] = None
    division_ids: Optional[List[int]] = Field(default=None, min_length=1)
    administrative_roles: Optional[List[str]] = None
    coordinator_division_ids: Optional[List[int]] = None


class FacultyOut(FacultyBase):
    model_config = ConfigDict(from_attributes=True)
    faculty_id: int
    full_name: str
    dept_name: Optional[str] = None
    specialization: str = ""
    assigned_courses: List[FacultyCourseOut] = Field(default_factory=list)
    assigned_divisions: List[FacultyTeachingGroupOut] = Field(default_factory=list)
    eligible_division_ids: List[int] = Field(default_factory=list)
    administrative_roles: List[str] = Field(default_factory=list)
    coordinator_division_ids: List[int] = Field(default_factory=list)
