from pydantic import BaseModel, EmailStr, ConfigDict, Field
from typing import Literal, Optional
from datetime import date, datetime

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    username: str
    email: str
    role: str
    faculty_id: Optional[int] = None
    student_id: Optional[int] = None
    full_name: Optional[str] = None

class TokenPayload(BaseModel):
    sub: str
    user_id: int
    role: str
    exp: int

class LoginRequest(BaseModel):
    username: str
    password: str
    role: Optional[str] = None

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str
    faculty_id: Optional[int] = None
    student_id: Optional[int] = None

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    user_id: int
    username: str
    email: str
    role: str
    faculty_id: Optional[int] = None
    student_id: Optional[int] = None
    is_active: bool
    created_at: Optional[datetime] = None

class PasswordChange(BaseModel):
    old_password: str
    new_password: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=72)


class ProfileUpdate(BaseModel):
    phone: Optional[str] = Field(default=None, max_length=24)
    personal_email: Optional[EmailStr] = None
    gender: Optional[Literal["Female", "Male", "Non-binary", "Other", "Prefer not to say"]] = None
    address: Optional[str] = Field(default=None, max_length=500)

    # Student contact and emergency details
    guardian_name: Optional[str] = Field(default=None, max_length=120)
    guardian_phone: Optional[str] = Field(default=None, max_length=24)
    blood_group: Optional[Literal["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]] = None

    # Faculty academic and employment details
    date_of_birth: Optional[date] = None
    highest_qualification: Optional[str] = Field(default=None, max_length=150)
    years_experience: Optional[int] = Field(default=None, ge=0, le=70)
    joining_date: Optional[date] = None
    emergency_contact_name: Optional[str] = Field(default=None, max_length=120)
    emergency_contact_phone: Optional[str] = Field(default=None, max_length=24)
