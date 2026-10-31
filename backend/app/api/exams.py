from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
from app.database import get_db
from app.models.exam import Exam, ExamDivision
from app.models.course import Course
from app.models.faculty import Faculty
from app.models.result import Result
from app.models.enrollment import Enrollment
from app.models.division import Division, StudentDivision
from app.models.student import Student
from app.schemas.exam import ExamCreate, ExamUpdate, ExamOut
from app.schemas.result import ResultOut
from app.api.deps import require_faculty_or_admin, get_current_user
from app.models.user import User

router = APIRouter(prefix="/exams", tags=["Examinations"])

def _exam_division(db: Session, exam_id: int):
    assignment = db.query(ExamDivision).filter(ExamDivision.exam_id == exam_id).first()
    return assignment.division if assignment else None

def _exam_students(db: Session, exam: Exam):
    assignment = db.query(ExamDivision).filter(ExamDivision.exam_id == exam.exam_id).first()
    if assignment:
        return db.query(Student).join(
            StudentDivision, StudentDivision.student_id == Student.student_id
        ).filter(StudentDivision.division_id == assignment.division_id).order_by(Student.roll_no).all()
    return db.query(Student).join(
        Enrollment, Enrollment.student_id == Student.student_id
    ).filter(
        Enrollment.course_id == exam.course_id,
        Enrollment.status == "ENROLLED",
    ).order_by(Student.roll_no).all()

def _format_exam(db: Session, exam: Exam) -> ExamOut:
    results = db.query(Result).filter(Result.exam_id == exam.exam_id).all()
    average = round(sum(result.marks for result in results) / len(results), 2) if results else None
    division = _exam_division(db, exam.exam_id)
    return ExamOut(
        exam_id=exam.exam_id,
        course_id=exam.course_id,
        faculty_id=exam.faculty_id,
        exam_type=exam.exam_type,
        exam_date=exam.exam_date,
        max_marks=exam.max_marks,
        grade=exam.grade,
        course_title=exam.course.title if exam.course else None,
        course_code=exam.course.course_code if exam.course else None,
        faculty_name=exam.faculty.full_name if exam.faculty else None,
        total_results=len(results),
        average_marks=average,
        division_id=division.division_id if division else None,
        academic_year=division.academic_year if division else None,
        branch=division.branch if division else None,
        division_name=division.division_name if division else None,
    )

@router.get("", response_model=List[ExamOut])
def list_exams(
    course_id: Optional[int] = None,
    faculty_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Exam)
    if course_id:
        query = query.filter(Exam.course_id == course_id)
    if faculty_id:
        query = query.filter(Exam.faculty_id == faculty_id)

    # Students see exams assigned to their current division, plus legacy course exams.
    if current_user.role == "STUDENT":
        if not current_user.student_id:
            raise HTTPException(status_code=400, detail="Your account is not linked to a student profile.")
        enrolled_course_ids = [
            row[0] for row in db.query(Enrollment.course_id).filter(
                Enrollment.student_id == current_user.student_id,
                Enrollment.status == "ENROLLED"
            ).all()
        ]
        student_division_id = db.query(StudentDivision.division_id).filter(
            StudentDivision.student_id == current_user.student_id
        ).scalar()
        query = query.outerjoin(ExamDivision, ExamDivision.exam_id == Exam.exam_id)
        if student_division_id:
            query = query.filter(or_(
                ExamDivision.division_id == student_division_id,
                and_(ExamDivision.exam_id.is_(None), Exam.course_id.in_(enrolled_course_ids)),
            ))
        else:
            query = query.filter(ExamDivision.exam_id.is_(None), Exam.course_id.in_(enrolled_course_ids))

    exams = query.order_by(Exam.exam_date.desc()).all()

    results = []
    for ex in exams:
        results.append(_format_exam(db, ex))
    return results

@router.get("/{exam_id}", response_model=ExamOut)
def get_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ex = db.query(Exam).filter(Exam.exam_id == exam_id).first()
    if not ex:
        raise HTTPException(status_code=404, detail="Exam not found.")
    if current_user.role == "STUDENT":
        assignment = db.query(ExamDivision).filter(ExamDivision.exam_id == ex.exam_id).first()
        if assignment:
            allowed = db.query(StudentDivision).filter(
                StudentDivision.student_id == current_user.student_id,
                StudentDivision.division_id == assignment.division_id,
            ).first() is not None
        else:
            allowed = db.query(Enrollment).filter(
                Enrollment.student_id == current_user.student_id,
                Enrollment.course_id == ex.course_id,
                Enrollment.status == "ENROLLED",
            ).first() is not None
        if not allowed:
            raise HTTPException(status_code=403, detail="This exam is not assigned to your class or courses.")
    return _format_exam(db, ex)

