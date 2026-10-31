from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta, timezone
import re
import unicodedata
from app.database import get_db
from app.models.student import Student
from app.models.department import Department
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.user import User
from app.models.division import Division, StudentDivision
from app.schemas.student import StudentCreate, StudentUpdate, StudentOut, StudentCourseEnrollRequest
from app.schemas.course import CourseOut
from app.schemas.attendance import StudentCourseAttendanceSummary
from app.schemas.result import ResultOut
from app.services.attendance_service import get_student_all_courses_attendance
from app.utils.security import get_password_hash
from app.api.deps import require_admin, get_current_user

router = APIRouter(prefix="/students", tags=["Students"])

_BRANCH_ROLL_PREFIX = {"CE": "CE", "CSE": "CS", "EXTC": "EX"}

def _email_name_part(value: str) -> str:
    ascii_name = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    cleaned = re.sub(r"[^a-z0-9]", "", ascii_name.lower())
    return cleaned[:24] or "student"

def _generate_student_email(db: Session, student: Student) -> str:
    ist = timezone(timedelta(hours=5, minutes=30))
    year_suffix = f"{datetime.now(ist).year % 100:02d}"
    stem = f"{_email_name_part(student.f_name)}.{_email_name_part(student.l_name)}{year_suffix}.{student.student_id:06d}"
    candidate = f"{stem}@spit.ac.in"
    discriminator = 1
    while (
        db.query(Student).filter(func.lower(Student.email) == candidate.lower()).first()
        or db.query(User).filter(func.lower(User.email) == candidate.lower()).first()
    ):
        discriminator += 1
        candidate = f"{stem}.{discriminator}@spit.ac.in"
    return candidate

def _valid_roll_for_branch(roll_no: Optional[str], branch: str) -> bool:
    prefix = _BRANCH_ROLL_PREFIX.get(branch)
    return bool(prefix and roll_no and re.fullmatch(rf"{prefix}\d{{7}}", roll_no, re.IGNORECASE))

def _generate_roll_no(db: Session, branch: str) -> str:
    prefix = _BRANCH_ROLL_PREFIX.get(branch)
    if not prefix:
        raise HTTPException(status_code=400, detail="No UID prefix is configured for this branch.")
    # IST has no daylight-saving changes; using the explicit UTC+05:30 offset
    # avoids relying on an OS timezone database (which may be absent on Windows).
    ist = timezone(timedelta(hours=5, minutes=30))
    year = datetime.now(ist).year
    stem = f"{prefix}{year}"
    used = set()
    for (roll,) in db.query(Student.roll_no).filter(Student.roll_no.like(f"{stem}%")).all():
        match = re.fullmatch(rf"{re.escape(stem)}(\d{{3}})", roll or "", re.IGNORECASE)
        if match:
            used.add(int(match.group(1)))
    for suffix in range(1, 1000):
        candidate = f"{stem}{suffix:03d}"
        if suffix not in used and not db.query(User).filter(func.lower(User.username) == candidate.lower()).first():
            return candidate
    raise HTTPException(status_code=409, detail=f"No UID numbers remain for {branch} in {year}.")

def _student_out(db: Session, student: Student) -> StudentOut:
    assignment = db.query(StudentDivision).filter(StudentDivision.student_id == student.student_id).first()
    division = assignment.division if assignment else None
    return StudentOut(
        student_id=student.student_id,
        dept_id=student.dept_id,
        f_name=student.f_name,
        m_name=student.m_name,
        l_name=student.l_name,
        full_name=student.full_name,
        dob=student.dob,
        roll_no=student.roll_no,
        email=student.email,
        dept_name=student.department.dept_name if student.department else None,
        enrolled_courses_count=db.query(Enrollment).filter(
            Enrollment.student_id == student.student_id,
            Enrollment.status == "ENROLLED"
        ).count(),
        academic_year=division.academic_year if division else None,
        branch=division.branch if division else None,
        division_id=division.division_id if division else None,
        division_name=division.division_name if division else None,
    )

