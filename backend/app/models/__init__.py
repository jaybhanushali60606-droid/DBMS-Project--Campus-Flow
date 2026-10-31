from app.models.department import Department
from app.models.faculty import Faculty
from app.models.faculty_assignment import FacultyProfile, FacultyTeachingGroup, FacultyDesignation
from app.models.course import Course, course_divisions
from app.models.student import Student
from app.models.profile_details import FacultyContactProfile, StudentContactProfile
from app.models.enrollment import Enrollment, faculty_courses
from app.models.room import Room
from app.models.lecture import Lecture
from app.models.attendance import Attendance
from app.models.exam import Exam, ExamDivision
from app.models.result import Result
from app.models.schedule import Schedule
from app.models.user import User
from app.models.division import Division, StudentDivision, LectureDivision

__all__ = [
    "Department",
    "Faculty",
    "FacultyProfile",
    "FacultyTeachingGroup",
    "FacultyDesignation",
    "FacultyContactProfile",
    "StudentContactProfile",
    "Course",
    "course_divisions",
    "Student",
    "Enrollment",
    "faculty_courses",
    "Room",
    "Lecture",
    "Attendance",
    "Exam",
    "Result",
    "Schedule",
    "User",
    "Division",
    "StudentDivision",
    "LectureDivision",
]
