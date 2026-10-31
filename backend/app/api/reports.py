import csv
import io
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any, List
from datetime import date
from app.database import get_db
from app.models.department import Department
from app.models.student import Student
from app.models.faculty import Faculty
from app.models.course import Course
from app.models.lecture import Lecture
from app.models.attendance import Attendance
from app.models.result import Result
from app.models.room import Room
from app.models.schedule import Schedule
from app.schemas.report import AcademicSummaryReport
from app.services.defaulter_service import get_monthly_defaulter_list
from app.api.deps import require_admin, get_current_user
from app.models.user import User

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/summary", response_model=AcademicSummaryReport)
def get_academic_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    total_depts = db.query(Department).count()
    total_students = db.query(Student).count()
    total_faculty = db.query(Faculty).count()
    total_courses = db.query(Course).count()
    total_lectures = db.query(Lecture).filter(Lecture.status == "COMPLETED").count()
    total_att_records = db.query(Attendance).count()

    # Department distribution
    depts = db.query(Department).all()
    dept_distribution = []
    for d in depts:
        stu_cnt = db.query(Student).filter(Student.dept_id == d.dept_id).count()
        fac_cnt = db.query(Faculty).filter(Faculty.dept_id == d.dept_id).count()
        crs_cnt = db.query(Course).filter(Course.dept_id == d.dept_id).count()
        dept_distribution.append({
            "dept_id": d.dept_id,
            "dept_name": d.dept_name,
            "students": stu_cnt,
            "faculty": fac_cnt,
            "courses": crs_cnt
        })

    # Overall attendance average
    present_records = db.query(Attendance).filter(Attendance.status == "PRESENT").count()
    overall_att = round((present_records / total_att_records * 100.0), 2) if total_att_records > 0 else 0.0

    # Grade distribution
    results = db.query(Result).all()
    grade_distribution = {"A+": 0, "A": 0, "B+": 0, "B": 0, "C": 0, "D": 0, "F": 0}
    for r in results:
        g = r.grade.strip()
        if g in grade_distribution:
            grade_distribution[g] += 1
        else:
            grade_distribution[g] = 1

    # Defaulter count for current month
    today = date.today()
    defaulters = get_monthly_defaulter_list(
        db=db,
        month=today.month,
        year=today.year,
        defaulter_only=True
    )

    return AcademicSummaryReport(
        total_departments=total_depts,
        total_students=total_students,
        total_faculty=total_faculty,
        total_courses=total_courses,
        total_lectures_held=total_lectures,
        total_attendance_records=total_att_records,
        overall_attendance_average=overall_att,
        total_defaulters_count=len(defaulters),
        department_distribution=dept_distribution,
        grade_distribution=grade_distribution
    )

@router.get("/defaulters/export-csv")
def export_defaulters_csv(
    month: int = Query(default=date.today().month, ge=1, le=12),
    year: int = Query(default=date.today().year, ge=2020, le=2030),
    threshold: float = Query(default=75.0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    items = get_monthly_defaulter_list(
        db=db,
        month=month,
        year=year,
        threshold=threshold,
        defaulter_only=False,
        current_user=current_user
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Student ID", "Roll No", "Student Name", "Department",
        "Course Code", "Course Title", "Month", "Year",
        "Attended Lectures", "Total Lectures", "Attendance %", "Defaulter (<75%)"
    ])

    for i in items:
        writer.writerow([
            i.student_id, i.roll_no or "", i.student_name, i.dept_name,
            i.course_code, i.course_title, i.month_name, i.year,
            i.attended_lectures, i.total_lectures, f"{i.attendance_percentage}%",
            "YES" if i.is_defaulter else "NO"
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=campusflow_attendance_{month}_{year}.csv"}
    )
