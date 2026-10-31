from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import date
from typing import Dict, Any
from app.database import get_db
from app.models.user import User
from app.models.student import Student
from app.models.faculty import Faculty
from app.models.course import Course
from app.models.department import Department
from app.models.room import Room
from app.models.lecture import Lecture
from app.models.attendance import Attendance
from app.models.result import Result
from app.models.schedule import Schedule
from app.models.enrollment import Enrollment, faculty_courses
from app.services.defaulter_service import get_monthly_defaulter_list
from app.services.attendance_service import get_student_all_courses_attendance
from app.api.deps import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    today = date.today()
    
    if current_user.role == "ADMIN":
        total_students = db.query(Student).count()
        total_faculty = db.query(Faculty).count()
        total_courses = db.query(Course).count()
        total_depts = db.query(Department).count()
        total_rooms = db.query(Room).count()
        
        # Today's lectures
        today_lectures = db.query(Lecture).filter(Lecture.date == today).count()
        
        # Monthly defaulters
        defaulters = get_monthly_defaulter_list(
            db=db,
            month=today.month,
            year=today.year,
            defaulter_only=True
        )

        # Average attendance percentage
        total_att = db.query(Attendance).count()
        present_att = db.query(Attendance).filter(Attendance.status == "PRESENT").count()
        overall_pct = round((present_att / total_att * 100.0), 2) if total_att > 0 else 0.0

        return {
            "role": "ADMIN",
            "stats": {
                "total_students": total_students,
                "total_faculty": total_faculty,
                "total_courses": total_courses,
                "total_departments": total_depts,
                "total_rooms": total_rooms,
                "today_lectures": today_lectures,
                "overall_attendance": overall_pct,
                "monthly_defaulters_count": len(defaulters),
            }
        }

    elif current_user.role == "FACULTY":
        fac_id = current_user.faculty_id
        assigned_courses = db.query(Course).join(
            faculty_courses, faculty_courses.c.course_id == Course.course_id
        ).filter(faculty_courses.c.faculty_id == fac_id).all()
        
        course_ids = [c.course_id for c in assigned_courses]

        # Total unique students taught
        total_students_taught = db.query(Enrollment.student_id).filter(
            Enrollment.course_id.in_(course_ids),
            Enrollment.status == "ENROLLED"
        ).distinct().count() if course_ids else 0

        # Lectures delivered by faculty
        total_lectures = db.query(Lecture).filter(
            Lecture.faculty_id == fac_id,
            Lecture.status == "COMPLETED"
        ).count()

        # Defaulters in faculty courses
        defaulters = get_monthly_defaulter_list(
            db=db,
            month=today.month,
            year=today.year,
            course_id=None,
            defaulter_only=True,
            current_user=current_user
        )

        faculty_obj = db.query(Faculty).filter(Faculty.faculty_id == fac_id).first() if fac_id else None

        return {
            "role": "FACULTY",
            "faculty_profile": {
                "name": faculty_obj.full_name if faculty_obj else current_user.username,
                "department": faculty_obj.department.dept_name if faculty_obj and faculty_obj.department else ""
            },
            "stats": {
                "assigned_courses_count": len(assigned_courses),
                "students_taught": total_students_taught,
                "lectures_delivered": total_lectures,
                "defaulters_in_courses": len(defaulters)
            },
            "assigned_courses": [
                {"course_id": c.course_id, "course_code": c.course_code, "title": c.title}
                for c in assigned_courses
            ]
        }

    elif current_user.role == "STUDENT":
        stu_id = current_user.student_id
        student = db.query(Student).filter(Student.student_id == stu_id).first()
        
        # Course attendance
        course_summaries = get_student_all_courses_attendance(db=db, student_id=stu_id)
        
        # Overall attendance calculation
        total_attended = sum(cs.attended_lectures for cs in course_summaries)
        total_held = sum(cs.total_lectures for cs in course_summaries)
        overall_pct = round((total_attended / total_held * 100.0), 2) if total_held > 0 else 0.0
        is_defaulter_overall = overall_pct < 75.0 if total_held > 0 else False

        # Results summary
        results = db.query(Result).filter(Result.student_id == stu_id).all()

        return {
            "role": "STUDENT",
            "student_profile": {
                "name": student.full_name if student else "Student",
                "roll_no": student.roll_no if student else "",
                "department": student.department.dept_name if student and student.department else ""
            },
            "stats": {
                "enrolled_courses_count": len(course_summaries),
                "total_attended_lectures": total_attended,
                "total_held_lectures": total_held,
                "overall_attendance_percentage": overall_pct,
                "is_defaulter": is_defaulter_overall,
                "exams_taken": len(results)
            },
            "courses_attendance": [cs.dict() for cs in course_summaries]
        }

    raise HTTPException(status_code=400, detail="Unknown role.")
