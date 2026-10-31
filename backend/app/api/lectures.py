from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime, timedelta, timezone
from sqlalchemy import and_, or_, func
from app.database import get_db
from app.models.lecture import Lecture
from app.models.course import Course
from app.models.faculty import Faculty
from app.models.room import Room
from app.models.attendance import Attendance
from app.models.enrollment import Enrollment
from app.schemas.lecture import LectureCreate, LectureUpdate, LectureOut
from app.schemas.attendance import AttendanceOut
from app.api.deps import require_faculty_or_admin, get_current_user
from app.models.user import User
from app.services.faculty_assignments import eligible_divisions_for_faculty
from app.models.division import Division, StudentDivision, LectureDivision
from app.models.student import Student
from app.models.user import User

router = APIRouter(prefix="/lectures", tags=["Lectures"])

def _ensure_start_is_future(lecture_date: date, start_time) -> None:
    india_tz = timezone(timedelta(hours=5, minutes=30))
    now_in_india = datetime.now(india_tz).replace(tzinfo=None)
    requested_start = datetime.combine(lecture_date, start_time)
    if requested_start <= now_in_india:
        raise HTTPException(status_code=400, detail="Lecture date and start time must be later than the current India time.")

def _lecture_division(db: Session, lecture_id: int):
    assignment = db.query(LectureDivision).filter(LectureDivision.lecture_id == lecture_id).first()
    return assignment.division if assignment else None

def _lecture_roster(db: Session, lecture: Lecture):
    assignment = db.query(LectureDivision).filter(LectureDivision.lecture_id == lecture.lecture_id).first()
    if assignment:
        return db.query(Student).join(
            StudentDivision, StudentDivision.student_id == Student.student_id
        ).filter(StudentDivision.division_id == assignment.division_id).order_by(Student.roll_no, Student.student_id).all()
    return db.query(Student).join(
        Enrollment, Enrollment.student_id == Student.student_id
    ).filter(
        Enrollment.course_id == lecture.course_id,
        Enrollment.status == "ENROLLED"
    ).order_by(Student.roll_no, Student.student_id).all()

def _student_can_view_lecture(db: Session, student_id: int, lecture: Lecture) -> bool:
    assigned_division_id = db.query(LectureDivision.division_id).filter(
        LectureDivision.lecture_id == lecture.lecture_id
    ).scalar()
    if assigned_division_id is not None:
        student_division_id = db.query(StudentDivision.division_id).filter(
            StudentDivision.student_id == student_id
        ).scalar()
        return student_division_id == assigned_division_id
    return db.query(Enrollment).filter(
        Enrollment.student_id == student_id,
        Enrollment.course_id == lecture.course_id,
        Enrollment.status == "ENROLLED",
    ).first() is not None

def _format_lecture(db: Session, lecture: Lecture, present_count: int, absent_count: int) -> LectureOut:
    division = _lecture_division(db, lecture.lecture_id)
    return LectureOut(
        lecture_id=lecture.lecture_id,
        course_id=lecture.course_id,
        faculty_id=lecture.faculty_id,
        room_id=lecture.room_id,
        date=lecture.date,
        start_time=lecture.start_time,
        end_time=lecture.end_time,
        duration=lecture.duration,
        topic=lecture.topic,
        status=lecture.status,
        course_title=lecture.course.title if lecture.course else None,
        course_code=lecture.course.course_code if lecture.course else None,
        faculty_name=lecture.faculty.full_name if lecture.faculty else None,
        room_number=lecture.room.room_number if lecture.room else None,
        attendance_recorded=(present_count + absent_count) > 0,
        present_count=present_count,
        absent_count=absent_count,
        total_enrolled=len(_lecture_roster(db, lecture)),
        division_id=division.division_id if division else None,
        division_name=division.division_name if division else None,
        branch=division.branch if division else None,
        academic_year=division.academic_year if division else None,
    )

