from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.database import get_db
from app.models.division import Division, LectureDivision, StudentDivision
from app.models.exam import ExamDivision
from app.models.course import course_divisions
from app.models.user import User
from app.models.faculty_assignment import FacultyTeachingGroup, FacultyDesignation
from app.schemas.division import DivisionCreate, DivisionOut

router = APIRouter(prefix="/divisions", tags=["Divisions"])


def _division_out(db: Session, division: Division) -> DivisionOut:
    return DivisionOut(
        division_id=division.division_id,
        academic_year=division.academic_year,
        branch=division.branch,
        division_name=division.division_name,
        students_count=db.query(StudentDivision).filter(StudentDivision.division_id == division.division_id).count(),
    )


@router.get("", response_model=List[DivisionOut])
def list_divisions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    divisions = db.query(Division).order_by(Division.academic_year, Division.branch, Division.division_name).all()
    return [_division_out(db, division) for division in divisions]


@router.post("", response_model=DivisionOut, status_code=201)
def create_division(payload: DivisionCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    division = Division(
        academic_year=payload.academic_year,
        branch=payload.branch,
        division_name=payload.division_name.strip().upper(),
    )
    db.add(division)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="This division already exists for the selected year and branch.") from exc
    db.refresh(division)
    return _division_out(db, division)


@router.delete("/{division_id}")
def delete_division(division_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    division = db.query(Division).filter(Division.division_id == division_id).first()
    if not division:
        raise HTTPException(status_code=404, detail="Division not found.")
    student_count = db.query(StudentDivision).filter(StudentDivision.division_id == division_id).count()
    lecture_count = db.query(LectureDivision).filter(LectureDivision.division_id == division_id).count()
    exam_count = db.query(ExamDivision).filter(ExamDivision.division_id == division_id).count()
    course_count = db.query(course_divisions).filter(course_divisions.c.division_id == division_id).count()
    faculty_count = db.query(FacultyTeachingGroup).filter(FacultyTeachingGroup.division_id == division_id).count()
    coordinator_count = db.query(FacultyDesignation).filter(FacultyDesignation.division_id == division_id).count()
    if student_count or lecture_count or exam_count or course_count or faculty_count or coordinator_count:
        raise HTTPException(status_code=409, detail="This division is in use. Reassign its students, faculty, lectures, courses, and exams before deleting it.")
    db.delete(division)
    db.commit()
    return {"message": "Division deleted."}