@router.get("", response_model=List[StudentOut])
def list_students(
    dept_id: Optional[int] = None,
    search: Optional[str] = None,
    academic_year: Optional[int] = None,
    branch: Optional[str] = None,
    division_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Student)
    if academic_year is not None or branch is not None or division_id is not None:
        query = query.join(StudentDivision, StudentDivision.student_id == Student.student_id).join(
            Division, Division.division_id == StudentDivision.division_id
        )
        if academic_year is not None:
            query = query.filter(Division.academic_year == academic_year)
        if branch:
            query = query.filter(Division.branch == branch)
        if division_id is not None:
            query = query.filter(Division.division_id == division_id)
    if dept_id:
        query = query.filter(Student.dept_id == dept_id)
    if search:
        for token in search.strip().split():
            search_filter = f"%{token}%"
            query = query.filter(
                (Student.f_name.ilike(search_filter)) |
                (Student.m_name.ilike(search_filter)) |
                (Student.l_name.ilike(search_filter)) |
                (Student.roll_no.ilike(search_filter)) |
                (Student.email.ilike(search_filter))
            )
    students = query.distinct().all()

    return [_student_out(db, student) for student in students]

@router.get("/{student_id}", response_model=StudentOut)
def get_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Enforce Student privacy: Student role can only access their own student_id
    if current_user.role == "STUDENT" and current_user.student_id != student_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: You cannot view records of other students."
        )

    s = db.query(Student).filter(Student.student_id == student_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Student not found.")

    return _student_out(db, s)

@router.post("", response_model=StudentOut, status_code=status.HTTP_201_CREATED)
def create_student(
    student_in: StudentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    dept = db.query(Department).filter(Department.dept_id == student_in.dept_id).first()
    if not dept:
        raise HTTPException(status_code=400, detail="Invalid department ID.")

    division = db.query(Division).filter(Division.division_id == student_in.division_id).first()
    if not division:
        raise HTTPException(status_code=400, detail="Select a valid year, branch, and division first.")

    roll_no = _generate_roll_no(db, division.branch)

    if student_in.create_user_account:
        if not student_in.password:
            raise HTTPException(status_code=400, detail="Set a login password for the student.")
        username = roll_no
        email = None
        if db.query(User).filter(
            func.lower(User.username) == username
        ).first():
            raise HTTPException(status_code=400, detail="This generated UID is already used by a login account. Please retry.")

    student = Student(
        dept_id=student_in.dept_id,
        f_name=student_in.f_name,
        m_name=student_in.m_name,
        l_name=student_in.l_name,
        dob=student_in.dob,
        roll_no=roll_no,
        email=None
    )
    db.add(student)
    db.flush()
    if student_in.create_user_account:
        student.email = _generate_student_email(db, student)
    db.add(StudentDivision(student_id=student.student_id, division_id=division.division_id))

    # Create a linked student login with the password set by the administrator.
    if student_in.create_user_account:
        user = User(
            username=student.roll_no.strip(),
            email=student.email,
            hashed_password=get_password_hash(student_in.password),
            role="STUDENT",
            student_id=student.student_id
        )
        db.add(user)

    db.commit()
    db.refresh(student)

    return _student_out(db, student)

@router.put("/{student_id}", response_model=StudentOut)
def update_student(
    student_id: int,
    student_in: StudentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    s = db.query(Student).filter(Student.student_id == student_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Student not found.")

    if student_in.dept_id:
        dept = db.query(Department).filter(Department.dept_id == student_in.dept_id).first()
        if not dept:
            raise HTTPException(status_code=400, detail="Invalid department ID.")
        s.dept_id = student_in.dept_id

    if student_in.f_name is not None:
        s.f_name = student_in.f_name
    if student_in.m_name is not None:
        s.m_name = student_in.m_name
    if student_in.l_name is not None:
        s.l_name = student_in.l_name
    if student_in.dob is not None:
        s.dob = student_in.dob
    if student_in.email is not None:
        s.email = student_in.email

    if student_in.division_id is not None:
        division = db.query(Division).filter(Division.division_id == student_in.division_id).first()
        if not division:
            raise HTTPException(status_code=400, detail="Select a valid year, branch, and division.")
        assignment = db.query(StudentDivision).filter(StudentDivision.student_id == s.student_id).first()
        if assignment:
            assignment.division_id = division.division_id
        else:
            db.add(StudentDivision(student_id=s.student_id, division_id=division.division_id))

    assigned_division = db.query(StudentDivision).filter(StudentDivision.student_id == s.student_id).first()
    assigned_division = assigned_division.division if assigned_division else None
    if assigned_division and not _valid_roll_for_branch(s.roll_no, assigned_division.branch):
        s.roll_no = _generate_roll_no(db, assigned_division.branch)

    linked_user = db.query(User).filter(User.student_id == student_id).first()
    normalized_uid = s.roll_no.strip().lower() if s.roll_no else None
    normalized_email = s.email.strip().lower() if s.email else None

    if linked_user and normalized_uid:
        duplicate_username = db.query(User).filter(
            func.lower(User.username) == normalized_uid,
            User.user_id != linked_user.user_id,
        ).first()
        if duplicate_username:
            raise HTTPException(status_code=400, detail="This UID is already used by another login account.")
        linked_user.username = s.roll_no.strip()

    if linked_user and normalized_email:
        duplicate_email = db.query(User).filter(
            func.lower(User.email) == normalized_email,
            User.user_id != linked_user.user_id,
        ).first()
        if duplicate_email:
            raise HTTPException(status_code=400, detail="This email is already used by another login account.")
        linked_user.email = normalized_email

    if student_in.password:
        if not normalized_uid or not normalized_email:
            raise HTTPException(status_code=400, detail="A student UID and email are required to create a login account.")
        if linked_user:
            linked_user.hashed_password = get_password_hash(student_in.password)
        else:
            existing_account = db.query(User).filter(
                (func.lower(User.username) == normalized_uid) | (func.lower(User.email) == normalized_email)
            ).first()
            if existing_account:
                raise HTTPException(status_code=400, detail="A login account already uses this UID or email.")
            db.add(User(
                username=s.roll_no.strip(),
                email=normalized_email,
                hashed_password=get_password_hash(student_in.password),
                role="STUDENT",
                student_id=s.student_id,
            ))

    db.commit()
    db.refresh(s)
    return get_student(student_id=s.student_id, db=db, current_user=current_user)

@router.delete("/{student_id}")
def delete_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    s = db.query(Student).filter(Student.student_id == student_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Student not found.")

    # Remove linked user account
    user = db.query(User).filter(User.student_id == student_id).first()
    if user:
        db.delete(user)

    db.delete(s)
    db.commit()
    return {"message": f"Student '{s.full_name}' deleted successfully."}

@router.post("/{student_id}/enroll")
def enroll_student_in_courses(
    student_id: int,
    enroll_req: StudentCourseEnrollRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    requested_ids = set(enroll_req.course_ids)
    existing_enrollments = db.query(Enrollment).filter(Enrollment.student_id == student_id).all()
    existing_by_course = {enrollment.course_id: enrollment for enrollment in existing_enrollments}

    for enrollment in existing_enrollments:
        if enrollment.course_id not in requested_ids and enrollment.status == "ENROLLED":
            enrollment.status = "DROPPED"

    for course_id in requested_ids:
        course = db.query(Course).filter(Course.course_id == course_id).first()
        if not course:
            continue
        existing = existing_by_course.get(course_id)
        if existing:
            existing.status = "ENROLLED"
        else:
            db.add(Enrollment(student_id=student_id, course_id=course_id, status="ENROLLED"))
    db.commit()
    return {"message": f"Successfully updated course enrollments for {student.full_name}."}

@router.get("/{student_id}/courses", response_model=List[CourseOut])
def get_student_courses(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "STUDENT" and current_user.student_id != student_id:
        raise HTTPException(status_code=403, detail="Forbidden: You cannot view other students' courses.")

    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    courses = db.query(Course).join(Enrollment, Enrollment.course_id == Course.course_id).filter(
        Enrollment.student_id == student_id,
        Enrollment.status == "ENROLLED"
    ).all()

    return [
        CourseOut(
            course_id=c.course_id,
            dept_id=c.dept_id,
            course_code=c.course_code,
            title=c.title,
            credits=c.credits,
            dept_name=c.department.dept_name if c.department else None,
            enrolled_students_count=len(c.enrolled_students),
            assigned_faculty_count=len(c.assigned_faculty)
        )
        for c in courses
    ]

@router.get("/{student_id}/attendance", response_model=List[StudentCourseAttendanceSummary])
def get_student_attendance_records(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "STUDENT" and current_user.student_id != student_id:
        raise HTTPException(status_code=403, detail="Forbidden: You cannot view another student's attendance records.")

    return get_student_all_courses_attendance(db=db, student_id=student_id)