def _validate_course_faculty(course: Course, faculty_id: int) -> None:
    assigned_ids = {member.faculty_id for member in course.assigned_faculty}
    if not assigned_ids:
        raise HTTPException(status_code=400, detail="Assign faculty to this course before scheduling a lecture.")
    if faculty_id not in assigned_ids:
        raise HTTPException(status_code=400, detail="Select a faculty member assigned to this course.")

def _ensure_no_schedule_conflict(
    db: Session,
    *,
    lecture_date: date,
    start_time,
    end_time,
    faculty_id: int,
    room_id: Optional[int],
    division_id: Optional[int],
    exclude_lecture_id: Optional[int] = None,
) -> None:
    overlapping = db.query(Lecture).filter(
        Lecture.date == lecture_date,
        Lecture.start_time < end_time,
        Lecture.end_time > start_time,
        func.upper(Lecture.status) != "CANCELLED",
    )
    if exclude_lecture_id is not None:
        overlapping = overlapping.filter(Lecture.lecture_id != exclude_lecture_id)
    if room_id is not None and overlapping.filter(Lecture.room_id == room_id).first():
        raise HTTPException(status_code=409, detail="This room already has another lecture during the selected time.")
    if overlapping.filter(Lecture.faculty_id == faculty_id).first():
        raise HTTPException(status_code=409, detail="This faculty member already has another lecture during the selected time.")
    if division_id is not None:
        class_overlap = overlapping.join(
            LectureDivision, LectureDivision.lecture_id == Lecture.lecture_id
        ).filter(LectureDivision.division_id == division_id).first()
        if class_overlap:
            raise HTTPException(status_code=409, detail="This class already has another lecture during the selected time.")

@router.get("", response_model=List[LectureOut])
def list_lectures(
    course_id: Optional[int] = None,
    faculty_id: Optional[int] = None,
    lecture_date: Optional[date] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Lecture)
    if date_from and date_to and date_from > date_to:
        raise HTTPException(status_code=400, detail="Start date must be on or before end date.")
    if course_id:
        query = query.filter(Lecture.course_id == course_id)
    if faculty_id:
        query = query.filter(Lecture.faculty_id == faculty_id)
    if lecture_date:
        query = query.filter(Lecture.date == lecture_date)
    if date_from:
        query = query.filter(Lecture.date >= date_from)
    if date_to:
        query = query.filter(Lecture.date <= date_to)

    if current_user.role == "FACULTY":
        if not current_user.faculty_id:
            return []
        query = query.filter(Lecture.faculty_id == current_user.faculty_id)

    # If student, show only lectures of enrolled courses
    if current_user.role == "STUDENT":
        if not current_user.student_id:
            return []
        enrolled_course_ids = [
            row[0] for row in db.query(Enrollment.course_id).filter(
                Enrollment.student_id == current_user.student_id,
                Enrollment.status == "ENROLLED"
            ).all()
        ]
        student_division_id = db.query(StudentDivision.division_id).filter(
            StudentDivision.student_id == current_user.student_id
        ).scalar()
        query = query.outerjoin(LectureDivision, LectureDivision.lecture_id == Lecture.lecture_id)
        if student_division_id:
            query = query.filter(or_(
                LectureDivision.division_id == student_division_id,
                and_(LectureDivision.lecture_id.is_(None), Lecture.course_id.in_(enrolled_course_ids)),
            ))
        else:
            query = query.filter(LectureDivision.lecture_id.is_(None), Lecture.course_id.in_(enrolled_course_ids))

    lectures = query.order_by(Lecture.date.desc(), Lecture.start_time.desc()).all()

    results = []
    for lec in lectures:
        present_count = db.query(Attendance).filter(
            Attendance.lecture_id == lec.lecture_id,
            Attendance.status == "PRESENT"
        ).count()
        absent_count = db.query(Attendance).filter(
            Attendance.lecture_id == lec.lecture_id,
            Attendance.status == "ABSENT"
        ).count()
        results.append(_format_lecture(db, lec, present_count, absent_count))
    return results

