from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List, Optional, Sequence
import re
import unicodedata
from datetime import datetime, timedelta, timezone
from app.database import get_db
from app.models.faculty import Faculty
from app.models.division import Division
from app.models.faculty_assignment import FacultyProfile, FacultyTeachingGroup, FacultyDesignation
from app.models.department import Department
from app.models.course import Course
from app.models.enrollment import faculty_courses
from app.models.user import User
from app.models.lecture import Lecture
from app.models.exam import Exam
from app.models.student import Student
from app.schemas.faculty import FacultyCreate, FacultyUpdate, FacultyOut
from app.schemas.course import CourseOut, FacultyAssignRequest
from app.utils.security import get_password_hash
from app.api.deps import require_admin, get_current_user
from app.services.faculty_assignments import eligible_divisions_for_faculty

router = APIRouter(prefix="/faculty", tags=["Faculty"])

ADMINISTRATIVE_ROLES = {
    "Head of Department",
    "Dean",
    "Principal",
    "Exam Controller",
    "Class Coordinator",
}

def _faculty_email_part(value: str) -> str:
    ascii_name = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    # Keep the local part below the users.username limit even for long names.
    return re.sub(r"[^a-z0-9]", "", ascii_name.lower())[:18] or "faculty"

def _generate_faculty_email(db: Session, faculty: Faculty) -> str:
    india_tz = timezone(timedelta(hours=5, minutes=30))
    year_suffix = f"{datetime.now(india_tz).year % 100:02d}"
    stem = f"{_faculty_email_part(faculty.f_name)}.{_faculty_email_part(faculty.l_name)}{year_suffix}.{faculty.faculty_id:06d}"
    candidate = f"{stem}@spit.ac.in"
    collision_suffix = 1
    while (
        db.query(Faculty).filter(Faculty.faculty_id != faculty.faculty_id, func.lower(Faculty.email) == candidate.lower()).first()
        or db.query(Student).filter(func.lower(Student.email) == candidate.lower()).first()
        or db.query(User).filter(func.lower(User.email) == candidate.lower()).first()
    ):
        collision_suffix += 1
        candidate = f"{stem}.{collision_suffix}@spit.ac.in"
    return candidate

def _effective_admin_roles(faculty: Faculty) -> List[str]:
    roles = {assignment.title for assignment in faculty.administrative_designations}
    if faculty.designation == "Professor & HOD" or (faculty.department and faculty.department.head_id == faculty.faculty_id):
        roles.add("Head of Department")
    return sorted(roles)

def _validate_role_inputs(
    db: Session,
    *,
    dept_id: int,
    faculty_id: Optional[int],
    roles: Sequence[str],
    coordinator_division_ids: Sequence[int],
    eligible_division_ids: Sequence[int],
) -> List[int]:
    normalized_roles = list(dict.fromkeys(roles))
    unknown = set(normalized_roles) - ADMINISTRATIVE_ROLES
    if unknown:
        raise HTTPException(status_code=400, detail=f"Unsupported administrative designation: {', '.join(sorted(unknown))}.")

    coordinator_ids = list(dict.fromkeys(coordinator_division_ids))
    if "Class Coordinator" in normalized_roles:
        if not coordinator_ids:
            raise HTTPException(status_code=400, detail="Choose at least one class group for the Class Coordinator role.")
        if not set(coordinator_ids).issubset(set(eligible_division_ids)):
            raise HTTPException(status_code=400, detail="A Class Coordinator must also be eligible to teach the selected class group.")
    elif coordinator_ids:
        raise HTTPException(status_code=400, detail="Class groups can only be selected for the Class Coordinator role.")

    if "Head of Department" in normalized_roles:
        department = db.query(Department).filter(Department.dept_id == dept_id).first()
        if department and department.head_id not in (None, faculty_id):
            raise HTTPException(status_code=409, detail="This department already has a Head of Department. Reassign the department head first.")

    if "Principal" in normalized_roles:
        existing_principal = db.query(FacultyDesignation).filter(
            FacultyDesignation.title == "Principal",
            FacultyDesignation.faculty_id != faculty_id if faculty_id is not None else True,
        ).first()
        if existing_principal:
            raise HTTPException(status_code=409, detail="A Principal is already assigned to this college.")

    if "Class Coordinator" in normalized_roles:
        conflicts = db.query(FacultyDesignation).filter(
            FacultyDesignation.title == "Class Coordinator",
            FacultyDesignation.division_id.in_(coordinator_ids),
            FacultyDesignation.faculty_id != faculty_id if faculty_id is not None else True,
        ).first()
        if conflicts:
            raise HTTPException(status_code=409, detail="One of the selected class groups already has a Class Coordinator.")
    return coordinator_ids

