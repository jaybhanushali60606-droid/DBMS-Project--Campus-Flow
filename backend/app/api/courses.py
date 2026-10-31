from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from app.database import get_db
from app.models.course import Course, course_divisions
from app.models.division import Division, StudentDivision
from app.models.department import Department
from app.models.faculty import Faculty
from app.models.student import Student
from app.models.enrollment import Enrollment, faculty_courses
from app.models.lecture import Lecture
from app.models.exam import Exam
from app.schemas.course import CourseCreate, CourseUpdate, CourseOut, FacultyAssignRequest, CourseDivisionAssignRequest
from app.schemas.student import StudentOut
from app.schemas.faculty import FacultyOut
from app.api.deps import require_admin, get_current_user
from app.models.user import User
from app.services.faculty_assignments import eligible_divisions_for_faculty

router = APIRouter(prefix="/courses", tags=["Courses"])

def _course_out(db: Session, course: Course) -> CourseOut:
    if course.assigned_divisions:
        division_ids = [division.division_id for division in course.assigned_divisions]
        student_count = db.query(StudentDivision.student_id).filter(
            StudentDivision.division_id.in_(division_ids)
        ).count()
    else:
        student_count = db.query(Enrollment).filter(
            Enrollment.course_id == course.course_id,
            Enrollment.status == "ENROLLED",
        ).count()
    return CourseOut(
        course_id=course.course_id,
        dept_id=course.dept_id,
        course_code=course.course_code,
        title=course.title,
        credits=course.credits,
        dept_name=course.department.dept_name if course.department else None,
        enrolled_students_count=student_count,
        assigned_faculty_count=len(course.assigned_faculty),
        assigned_faculty=[{
            "faculty_id": faculty.faculty_id,
            "full_name": faculty.full_name,
            "designation": faculty.designation,
            "dept_name": faculty.department.dept_name if faculty.department else None,
            "specialization": faculty.profile.specialization if faculty.profile else "",
            "eligible_division_ids": [division.division_id for division in eligible_divisions_for_faculty(faculty)],
        } for faculty in course.assigned_faculty],
        assigned_divisions=[{
            "division_id": division.division_id,
            "academic_year": division.academic_year,
            "branch": division.branch,
            "division_name": division.division_name,
            "students_count": db.query(StudentDivision).filter(
                StudentDivision.division_id == division.division_id
            ).count(),
        } for division in course.assigned_divisions],
    )

@router.get("", response_model=List[CourseOut])
def list_courses(
    dept_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Course)
    if dept_id:
        query = query.filter(Course.dept_id == dept_id)
    if current_user.role == "FACULTY":
        if not current_user.faculty_id:
            return []
        query = query.join(faculty_courses, faculty_courses.c.course_id == Course.course_id).filter(
            faculty_courses.c.faculty_id == current_user.faculty_id
        )
    elif current_user.role == "STUDENT":
        if not current_user.student_id:
            return []
        enrolled_course_ids = db.query(Enrollment.course_id).filter(
            Enrollment.student_id == current_user.student_id,
            Enrollment.status == "ENROLLED",
        )
        student_division_ids = db.query(StudentDivision.division_id).filter(
            StudentDivision.student_id == current_user.student_id
        )
        division_course_ids = db.query(course_divisions.c.course_id).filter(
            course_divisions.c.division_id.in_(student_division_ids)
        )
        query = query.filter(or_(Course.course_id.in_(enrolled_course_ids), Course.course_id.in_(division_course_ids)))
    courses = query.all()

    return [_course_out(db, course) for course in courses]

