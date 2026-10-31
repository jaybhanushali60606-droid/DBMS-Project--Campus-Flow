from datetime import time, date
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from fastapi import HTTPException, status
from app.models.schedule import Schedule
from app.models.room import Room
from app.models.faculty import Faculty

def check_time_overlap(start1: time, end1: time, start2: time, end2: time) -> bool:
    """Returns True if [start1, end1) and [start2, end2) overlap."""
    return max(start1, start2) < min(end1, end2)

def validate_schedule_allocation(
    db: Session,
    room_id: int,
    day_of_week: str,
    start_time: time,
    end_time: time,
    schedule_date: Optional[date] = None,
    faculty_id: Optional[int] = None,
    exclude_schedule_id: Optional[int] = None
):
    if end_time <= start_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End time must be strictly after start time."
        )

    # 1. Check Room Existence
    room = db.query(Room).filter(Room.room_id == room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Room with ID {room_id} does not exist."
        )

    # 2. Check Room Overlap Conflicts
    room_query = db.query(Schedule).filter(
        Schedule.room_id == room_id,
        Schedule.day_of_week == day_of_week
    )
    if schedule_date:
        room_query = room_query.filter(
            or_(Schedule.schedule_date == schedule_date, Schedule.schedule_date.is_(None))
        )
    if exclude_schedule_id:
        room_query = room_query.filter(Schedule.schedule_id != exclude_schedule_id)

    existing_room_schedules = room_query.all()
    for sch in existing_room_schedules:
        if check_time_overlap(start_time, end_time, sch.start_time, sch.end_time):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Room scheduling conflict: Room '{room.room_number}' is already allocated to '{sch.title}' from {sch.start_time.strftime('%H:%M')} to {sch.end_time.strftime('%H:%M')} on {day_of_week}."
            )

    # 3. Check Faculty Overlap Conflicts
    if faculty_id:
        faculty = db.query(Faculty).filter(Faculty.faculty_id == faculty_id).first()
        faculty_name = faculty.full_name if faculty else f"ID {faculty_id}"
        
        faculty_query = db.query(Schedule).filter(
            Schedule.faculty_id == faculty_id,
            Schedule.day_of_week == day_of_week
        )
        if schedule_date:
            faculty_query = faculty_query.filter(
                or_(Schedule.schedule_date == schedule_date, Schedule.schedule_date.is_(None))
            )
        if exclude_schedule_id:
            faculty_query = faculty_query.filter(Schedule.schedule_id != exclude_schedule_id)

        existing_faculty_schedules = faculty_query.all()
        for sch in existing_faculty_schedules:
            if check_time_overlap(start_time, end_time, sch.start_time, sch.end_time):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Faculty scheduling conflict: Faculty member '{faculty_name}' is already scheduled for '{sch.title}' from {sch.start_time.strftime('%H:%M')} to {sch.end_time.strftime('%H:%M')} on {day_of_week}."
                )