def _faculty_out(f: Faculty) -> FacultyOut:
    eligible_divisions = eligible_divisions_for_faculty(f)
    raw_designation = f.designation
    academic_designation = "Professor" if raw_designation == "Professor & HOD" else raw_designation
    admin_roles = _effective_admin_roles(f)
    coordinator_ids = [
        assignment.division_id for assignment in f.administrative_designations
        if assignment.title == "Class Coordinator" and assignment.division_id is not None
    ]
    return FacultyOut(
        faculty_id=f.faculty_id,
        dept_id=f.dept_id,
        f_name=f.f_name,
        m_name=f.m_name,
        l_name=f.l_name,
        full_name=f.full_name,
        designation=academic_designation,
        email=f.email,
        dept_name=f.department.dept_name if f.department else None,
        specialization=f.profile.specialization if f.profile else "",
        assigned_courses=[{
            "course_id": course.course_id,
            "course_code": course.course_code,
            "title": course.title,
        } for course in f.taught_courses],
        assigned_divisions=[{
            "division_id": division.division_id,
            "academic_year": division.academic_year,
            "branch": division.branch,
            "division_name": division.division_name,
        } for division in eligible_divisions],
        eligible_division_ids=[division.division_id for division in eligible_divisions],
        administrative_roles=admin_roles,
        coordinator_division_ids=coordinator_ids,
    )

def _validate_division_ids(db: Session, division_ids: List[int]) -> List[Division]:
    unique_ids = list(dict.fromkeys(division_ids))
    divisions = db.query(Division).filter(Division.division_id.in_(unique_ids)).all() if unique_ids else []
    if len(divisions) != len(unique_ids):
        raise HTTPException(status_code=400, detail="One or more selected year, branch, or division groups no longer exist.")
    if any(not re.fullmatch(r"[A-Z]", division.division_name or "") for division in divisions):
        raise HTTPException(status_code=400, detail="Faculty can only be assigned to valid single-letter divisions.")
    return divisions

def _validate_course_ids(db: Session, dept_id: int, course_ids: Sequence[int]) -> List[Course]:
    unique_ids = list(dict.fromkeys(course_ids))
    courses = db.query(Course).filter(Course.course_id.in_(unique_ids)).all() if unique_ids else []
    if len(courses) != len(unique_ids):
        raise HTTPException(status_code=400, detail="One or more selected courses no longer exist.")
    if any(course.dept_id not in (None, dept_id) for course in courses):
        raise HTTPException(status_code=400, detail="Faculty can only be assigned courses from their department.")
    return courses

@router.get("", response_model=List[FacultyOut])
def list_faculty(
    dept_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Faculty)
    if dept_id:
        query = query.filter(Faculty.dept_id == dept_id)
    faculties = query.all()

    return [_faculty_out(f) for f in faculties]