@router.get("/{course_id}", response_model=CourseOut)
def get_course(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    c = db.query(Course).filter(Course.course_id == course_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Course not found.")

    return _course_out(db, c)

@router.post("", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
def create_course(
    course_in: CourseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    dept = db.query(Department).filter(Department.dept_id == course_in.dept_id).first() if course_in.dept_id else None
    if course_in.dept_id and not dept:
        raise HTTPException(status_code=400, detail="Invalid department ID.")

    existing = db.query(Course).filter(Course.course_code.ilike(course_in.course_code)).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Course with code '{course_in.course_code}' already exists.")

    course = Course(
        dept_id=course_in.dept_id,
        course_code=course_in.course_code.upper().strip(),
        title=course_in.title.strip(),
        credits=course_in.credits
    )
    db.add(course)
    db.commit()
    db.refresh(course)

    return _course_out(db, course)

@router.put("/{course_id}", response_model=CourseOut)
def update_course(
    course_id: int,
    course_in: CourseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    course = db.query(Course).filter(Course.course_id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")

    if course_in.dept_id is not None:
        dept = db.query(Department).filter(Department.dept_id == course_in.dept_id).first()
        if not dept:
            raise HTTPException(status_code=400, detail="Invalid department ID.")
        course.dept_id = course_in.dept_id

    if course_in.course_code:
        existing = db.query(Course).filter(
            Course.course_code.ilike(course_in.course_code),
            Course.course_id != course_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Course code already in use.")
        course.course_code = course_in.course_code.upper().strip()

    if course_in.title is not None:
        course.title = course_in.title.strip()
    if course_in.credits is not None:
        course.credits = course_in.credits

    db.commit()
    db.refresh(course)
    return get_course(course_id=course.course_id, db=db, current_user=current_user)

@router.delete("/{course_id}")
def delete_course(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    course = db.query(Course).filter(Course.course_id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")

    lec_count = db.query(Lecture).filter(Lecture.course_id == course_id).count()
    exam_count = db.query(Exam).filter(Exam.course_id == course_id).count()
    if lec_count > 0 or exam_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete course with active records ({lec_count} lectures, {exam_count} exams)."
        )

    db.execute(course_divisions.delete().where(course_divisions.c.course_id == course_id))
    db.execute(faculty_courses.delete().where(faculty_courses.c.course_id == course_id))
    db.delete(course)
    db.commit()
    return {"message": f"Course '{course.course_code}' deleted successfully."}

@router.post("/{course_id}/assign-faculty")
def assign_faculty_to_course(
    course_id: int,
    req: FacultyAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    course = db.query(Course).filter(Course.course_id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")

    faculty_ids = list(dict.fromkeys(req.faculty_ids))
    faculty_members = db.query(Faculty).filter(Faculty.faculty_id.in_(faculty_ids)).all() if faculty_ids else []
    if len(faculty_members) != len(faculty_ids):
        raise HTTPException(status_code=400, detail="One or more selected faculty members were not found.")
    course.assigned_faculty = faculty_members
    db.commit()
    return {"message": f"Successfully assigned {len(faculty_members)} faculty member(s) to course {course.course_code}."}

@router.get("/{course_id}/faculty", response_model=List[FacultyOut])
def get_course_faculty(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    course = db.query(Course).filter(Course.course_id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")
    return course.assigned_faculty

@router.post("/{course_id}/assign-divisions")
def assign_course_divisions(
    course_id: int,
    req: CourseDivisionAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    course = db.query(Course).filter(Course.course_id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")
    division_ids = list(dict.fromkeys(req.division_ids))
    divisions = db.query(Division).filter(Division.division_id.in_(division_ids)).all() if division_ids else []
    if len(divisions) != len(division_ids):
        raise HTTPException(status_code=400, detail="One or more selected year/branch/divisions were not found.")
    course.assigned_divisions = divisions
    db.commit()
    return {"message": f"{course.course_code} assigned to {len(divisions)} class division(s)."}

@router.get("/{course_id}/students", response_model=List[StudentOut])
def get_course_enrolled_students(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    course = db.query(Course).filter(Course.course_id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found.")

    if course.assigned_divisions:
        division_ids = [division.division_id for division in course.assigned_divisions]
        students = db.query(Student).join(
            StudentDivision, StudentDivision.student_id == Student.student_id
        ).filter(StudentDivision.division_id.in_(division_ids)).distinct().all()
    else:
        students = db.query(Student).join(Enrollment, Enrollment.student_id == Student.student_id).filter(
            Enrollment.course_id == course_id,
            Enrollment.status == "ENROLLED"
        ).all()

    return [
        StudentOut(
            student_id=s.student_id,
            dept_id=s.dept_id,
            f_name=s.f_name,
            m_name=s.m_name,
            l_name=s.l_name,
            full_name=s.full_name,
            dob=s.dob,
            roll_no=s.roll_no,
            email=s.email,
            dept_name=s.department.dept_name if s.department else None,
            enrolled_courses_count=len(s.enrolled_courses),
            academic_year=s.division_assignment.division.academic_year if s.division_assignment and s.division_assignment.division else None,
            branch=s.division_assignment.division.branch if s.division_assignment and s.division_assignment.division else None,
            division_id=s.division_assignment.division_id if s.division_assignment else None,
            division_name=s.division_assignment.division.division_name if s.division_assignment and s.division_assignment.division else None,
        )
        for s in students
    ]
