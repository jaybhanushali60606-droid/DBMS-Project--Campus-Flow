from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.result import Result
from app.models.exam import Exam
from app.models.student import Student
from app.models.enrollment import Enrollment
from app.models.exam import ExamDivision
from app.models.division import StudentDivision
from app.schemas.result import ResultBulkSubmitRequest, ResultCreate, ResultUpdate, ResultOut
from app.utils.grading import calculate_grade
from app.api.deps import require_faculty_or_admin, get_current_user
from app.models.user import User

router = APIRouter(prefix="/results", tags=["Results"])

@router.get("", response_model=List[ResultOut])
def list_results(
    exam_id: Optional[int] = None,
    student_id: Optional[int] = None,
    course_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Result).join(Exam, Exam.exam_id == Result.exam_id).join(Student, Student.student_id == Result.student_id)

    # Privacy check for student
    if current_user.role == "STUDENT":
        query = query.filter(Result.student_id == current_user.student_id)
    elif student_id:
        query = query.filter(Result.student_id == student_id)

    if exam_id:
        query = query.filter(Result.exam_id == exam_id)
    if course_id:
        query = query.filter(Exam.course_id == course_id)

    results = query.all()
    output = []
    for r in results:
        max_m = r.exam.max_marks if r.exam else 100.0
        pct = round((r.marks / max_m) * 100.0, 2) if max_m > 0 else 0.0
        output.append(ResultOut(
            exam_id=r.exam_id,
            student_id=r.student_id,
            marks=r.marks,
            grade=r.grade,
            student_name=r.student.full_name if r.student else None,
            roll_no=r.student.roll_no if r.student else None,
            exam_type=r.exam.exam_type if r.exam else None,
            course_title=r.exam.course.title if r.exam and r.exam.course else None,
            course_code=r.exam.course.course_code if r.exam and r.exam.course else None,
            max_marks=max_m,
            percentage=pct,
            submitted_at=r.submitted_at
        ))
    return output

@router.post("/bulk")
def bulk_submit_results(
    req: ResultBulkSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_faculty_or_admin)
):
    exam = db.query(Exam).filter(Exam.exam_id == req.exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found.")
    if not req.results:
        raise HTTPException(status_code=400, detail="Enter marks for at least one student before saving results.")

    if current_user.role == "FACULTY" and exam.faculty_id and current_user.faculty_id != exam.faculty_id:
        raise HTTPException(status_code=403, detail="Forbidden: You can only submit marks for your own exams.")

    exam_division = db.query(ExamDivision).filter(ExamDivision.exam_id == exam.exam_id).first()
    if exam_division:
        eligible_ids = set(row[0] for row in db.query(StudentDivision.student_id).filter(
            StudentDivision.division_id == exam_division.division_id
        ).all())
    else:
        eligible_ids = set(row[0] for row in db.query(Enrollment.student_id).filter(
            Enrollment.course_id == exam.course_id,
            Enrollment.status == "ENROLLED"
        ).all())

    saved_count = 0
    for r in req.results:
        if r.student_id not in eligible_ids:
            student = db.query(Student).filter(Student.student_id == r.student_id).first()
            s_name = student.full_name if student else f"ID {r.student_id}"
            raise HTTPException(
                status_code=400,
                detail=f"Student {s_name} is not assigned to this exam's class roster."
            )

        if r.marks < 0 or r.marks > exam.max_marks:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid marks {r.marks}: Marks must be between 0 and maximum marks ({exam.max_marks})."
            )

        grade = r.grade or calculate_grade(r.marks, exam.max_marks)

        existing = db.query(Result).filter(
            Result.exam_id == req.exam_id,
            Result.student_id == r.student_id
        ).first()

        if existing:
            existing.marks = r.marks
            existing.grade = grade
        else:
            new_res = Result(
                exam_id=req.exam_id,
                student_id=r.student_id,
                marks=r.marks,
                grade=grade
            )
            db.add(new_res)
        saved_count += 1

    db.commit()
    return {"message": f"Successfully recorded/updated {saved_count} results for Exam #{exam.exam_id}."}

@router.delete("/{exam_id}/{student_id}")
def delete_result(
    exam_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_faculty_or_admin)
):
    res = db.query(Result).filter(
        Result.exam_id == exam_id,
        Result.student_id == student_id
    ).first()
    if not res:
        raise HTTPException(status_code=404, detail="Result record not found.")

    db.delete(res)
    db.commit()
    return {"message": "Result record deleted successfully."}

@router.get("/my-results", response_model=List[ResultOut])
def get_my_results(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "STUDENT" or not current_user.student_id:
        raise HTTPException(status_code=400, detail="Current user is not linked to a student profile.")

    return list_results(student_id=current_user.student_id, db=db, current_user=current_user)