@router.get("/{faculty_id}", response_model=FacultyOut)
def get_faculty_member(
    faculty_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    f = db.query(Faculty).filter(Faculty.faculty_id == faculty_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Faculty member not found.")

    return _faculty_out(f)

@router.post("", response_model=FacultyOut, status_code=status.HTTP_201_CREATED)
def create_faculty(
    faculty_in: FacultyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    dept = db.query(Department).filter(Department.dept_id == faculty_in.dept_id).first()
    if not dept:
        raise HTTPException(status_code=400, detail="Invalid department ID.")

    teaching_divisions = _validate_division_ids(db, faculty_in.division_ids)
    division_ids = [division.division_id for division in teaching_divisions]
    coordinator_ids = _validate_role_inputs(
        db,
        dept_id=faculty_in.dept_id,
        faculty_id=None,
        roles=faculty_in.administrative_roles,
        coordinator_division_ids=faculty_in.coordinator_division_ids,
        eligible_division_ids=division_ids,
    )
    assigned_courses = _validate_course_ids(db, faculty_in.dept_id, faculty_in.course_ids)

    faculty = Faculty(
        dept_id=faculty_in.dept_id,
        f_name=faculty_in.f_name,
        m_name=faculty_in.m_name,
        l_name=faculty_in.l_name,
        designation=faculty_in.designation,
        email=None,
    )
    db.add(faculty)
    db.flush()
    faculty.email = _generate_faculty_email(db, faculty)
    if faculty_in.specialization:
        db.add(FacultyProfile(faculty_id=faculty.faculty_id, specialization=faculty_in.specialization.strip()))
    faculty.taught_courses = assigned_courses
    for division in teaching_divisions:
        db.add(FacultyTeachingGroup(faculty_id=faculty.faculty_id, division_id=division.division_id))
    for role in dict.fromkeys(faculty_in.administrative_roles):
        if role == "Class Coordinator":
            for coordinator_division_id in coordinator_ids:
                db.add(FacultyDesignation(faculty_id=faculty.faculty_id, title=role, division_id=coordinator_division_id))
        else:
            db.add(FacultyDesignation(faculty_id=faculty.faculty_id, title=role))
    if "Head of Department" in faculty_in.administrative_roles:
        dept.head_id = faculty.faculty_id

    if faculty_in.create_user_account:
        username = faculty.email.split("@")[0].lower()
        counter = 1
        base_username = username
        while db.query(User).filter(User.username == username).first():
            username = f"{base_username}{counter}"
            counter += 1

        user = User(
            username=username,
            email=faculty.email,
            hashed_password=get_password_hash(faculty_in.password or "faculty123"),
            role="FACULTY",
            faculty_id=faculty.faculty_id
        )
        db.add(user)
    db.commit()
    db.refresh(faculty)

    return _faculty_out(faculty)

@router.put("/{faculty_id}", response_model=FacultyOut)
def update_faculty(
    faculty_id: int,
    faculty_in: FacultyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    f = db.query(Faculty).filter(Faculty.faculty_id == faculty_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Faculty member not found.")

    old_dept_id = f.dept_id
    target_dept_id = faculty_in.dept_id if faculty_in.dept_id is not None else f.dept_id
    target_dept = db.query(Department).filter(Department.dept_id == target_dept_id).first()
    if not target_dept:
        raise HTTPException(status_code=400, detail="Invalid department ID.")

    current_roles = _effective_admin_roles(f)
    roles = faculty_in.administrative_roles if faculty_in.administrative_roles is not None else current_roles
    current_coordinator_ids = [
        assignment.division_id for assignment in f.administrative_designations
        if assignment.title == "Class Coordinator" and assignment.division_id is not None
    ]
    if faculty_in.coordinator_division_ids is not None:
        coordinator_ids_input = faculty_in.coordinator_division_ids
    elif "Class Coordinator" in roles:
        coordinator_ids_input = current_coordinator_ids
    else:
        coordinator_ids_input = []

    if faculty_in.division_ids is not None:
        teaching_divisions = _validate_division_ids(db, faculty_in.division_ids)
        eligible_division_ids = [division.division_id for division in teaching_divisions]
    else:
        teaching_divisions = eligible_divisions_for_faculty(f)
        eligible_division_ids = [division.division_id for division in teaching_divisions]

    coordinator_ids = _validate_role_inputs(
        db,
        dept_id=target_dept_id,
        faculty_id=faculty_id,
        roles=roles,
        coordinator_division_ids=coordinator_ids_input,
        eligible_division_ids=eligible_division_ids,
    )

    if faculty_in.f_name is not None:
        f.f_name = faculty_in.f_name
    if faculty_in.m_name is not None:
        f.m_name = faculty_in.m_name
    if faculty_in.l_name is not None:
        f.l_name = faculty_in.l_name
    if faculty_in.designation is not None:
        f.designation = faculty_in.designation
    f.dept_id = target_dept_id

    if faculty_in.specialization is not None:
        specialization = faculty_in.specialization.strip()
        if len(specialization) < 2:
            raise HTTPException(status_code=400, detail="Enter the faculty member’s subject specialization.")
        profile = db.query(FacultyProfile).filter(FacultyProfile.faculty_id == faculty_id).first()
        if profile:
            profile.specialization = specialization
        else:
            db.add(FacultyProfile(faculty_id=faculty_id, specialization=specialization))
    if faculty_in.course_ids is not None:
        f.taught_courses = _validate_course_ids(db, target_dept_id, faculty_in.course_ids)
    if faculty_in.division_ids is not None:
        f.teaching_groups.clear()
        db.flush()
        f.teaching_groups.extend(
            FacultyTeachingGroup(faculty_id=faculty_id, division_id=division.division_id)
            for division in teaching_divisions
        )

    roles_changed = faculty_in.administrative_roles is not None or faculty_in.coordinator_division_ids is not None
    was_department_head = db.query(Department).filter(Department.dept_id == old_dept_id, Department.head_id == faculty_id).first()
    if was_department_head and (old_dept_id != target_dept_id or "Head of Department" not in roles):
        was_department_head.head_id = None
    if "Head of Department" in roles:
        target_dept.head_id = faculty_id

    if roles_changed:
        f.administrative_designations.clear()
        db.flush()
        for role in dict.fromkeys(roles):
            if role == "Class Coordinator":
                for coordinator_division_id in coordinator_ids:
                    f.administrative_designations.append(FacultyDesignation(
                        faculty_id=faculty_id,
                        title=role,
                        division_id=coordinator_division_id,
                    ))
            else:
                f.administrative_designations.append(FacultyDesignation(faculty_id=faculty_id, title=role))

    db.commit()
    db.refresh(f)
    return get_faculty_member(faculty_id=f.faculty_id, db=db, current_user=current_user)

@router.delete("/{faculty_id}")
def delete_faculty(
    faculty_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    f = db.query(Faculty).filter(Faculty.faculty_id == faculty_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Faculty member not found.")

    # Historical lectures remain linked, so they must be reassigned before this profile is removed.
    lec_count = db.query(Lecture).filter(Lecture.faculty_id == faculty_id).count()
    exam_count = db.query(Exam).filter(Exam.faculty_id == faculty_id).count()
    if lec_count or exam_count:
        linked_records = []
        if lec_count:
            linked_records.append(f"{lec_count} lecture(s)")
        if exam_count:
            linked_records.append(f"{exam_count} exam(s)")
        raise HTTPException(
            status_code=409,
            detail=f"Cannot remove this faculty member while {' and '.join(linked_records)} are linked. Reassign those records first; this keeps academic history intact.",
        )

    department = db.query(Department).filter(Department.head_id == faculty_id).first()
    if department:
        department.head_id = None

    # Remove user account if exists
    user = db.query(User).filter(User.faculty_id == faculty_id).first()
    if user:
        db.delete(user)

    faculty_name = f.full_name
    db.delete(f)
    db.commit()
    return {"message": f"Faculty member '{faculty_name}' deleted successfully."}

@router.get("/{faculty_id}/courses", response_model=List[CourseOut])
def get_faculty_courses(
    faculty_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    f = db.query(Faculty).filter(Faculty.faculty_id == faculty_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Faculty member not found.")

    courses = f.taught_courses
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
