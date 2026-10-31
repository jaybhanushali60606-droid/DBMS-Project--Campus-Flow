from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from app.database import get_db
from app.models.schedule import Schedule
from app.models.room import Room
from app.models.course import Course
from app.models.faculty import Faculty
from app.models.enrollment import Enrollment
from app.schemas.schedule import ScheduleCreate, ScheduleUpdate, ScheduleOut
from app.services.schedule_service import validate_schedule_allocation
from app.api.deps import require_admin, get_current_user
from app.models.user import User

router = APIRouter(prefix="/schedules", tags=["Classroom & Timetable Scheduling"])

def format_schedule_out(s: Schedule) -> ScheduleOut:
    return ScheduleOut(
        schedule_id=s.schedule_id,
        room_id=s.room_id,
        course_id=s.course_id,
        faculty_id=s.faculty_id,
        activity_type=s.activity_type,
        title=s.title,
        day_of_week=s.day_of_week,
        schedule_date=s.schedule_date,
        start_time=s.start_time,
        end_time=s.end_time,
        room_number=s.room.room_number if s.room else None,
        room_building=s.room.building if s.room else None,
        room_type=s.room.room_type if s.room else None,
        course_code=s.course.course_code if s.course else None,
        course_title=s.course.title if s.course else None,
        faculty_name=s.faculty.full_name if s.faculty else None
    )

@router.get("", response_model=List[ScheduleOut])
def list_schedules(
    day_of_week: Optional[str] = None,
    room_id: Optional[int] = None,
    faculty_id: Optional[int] = None,
    course_id: Optional[int] = None,
    activity_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Schedule)
    if day_of_week:
        query = query.filter(Schedule.day_of_week == day_of_week)
    if room_id:
        query = query.filter(Schedule.room_id == room_id)
    if faculty_id:
        query = query.filter(Schedule.faculty_id == faculty_id)
    if course_id:
        query = query.filter(Schedule.course_id == course_id)
    if activity_type:
        query = query.filter(Schedule.activity_type == activity_type)

    # For student, optionally filter to their enrolled courses
    if current_user.role == "STUDENT" and current_user.student_id:
        enrolled_ids = [
            row[0] for row in db.query(Enrollment.course_id).filter(
                Enrollment.student_id == current_user.student_id,
                Enrollment.status == "ENROLLED"
            ).all()
        ]
        # Include extracurricular or course-specific
        query = query.filter(
            (Schedule.course_id.in_(enrolled_ids)) | (Schedule.course_id.is_(None))
        )

    schedules = query.order_by(Schedule.start_time).all()
    return [format_schedule_out(s) for s in schedules]

@router.post("", response_model=ScheduleOut, status_code=status.HTTP_201_CREATED)
def create_schedule(
    sch_in: ScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    # Enforce conflict detection and manual allocation validation
    validate_schedule_allocation(
        db=db,
        room_id=sch_in.room_id,
        day_of_week=sch_in.day_of_week,
        start_time=sch_in.start_time,
        end_time=sch_in.end_time,
        schedule_date=sch_in.schedule_date,
        faculty_id=sch_in.faculty_id
    )

    schedule = Schedule(
        room_id=sch_in.room_id,
        course_id=sch_in.course_id,
        faculty_id=sch_in.faculty_id,
        activity_type=sch_in.activity_type,
        title=sch_in.title,
        day_of_week=sch_in.day_of_week,
        schedule_date=sch_in.schedule_date,
        start_time=sch_in.start_time,
        end_time=sch_in.end_time
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)

    return format_schedule_out(schedule)

@router.put("/{schedule_id}", response_model=ScheduleOut)
def update_schedule(
    schedule_id: int,
    sch_in: ScheduleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    schedule = db.query(Schedule).filter(Schedule.schedule_id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule entry not found.")

    target_room_id = sch_in.room_id or schedule.room_id
    target_day = sch_in.day_of_week or schedule.day_of_week
    target_start = sch_in.start_time or schedule.start_time
    target_end = sch_in.end_time or schedule.end_time
    target_date = sch_in.schedule_date if sch_in.schedule_date is not None else schedule.schedule_date
    target_faculty = sch_in.faculty_id if sch_in.faculty_id is not None else schedule.faculty_id

    validate_schedule_allocation(
        db=db,
        room_id=target_room_id,
        day_of_week=target_day,
        start_time=target_start,
        end_time=target_end,
        schedule_date=target_date,
        faculty_id=target_faculty,
        exclude_schedule_id=schedule.schedule_id
    )

    if sch_in.room_id:
        schedule.room_id = sch_in.room_id
    if sch_in.course_id is not None:
        schedule.course_id = sch_in.course_id
    if sch_in.faculty_id is not None:
        schedule.faculty_id = sch_in.faculty_id
    if sch_in.activity_type:
        schedule.activity_type = sch_in.activity_type
    if sch_in.title:
        schedule.title = sch_in.title
    if sch_in.day_of_week:
        schedule.day_of_week = sch_in.day_of_week
    if sch_in.schedule_date is not None:
        schedule.schedule_date = sch_in.schedule_date
    if sch_in.start_time:
        schedule.start_time = sch_in.start_time
    if sch_in.end_time:
        schedule.end_time = sch_in.end_time

    db.commit()
    db.refresh(schedule)
    return format_schedule_out(schedule)

@router.delete("/{schedule_id}")
def delete_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    schedule = db.query(Schedule).filter(Schedule.schedule_id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found.")

    db.delete(schedule)
    db.commit()
    return {"message": "Schedule entry deleted successfully."}

@router.get("/timetable/weekly")
def get_weekly_timetable(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    grid: Dict[str, List[Any]] = {d: [] for d in days}

    query = db.query(Schedule)
    if current_user.role == "FACULTY" and current_user.faculty_id:
        query = query.filter(Schedule.faculty_id == current_user.faculty_id)
    elif current_user.role == "STUDENT" and current_user.student_id:
        enrolled_ids = [
            row[0] for row in db.query(Enrollment.course_id).filter(
                Enrollment.student_id == current_user.student_id,
                Enrollment.status == "ENROLLED"
            ).all()
        ]
        query = query.filter(
            (Schedule.course_id.in_(enrolled_ids)) | (Schedule.course_id.is_(None))
        )

    schedules = query.order_by(Schedule.start_time).all()
    for s in schedules:
        if s.day_of_week in grid:
            grid[s.day_of_week].append(format_schedule_out(s).dict())

    return grid