@router.get("/{exam_id}/students")
def get_exam_students(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_faculty_or_admin),
):
    exam = db.query(Exam).filter(Exam.exam_id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found.")
    if current_user.role == "FACULTY" and exam.faculty_id and current_user.faculty_id != exam.faculty_id:
        raise HTTPException(status_code=403, detail="You can only view students for your own exams.")
    division = _exam_division(db, exam_id)
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
        for student in _exam_students(db, exam)
    ]

@router.post("", response_model=ExamOut, status_code=status.HTTP_201_CREATED)
def create_exam(
    exam_in: ExamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_faculty_or_admin)
):
    course = db.query(Course).filter(Course.course_id == exam_in.course_id).first()
    if not course:
        raise HTTPException(status_code=400, detail="Invalid course ID.")

    faculty_id = exam_in.faculty_id
    if current_user.role == "FACULTY":
        faculty_id = current_user.faculty_id
    if faculty_id and course.assigned_faculty and faculty_id not in {member.faculty_id for member in course.assigned_faculty}:
        raise HTTPException(status_code=400, detail="The selected faculty member is not assigned to this course.")

    division = None
    if course.assigned_divisions and exam_in.division_id is None:
        raise HTTPException(status_code=400, detail="Select one of this course's assigned classes.")
    if exam_in.division_id is not None:
        division = db.query(Division).filter(Division.division_id == exam_in.division_id).first()
        if not division:
            raise HTTPException(status_code=400, detail="Select a valid year, branch, and division.")
        if course.assigned_divisions and exam_in.division_id not in {item.division_id for item in course.assigned_divisions}:
            raise HTTPException(status_code=400, detail="Assign this class to the course before scheduling its exam.")

    exam = Exam(
        course_id=exam_in.course_id,
        faculty_id=faculty_id,
        exam_type=exam_in.exam_type,
        exam_date=exam_in.exam_date,
        max_marks=exam_in.max_marks,
        grade=exam_in.grade
    )
    db.add(exam)
    db.flush()
    if division:
        db.add(ExamDivision(exam_id=exam.exam_id, division_id=division.division_id))
    db.commit()
    db.refresh(exam)
    return get_exam(exam_id=exam.exam_id, db=db, current_user=current_user)

@router.put("/{exam_id}", response_model=ExamOut)
def update_exam(
    exam_id: int,
    exam_in: ExamUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_faculty_or_admin)
):
    ex = db.query(Exam).filter(Exam.exam_id == exam_id).first()
    if not ex:
        raise HTTPException(status_code=404, detail="Exam not found.")

    if current_user.role == "FACULTY" and ex.faculty_id and current_user.faculty_id != ex.faculty_id:
        raise HTTPException(status_code=403, detail="Forbidden: You can only edit your own exams.")

    if exam_in.course_id:
        ex.course_id = exam_in.course_id
    if exam_in.exam_type is not None:
        ex.exam_type = exam_in.exam_type
    if exam_in.exam_date is not None:
        ex.exam_date = exam_in.exam_date
    if exam_in.max_marks is not None:
        ex.max_marks = exam_in.max_marks
    if exam_in.grade is not None:
        ex.grade = exam_in.grade

    if "division_id" in exam_in.model_fields_set:
        target_course = db.query(Course).filter(Course.course_id == ex.course_id).first()
        assignment = db.query(ExamDivision).filter(ExamDivision.exam_id == ex.exam_id).first()
        if exam_in.division_id is None:
            if assignment:
                db.delete(assignment)
        else:
            division = db.query(Division).filter(Division.division_id == exam_in.division_id).first()
            if not division:
                raise HTTPException(status_code=400, detail="Select a valid year, branch, and division.")
            if target_course and target_course.assigned_divisions and exam_in.division_id not in {item.division_id for item in target_course.assigned_divisions}:
                raise HTTPException(status_code=400, detail="Assign this class to the course before scheduling its exam.")
            if assignment:
                assignment.division_id = division.division_id
            else:
                db.add(ExamDivision(exam_id=ex.exam_id, division_id=division.division_id))

    db.commit()
    db.refresh(ex)
    return get_exam(exam_id=ex.exam_id, db=db, current_user=current_user)

@router.delete("/{exam_id}")
def delete_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_faculty_or_admin)
):
    ex = db.query(Exam).filter(Exam.exam_id == exam_id).first()
    if not ex:
        raise HTTPException(status_code=404, detail="Exam not found.")

    db.query(ExamDivision).filter(ExamDivision.exam_id == exam_id).delete(synchronize_session=False)
    db.delete(ex)
    db.commit()
    return {"message": f"Exam #{exam_id} deleted successfully."}
