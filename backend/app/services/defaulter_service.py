import calendar
from typing import List, Optional
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import extract
from app.models.student import Student
from app.models.course import Course
from app.models.department import Department
from app.models.lecture import Lecture
from app.models.attendance import Attendance
from app.models.enrollment import Enrollment, faculty_courses
from app.models.user import User
from app.schemas.attendance import MonthlyDefaulterItem
from app.config import settings

def get_monthly_defaulter_list(
    db: Session,
    month: int,
    year: int,
    dept_id: Optional[int] = None,
    course_id: Optional[int] = None,
    defaulter_only: bool = False,
    threshold: float = 75.0,
    current_user: Optional[User] = None
) -> List[MonthlyDefaulterItem]:
    month_name = calendar.month_name[month]

    # Base query for students and their enrolled courses
    enrollment_query = db.query(Enrollment, Student, Course, Department).join(
        Student, Student.student_id == Enrollment.student_id
    ).join(
        Course, Course.course_id == Enrollment.course_id
    ).join(
        Department, Department.dept_id == Student.dept_id
    ).filter(
        Enrollment.status == "ENROLLED"
    )

    # Filter by user role permissions
    if current_user:
        if current_user.role == "STUDENT":
            enrollment_query = enrollment_query.filter(Student.student_id == current_user.student_id)
        elif current_user.role == "FACULTY":
            # Faculty only sees courses assigned to them
            taught_course_ids = [
                row[0] for row in db.query(faculty_courses.c.course_id).filter(
                    faculty_courses.c.faculty_id == current_user.faculty_id
                ).all()
            ]
            enrollment_query = enrollment_query.filter(Course.course_id.in_(taught_course_ids))

    if dept_id:
        enrollment_query = enrollment_query.filter(Student.dept_id == dept_id)
    if course_id:
        enrollment_query = enrollment_query.filter(Course.course_id == course_id)

    enrollments = enrollment_query.all()
    results: List[MonthlyDefaulterItem] = []

    for enr, student, course, dept in enrollments:
        # Fetch lectures held in this specific month & year for this course (excluding CANCELLED)
        lectures_in_month = db.query(Lecture).filter(
            Lecture.course_id == course.course_id,
            Lecture.status != "CANCELLED",
            extract('month', Lecture.date) == month,
            extract('year', Lecture.date) == year
        ).all()

        lecture_ids = [lec.lecture_id for lec in lectures_in_month]
        
        if not lecture_ids:
            # No lectures held this month for this course
            total_held = 0
            attended = 0
            pct = 100.0  # Or 0.0 with 0 held
            is_defaulter = False
        else:
            # Query attendance records for this student in these lectures
            att_records = db.query(Attendance).filter(
                Attendance.student_id == student.student_id,
                Attendance.lecture_id.in_(lecture_ids)
            ).all()

            total_held = len(att_records)
            attended = sum(1 for a in att_records if a.status == "PRESENT")
            
            if total_held > 0:
                pct = round((attended / total_held) * 100.0, 2)
                is_defaulter = pct < threshold
            else:
                pct = 100.0
                is_defaulter = False

        if defaulter_only and not is_defaulter:
            continue

        item = MonthlyDefaulterItem(
            student_id=student.student_id,
            student_name=student.full_name,
            roll_no=student.roll_no,
            dept_name=dept.dept_name,
            course_id=course.course_id,
            course_code=course.course_code,
            course_title=course.title,
            month=month,
            year=year,
            month_name=month_name,
            attended_lectures=attended,
            total_lectures=total_held,
            attendance_percentage=pct,
            threshold=threshold,
            is_defaulter=is_defaulter
        )
        results.append(item)

    # Sort: defaulters first, then by percentage ascending
    results.sort(key=lambda x: (not x.is_defaulter, x.attendance_percentage))
    return results