@router.get("/{lecture_id}", response_model=LectureOut)
def get_lecture(
    lecture_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    lec = db.query(Lecture).filter(Lecture.lecture_id == lecture_id).first()
    if not lec:
        raise HTTPException(status_code=404, detail="Lecture not found.")
    if current_user.role == "FACULTY" and current_user.faculty_id != lec.faculty_id:
        raise HTTPException(status_code=403, detail="Faculty can only view their own lectures.")
    if current_user.role == "STUDENT" and (
        not current_user.student_id or not _student_can_view_lecture(db, current_user.student_id, lec)
    ):
        raise HTTPException(status_code=403, detail="This lecture is not assigned to your account.")

    present_count = db.query(Attendance).filter(
        Attendance.lecture_id == lec.lecture_id,
        Attendance.status == "PRESENT"
    ).count()
    absent_count = db.query(Attendance).filter(
        Attendance.lecture_id == lec.lecture_id,
        Attendance.status == "ABSENT"
    ).count()
    return _format_lecture(db, lec, present_count, absent_count)

@router.post("", response_model=LectureOut, status_code=status.HTTP_201_CREATED)
def create_lecture(
    lecture_in: LectureCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_faculty_or_admin)
):
    course = db.query(Course).filter(Course.course_id == lecture_in.course_id).first()
    if not course:
        raise HTTPException(status_code=400, detail="Invalid course ID.")

    faculty = db.query(Faculty).filter(Faculty.faculty_id == lecture_in.faculty_id).first()
    if not faculty:
        raise HTTPException(status_code=400, detail="Invalid faculty ID.")

    _validate_course_faculty(course, lecture_in.faculty_id)

    if current_user.role == "FACULTY" and current_user.faculty_id != lecture_in.faculty_id:
        raise HTTPException(status_code=403, detail="Faculty can only create lectures assigned to themselves.")

    division = None
    if lecture_in.division_id is None:
        raise HTTPException(status_code=400, detail="Select the year, branch, and division for this lecture.")
    if lecture_in.division_id is not None:
        division = db.query(Division).filter(Division.division_id == lecture_in.division_id).first()
        if not division:
            raise HTTPException(status_code=400, detail="Select a valid division.")
        if course.assigned_divisions and lecture_in.division_id not in {item.division_id for item in course.assigned_divisions}:
            raise HTTPException(status_code=400, detail="Assign this class to the course before scheduling its lecture.")
        eligible_ids = {item.division_id for item in eligible_divisions_for_faculty(faculty)}
        if division.division_id not in eligible_ids:
            raise HTTPException(status_code=400, detail="This faculty member is not assigned to teach the selected year, branch, and division.")
    elif course.assigned_divisions:
        raise HTTPException(status_code=400, detail="Select one of this course's assigned classes.")

    if lecture_in.end_time <= lecture_in.start_time:
        raise HTTPException(status_code=400, detail="Lecture end time must be after start time.")

    _ensure_start_is_future(lecture_in.date, lecture_in.start_time)

    if lecture_in.room_id is not None and not db.query(Room).filter(Room.room_id == lecture_in.room_id).first():
        raise HTTPException(status_code=400, detail="Select a valid room.")

    _ensure_no_schedule_conflict(
        db,
        lecture_date=lecture_in.date,
        start_time=lecture_in.start_time,
        end_time=lecture_in.end_time,
        faculty_id=lecture_in.faculty_id,
        room_id=lecture_in.room_id,
        division_id=division.division_id,
    )

    # Calculate duration in minutes if not provided
    duration = lecture_in.duration
    if not duration:
        t1 = datetime.combine(lecture_in.date, lecture_in.start_time)
        t2 = datetime.combine(lecture_in.date, lecture_in.end_time)
        duration = int((t2 - t1).total_seconds() / 60)

    lec = Lecture(
        course_id=lecture_in.course_id,
        faculty_id=lecture_in.faculty_id,
        room_id=lecture_in.room_id,
        date=lecture_in.date,
        start_time=lecture_in.start_time,
        end_time=lecture_in.end_time,
        duration=duration,
        topic=lecture_in.topic,
        status=lecture_in.status or "SCHEDULED"
    )
    db.add(lec)
    db.flush()
    if division:
        db.add(LectureDivision(lecture_id=lec.lecture_id, division_id=division.division_id))
    db.commit()
    db.refresh(lec)

    return get_lecture(lecture_id=lec.lecture_id, db=db, current_user=current_user)

