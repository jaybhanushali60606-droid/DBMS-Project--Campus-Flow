from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class DivisionCreate(BaseModel):
    academic_year: int = Field(ge=1, le=4)
    branch: Literal["CE", "CSE", "EXTC"]
    division_name: str = Field(min_length=1, max_length=1, pattern=r"^[A-Za-z]$")


class DivisionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    division_id: int
    academic_year: int
    branch: str
    division_name: str
    students_count: int = 0
