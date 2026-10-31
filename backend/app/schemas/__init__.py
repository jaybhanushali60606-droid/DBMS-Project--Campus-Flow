from app.schemas.auth import Token, TokenPayload, LoginRequest, UserCreate, UserOut, PasswordChange
from app.schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentOut
from app.schemas.faculty import FacultyCreate, FacultyUpdate, FacultyOut
from app.schemas.course import CourseCreate, CourseUpdate, CourseOut, FacultyAssignRequest
from app.schemas.student import StudentCreate, StudentUpdate, StudentOut, StudentCourseEnrollRequest
from app.schemas.lecture import LectureCreate, LectureUpdate, LectureOut
from app.schemas.attendance import (
    AttendanceRecordIn, AttendanceSubmitRequest, AttendanceOut, 
    StudentCourseAttendanceSummary, MonthlyDefaulterItem
)
from app.schemas.exam import ExamCreate, ExamUpdate, ExamOut
from app.schemas.result import ResultRecordIn, ResultBulkSubmitRequest, ResultCreate, ResultUpdate, ResultOut
from app.schemas.room import RoomCreate, RoomUpdate, RoomOut
from app.schemas.schedule import ScheduleCreate, ScheduleUpdate, ScheduleOut
from app.schemas.report import AcademicSummaryReport

__all__ = [
    "Token", "TokenPayload", "LoginRequest", "UserCreate", "UserOut", "PasswordChange",
    "DepartmentCreate", "DepartmentUpdate", "DepartmentOut",
    "FacultyCreate", "FacultyUpdate", "FacultyOut",
    "CourseCreate", "CourseUpdate", "CourseOut", "FacultyAssignRequest",
    "StudentCreate", "StudentUpdate", "StudentOut", "StudentCourseEnrollRequest",
    "LectureCreate", "LectureUpdate", "LectureOut",
    "AttendanceRecordIn", "AttendanceSubmitRequest", "AttendanceOut",
    "StudentCourseAttendanceSummary", "MonthlyDefaulterItem",
    "ExamCreate", "ExamUpdate", "ExamOut",
    "ResultRecordIn", "ResultBulkSubmitRequest", "ResultCreate", "ResultUpdate", "ResultOut",
    "RoomCreate", "RoomUpdate", "RoomOut",
    "ScheduleCreate", "ScheduleUpdate", "ScheduleOut",
    "AcademicSummaryReport",
]