@router.put("/{lecture_id}", response_model=LectureOut)
def update_lecture(
    lecture_id: int,
    lecture_in: LectureUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_faculty_or_admin)
):
    lec = db.query(Lecture).filter(Lecture.lecture_id == lecture_id).first()
    if not lec:
        raise HTTPException(status_code=404, detail="Lecture not found.")

    if current_user.role == "FACULTY" and current_user.faculty_id != lec.faculty_id:
        raise HTTPException(status_code=403, detail="Forbidden: You can only edit your own lectures.")

    target_course_id = lecture_in.course_id if lecture_in.course_id is not None else lec.course_id
    target_course = db.query(Course).filter(Course.course_id == target_course_id).first()
    if not target_course:
        raise HTTPException(status_code=400, detail="Select a valid course.")
    target_faculty_id = lecture_in.faculty_id if lecture_in.faculty_id is not None else lec.faculty_id
    target_faculty = db.query(Faculty).filter(Faculty.faculty_id == target_faculty_id).first()
    if not target_faculty:
        raise HTTPException(status_code=400, detail="Select a valid faculty member.")
    _validate_course_faculty(target_course, target_faculty_id)
    if current_user.role == "FACULTY" and current_user.faculty_id != target_faculty_id:
        raise HTTPException(status_code=403, detail="Faculty can only schedule lectures assigned to themselves.")

    if lecture_in.course_id:
        lec.course_id = lecture_in.course_id
    if lecture_in.faculty_id:
        lec.faculty_id = lecture_in.faculty_id
    if lecture_in.room_id is not None:
        lec.room_id = lecture_in.room_id
    if lecture_in.date:
        lec.date = lecture_in.date
    if lecture_in.start_time:
        lec.start_time = lecture_in.start_time
    if lecture_in.end_time:
        lec.end_time = lecture_in.end_time
    if lecture_in.topic is not None:
        lec.topic = lecture_in.topic
    if lecture_in.status is not None:
        lec.status = lecture_in.status

    assignment = db.query(LectureDivision).filter(LectureDivision.lecture_id == lec.lecture_id).first()
    target_division_id = lecture_in.division_id if lecture_in.division_id is not None else (assignment.division_id if assignment else None)
    if target_division_id is not None:
        division = db.query(Division).filter(Division.division_id == target_division_id).first()
        if not division:
            raise HTTPException(status_code=400, detail="Select a valid division.")
        if target_course.assigned_divisions and target_division_id not in {item.division_id for item in target_course.assigned_divisions}:
            raise HTTPException(status_code=400, detail="Assign this class to the course before scheduling its lecture.")
        eligible_ids = {item.division_id for item in eligible_divisions_for_faculty(target_faculty)}
        if division.division_id not in eligible_ids:
            raise HTTPException(status_code=400, detail="This faculty member is not assigned to teach the selected year, branch, and division.")
        if assignment:
            assignment.division_id = division.division_id
        else:
            db.add(LectureDivision(lecture_id=lec.lecture_id, division_id=division.division_id))
    elif lecture_in.course_id is not None or lecture_in.division_id is not None:
        raise HTTPException(status_code=400, detail="Select the year, branch, and division for this lecture.")

    if lec.end_time <= lec.start_time:
        raise HTTPException(status_code=400, detail="Lecture end time must be after start time.")
    if lecture_in.date is not None or lecture_in.start_time is not None:
        _ensure_start_is_future(lec.date, lec.start_time)
    if lec.room_id is not None and not db.query(Room).filter(Room.room_id == lec.room_id).first():
        raise HTTPException(status_code=400, detail="Select a valid room.")
    _ensure_no_schedule_conflict(
        db,
        lecture_date=lec.date,
        start_time=lec.start_time,
        end_time=lec.end_time,
        faculty_id=lec.faculty_id,
        room_id=lec.room_id,
        division_id=target_division_id,
        exclude_lecture_id=lec.lecture_id,
    )

    # Recalculate duration
    t1 = datetime.combine(lec.date, lec.start_time)
    t2 = datetime.combine(lec.date, lec.end_time)
    lec.duration = int((t2 - t1).total_seconds() / 60)

    db.commit()
    db.refresh(lec)
    return get_lecture(lecture_id=lec.lecture_id, db=db, current_user=current_user)

