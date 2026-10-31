from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.department import Department
from app.models.faculty import Faculty
from app.models.student import Student
from app.models.course import Course
from app.schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentOut
from app.api.deps import require_admin, get_current_user
from app.models.user import User

router = APIRouter(prefix="/departments", tags=["Departments"])

@router.get("", response_model=List[DepartmentOut])
def list_departments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    depts = db.query(Department).all()
    results = []
    for d in depts:
        head_faculty = db.query(Faculty).filter(Faculty.faculty_id == d.head_id).first() if d.head_id else None
        student_count = db.query(Student).filter(Student.dept_id == d.dept_id).count()
        faculty_count = db.query(Faculty).filter(Faculty.dept_id == d.dept_id).count()
        course_count = db.query(Course).filter(Course.dept_id == d.dept_id).count()

        results.append(DepartmentOut(
            dept_id=d.dept_id,
            dept_name=d.dept_name,
            building=d.building,
            head_id=d.head_id,
            head_name=head_faculty.full_name if head_faculty else None,
            student_count=student_count,
            faculty_count=faculty_count,
            course_count=course_count
        ))
    return results

@router.get("/{dept_id}", response_model=DepartmentOut)
def get_department(
    dept_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    d = db.query(Department).filter(Department.dept_id == dept_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Department not found.")

    head_faculty = db.query(Faculty).filter(Faculty.faculty_id == d.head_id).first() if d.head_id else None
    student_count = db.query(Student).filter(Student.dept_id == d.dept_id).count()
    faculty_count = db.query(Faculty).filter(Faculty.dept_id == d.dept_id).count()
    course_count = db.query(Course).filter(Course.dept_id == d.dept_id).count()

    return DepartmentOut(
        dept_id=d.dept_id,
        dept_name=d.dept_name,
        building=d.building,
        head_id=d.head_id,
        head_name=head_faculty.full_name if head_faculty else None,
        student_count=student_count,
        faculty_count=faculty_count,
        course_count=course_count
    )

@router.post("", response_model=DepartmentOut, status_code=status.HTTP_201_CREATED)
def create_department(
    dept_in: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    existing = db.query(Department).filter(Department.dept_name.ilike(dept_in.dept_name)).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Department with name '{dept_in.dept_name}' already exists.")

    if dept_in.head_id:
        head = db.query(Faculty).filter(Faculty.faculty_id == dept_in.head_id).first()
        if not head:
            raise HTTPException(status_code=400, detail="Specified head faculty member not found.")

    dept = Department(
        dept_name=dept_in.dept_name,
        building=dept_in.building,
        head_id=dept_in.head_id
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)

    return DepartmentOut(
        dept_id=dept.dept_id,
        dept_name=dept.dept_name,
        building=dept.building,
        head_id=dept.head_id,
        head_name=None,
        student_count=0,
        faculty_count=0,
        course_count=0
    )

@router.put("/{dept_id}", response_model=DepartmentOut)
def update_department(
    dept_id: int,
    dept_in: DepartmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    dept = db.query(Department).filter(Department.dept_id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found.")

    if dept_in.dept_name and dept_in.dept_name != dept.dept_name:
        existing = db.query(Department).filter(Department.dept_name.ilike(dept_in.dept_name)).first()
        if existing:
            raise HTTPException(status_code=400, detail="Department name already in use.")
        dept.dept_name = dept_in.dept_name

    if dept_in.building:
        dept.building = dept_in.building

    if dept_in.head_id is not None:
        if dept_in.head_id > 0:
            head = db.query(Faculty).filter(Faculty.faculty_id == dept_in.head_id).first()
            if not head:
                raise HTTPException(status_code=400, detail="Head faculty not found.")
            dept.head_id = dept_in.head_id
        else:
            dept.head_id = None

    db.commit()
    db.refresh(dept)
    return get_department(dept_id=dept.dept_id, db=db, current_user=current_user)

@router.delete("/{dept_id}")
def delete_department(
    dept_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    dept = db.query(Department).filter(Department.dept_id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found.")

    # Guard against accidental deletion of populated departments
    stu_count = db.query(Student).filter(Student.dept_id == dept_id).count()
    fac_count = db.query(Faculty).filter(Faculty.dept_id == dept_id).count()
    crs_count = db.query(Course).filter(Course.dept_id == dept_id).count()

    if stu_count > 0 or fac_count > 0 or crs_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete department with active dependencies ({stu_count} students, {fac_count} faculty, {crs_count} courses). Reassign or remove them first."
        )

    db.delete(dept)
    db.commit()
    return {"message": f"Department '{dept.dept_name}' successfully deleted."}
