from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
from app.models.lecture import Lecture
from app.models.attendance import Attendance
from app.models.course import Course
from app.models.student import Student
from app.models.enrollment import Enrollment
from app.models.division import StudentDivision, LectureDivision
from app.models.user import User
from app.schemas.attendance import AttendanceRecordIn, StudentCourseAttendanceSummary
from app.config import settings

def submit_lecture_attendance(
    db: Session,
    lecture_id: int,
    records: List[AttendanceRecordIn],
    current_user: User
) -> Dict[str, Any]:
    lecture = db.query(Lecture).filter(Lecture.lecture_id == lecture_id).first()
    if not lecture:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lecture with ID {lecture_id} not found."
        )
    if not records:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attendance cannot be saved without marking at least one student."
        )

    # Permission check: Only assigned faculty or Admin can mark attendance
    if current_user.role == "FACULTY" and current_user.faculty_id != lecture.faculty_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to mark attendance for this lecture. You can only mark attendance for your own lectures."
        )

    # Division-selected lectures use that exact roster; legacy lectures keep course enrollment.
    lecture_division = db.query(LectureDivision).filter(
        LectureDivision.lecture_id == lecture_id
    ).first()
    if lecture_division:
        eligible_student_ids = set(
            row[0] for row in db.query(StudentDivision.student_id).filter(
                StudentDivision.division_id == lecture_division.division_id
            ).all()
        )
    else:
        eligible_student_ids = set(
            row[0] for row in db.query(Enrollment.student_id).filter(
                Enrollment.course_id == lecture.course_id,
                Enrollment.status == "ENROLLED"
            ).all()
        )

    present_count = 0
    absent_count = 0

    for rec in records:
        if rec.student_id not in eligible_student_ids:
            student = db.query(Student).filter(Student.student_id == rec.student_id).first()
            student_name = student.full_name if student else f"ID {rec.student_id}"
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Student {student_name} is not assigned to this lecture's class roster."
            )

        status_str = rec.status.upper()
        if status_str not in ("PRESENT", "ABSENT"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid attendance status '{rec.status}'. Must be 'PRESENT' or 'ABSENT'."
            )

        if status_str == "PRESENT":
            present_count += 1
        else:
            absent_count += 1

        # Check existing attendance record (allows correction)
        att = db.query(Attendance).filter(
            Attendance.student_id == rec.student_id,
            Attendance.lecture_id == lecture_id
        ).first()

        if att:
            att.status = status_str
            att.remarks = rec.remarks
        else:
            att = Attendance(
                student_id=rec.student_id,
                lecture_id=lecture_id,
                status=status_str,
                remarks=rec.remarks,
                percentage=100.0 if status_str == "PRESENT" else 0.0
            )
            db.add(att)

    lecture.status = "COMPLETED"
    db.commit()

    total_submitted = present_count + absent_count
    return {
        "lecture_id": lecture_id,
        "total_marked": total_submitted,
        "present_count": present_count,
        "absent_count": absent_count,
        "message": f"Attendance successfully recorded for lecture #{lecture_id} ({present_count} present, {absent_count} absent)."
    }

def get_student_course_attendance(
    db: Session,
    student_id: int,
    course_id: int
) -> StudentCourseAttendanceSummary:
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")
    
    course = db.query(Course).filter(Course.course_id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")

    # All non-cancelled lectures for this course where attendance has been recorded for this student
    records = db.query(Attendance).join(Lecture, Lecture.lecture_id == Attendance.lecture_id).filter(
        Attendance.student_id == student_id,
        Lecture.course_id == course_id,
        Lecture.status != "CANCELLED"
    ).all()

    total_held = len(records)
    attended = sum(1 for r in records if r.status == "PRESENT")
    
    if total_held > 0:
        pct = round((attended / total_held) * 100.0, 2)
        is_defaulter = pct < settings.DEFAULT_ATTENDANCE_THRESHOLD
    else:
        pct = 0.0
        is_defaulter = False

    return StudentCourseAttendanceSummary(
        student_id=student_id,
        student_name=student.full_name,
        roll_no=student.roll_no,
        course_id=course_id,
        course_code=course.course_code,
        course_title=course.title,
        attended_lectures=attended,
        total_lectures=total_held,
        attendance_percentage=pct,
        is_defaulter=is_defaulter
    )

def get_student_all_courses_attendance(
    db: Session,
    student_id: int
) -> List[StudentCourseAttendanceSummary]:
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    enrolled_course_ids = db.query(Enrollment.course_id).filter(
        Enrollment.student_id == student_id,
        Enrollment.status == "ENROLLED"
    )
    attended_course_ids = db.query(Lecture.course_id).join(
        Attendance, Attendance.lecture_id == Lecture.lecture_id
    ).filter(Attendance.student_id == student_id)
    course_ids = {row[0] for row in enrolled_course_ids.all()}
    course_ids.update(row[0] for row in attended_course_ids.distinct().all())
    enrolled_courses = db.query(Course).filter(Course.course_id.in_(course_ids)).order_by(Course.course_code).all() if course_ids else []

    summaries = []
    for course in enrolled_courses:
        summary = get_student_course_attendance(db, student_id, course.course_id)
        summaries.append(summary)

    return summaries

def get_student_attendance_records(db: Session, student_id: int) -> List[Attendance]:
    return db.query(Attendance).join(
        Lecture, Lecture.lecture_id == Attendance.lecture_id
    ).filter(
        Attendance.student_id == student_id,
        Lecture.status != "CANCELLED",
    ).order_by(Lecture.date.desc(), Lecture.start_time.desc()).all()