@router.delete("/{lecture_id}")
def delete_lecture(
    lecture_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_faculty_or_admin),
):
    lecture = db.query(Lecture).filter(Lecture.lecture_id == lecture_id).first()
    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found.")
    if current_user.role == "FACULTY" and current_user.faculty_id != lecture.faculty_id:
        raise HTTPException(status_code=403, detail="You can only delete your own scheduled lectures.")

    attendance_count = db.query(Attendance).filter(Attendance.lecture_id == lecture_id).count()
    db.query(Attendance).filter(Attendance.lecture_id == lecture_id).delete(synchronize_session=False)
    db.query(LectureDivision).filter(LectureDivision.lecture_id == lecture_id).delete(synchronize_session=False)
    db.delete(lecture)
    db.commit()
    return {"message": "Lecture deleted.", "attendance_records_deleted": attendance_count}

@router.get("/{lecture_id}/students")
def get_lecture_students(
    lecture_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_faculty_or_admin),
):
    lecture = db.query(Lecture).filter(Lecture.lecture_id == lecture_id).first()
    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found.")
    if current_user.role == "FACULTY" and current_user.faculty_id != lecture.faculty_id:
        raise HTTPException(status_code=403, detail="You can only view the roster for your own lectures.")
    division = _lecture_division(db, lecture_id)
    return [
        {
            "student_id": student.student_id,
            "dept_id": student.dept_id,
            "f_name": student.f_name,
            "m_name": student.m_name,
            "l_name": student.l_name,
            "full_name": student.full_name,
            "dob": student.dob,
            "roll_no": student.roll_no,
            "email": student.email,
            "dept_name": student.department.dept_name if student.department else None,
            "academic_year": division.academic_year if division else None,
            "branch": division.branch if division else None,
            "division_id": division.division_id if division else None,
            "division_name": division.division_name if division else None,
            "enrolled_courses_count": 0,
        }
        for student in _lecture_roster(db, lecture)
    ]

@router.get("/{lecture_id}/attendance", response_model=List[AttendanceOut])
def get_lecture_attendance(
    lecture_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_faculty_or_admin)
):
    lec = db.query(Lecture).filter(Lecture.lecture_id == lecture_id).first()
    if not lec:
        raise HTTPException(status_code=404, detail="Lecture not found.")
    if current_user.role == "FACULTY" and current_user.faculty_id != lec.faculty_id:
        raise HTTPException(status_code=403, detail="You can only view attendance for your own lectures.")

    records = db.query(Attendance).filter(Attendance.lecture_id == lecture_id).all()
    
    results = []
    for r in records:
        results.append(AttendanceOut(
            student_id=r.student_id,
            lecture_id=r.lecture_id,
            status=r.status,
            percentage=r.percentage,
            remarks=r.remarks,
            student_name=r.student.full_name if r.student else None,
            roll_no=r.student.roll_no if r.student else None,
            lecture_date=lec.date,
            course_title=lec.course.title if lec.course else None,
            marked_at=r.marked_at
        ))
    return results
