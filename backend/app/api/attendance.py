from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from app.database import get_db
from app.models.user import User
from app.schemas.attendance import (
    AttendanceSubmitRequest, MonthlyDefaulterItem, 
    StudentCourseAttendanceSummary, AttendanceOut
)
from app.services.attendance_service import (
    submit_lecture_attendance, 
    get_student_all_courses_attendance,
    get_student_course_attendance,
    get_student_attendance_records,
)
from app.services.defaulter_service import get_monthly_defaulter_list
from app.api.deps import require_faculty_or_admin, get_current_user

router = APIRouter(prefix="/attendance", tags=["Attendance"])

@router.post("/submit")
def submit_attendance(
    req: AttendanceSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_faculty_or_admin)
):
    return submit_lecture_attendance(
        db=db,
        lecture_id=req.lecture_id,
        records=req.records,
        current_user=current_user
    )

@router.get("/defaulters", response_model=List[MonthlyDefaulterItem])
def get_defaulters_report(
    month: int = Query(default=date.today().month, ge=1, le=12, description="Month (1-12)"),
    year: int = Query(default=date.today().year, ge=2020, le=2030, description="Year"),
    dept_id: Optional[int] = Query(default=None, description="Filter by department ID"),
    course_id: Optional[int] = Query(default=None, description="Filter by course ID"),
    threshold: float = Query(default=75.0, ge=0.0, le=100.0, description="Attendance threshold percentage"),
    defaulter_only: bool = Query(default=False, description="Filter only students below threshold"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    CampusFlow Unique Feature: Monthly Defaulter Generation
    Identifies all students whose attendance percentage in a given month is below the threshold (default 75%).
    Enforces role visibility:
    - Admin: System-wide
    - Faculty: Courses taught by this faculty member
    - Student: Own attendance and defaulter status
    """
    return get_monthly_defaulter_list(
        db=db,
        month=month,
        year=year,
        dept_id=dept_id,
        course_id=course_id,
        defaulter_only=defaulter_only,
        threshold=threshold,
        current_user=current_user
    )

@router.get("/my-attendance", response_model=List[StudentCourseAttendanceSummary])
def get_my_attendance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "STUDENT" or not current_user.student_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current user is not linked to a student profile."
        )
    return get_student_all_courses_attendance(db=db, student_id=current_user.student_id)

@router.get("/my-attendance/records", response_model=List[AttendanceOut])
def get_my_attendance_records(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "STUDENT" or not current_user.student_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current user is not linked to a student profile.",
        )
    records = get_student_attendance_records(db, current_user.student_id)
    return [
        AttendanceOut(
            student_id=record.student_id,
            lecture_id=record.lecture_id,
            status=record.status,
            percentage=record.percentage,
            remarks=record.remarks,
            student_name=record.student.full_name if record.student else None,
            roll_no=record.student.roll_no if record.student else None,
            lecture_date=record.lecture.date if record.lecture else None,
            course_title=record.lecture.course.title if record.lecture and record.lecture.course else None,
            course_code=record.lecture.course.course_code if record.lecture and record.lecture.course else None,
            topic=record.lecture.topic if record.lecture else None,
            marked_at=record.marked_at,
        )
        for record in records
    ]
