from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.room import Room
from app.models.schedule import Schedule
from app.schemas.room import RoomCreate, RoomUpdate, RoomOut
from app.api.deps import require_admin, get_current_user
from app.models.user import User

router = APIRouter(prefix="/rooms", tags=["Rooms"])

@router.get("", response_model=List[RoomOut])
def list_rooms(
    room_type: Optional[str] = None,
    building: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Room)
    if room_type:
        query = query.filter(Room.room_type == room_type)
    if building:
        query = query.filter(Room.building.ilike(f"%{building}%"))
    rooms = query.all()

    results = []
    for r in rooms:
        active_sch = db.query(Schedule).filter(Schedule.room_id == r.room_id).count()
        results.append(RoomOut(
            room_id=r.room_id,
            room_number=r.room_number,
            building=r.building,
            capacity=r.capacity,
            room_type=r.room_type,
            active_schedules_count=active_sch
        ))
    return results

@router.get("/{room_id}", response_model=RoomOut)
def get_room(
    room_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    r = db.query(Room).filter(Room.room_id == room_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Room not found.")

    active_sch = db.query(Schedule).filter(Schedule.room_id == r.room_id).count()
    return RoomOut(
        room_id=r.room_id,
        room_number=r.room_number,
        building=r.building,
        capacity=r.capacity,
        room_type=r.room_type,
        active_schedules_count=active_sch
    )

@router.post("", response_model=RoomOut, status_code=status.HTTP_201_CREATED)
def create_room(
    room_in: RoomCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    existing = db.query(Room).filter(Room.room_number.ilike(room_in.room_number)).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Room '{room_in.room_number}' already exists.")

    room = Room(
        room_number=room_in.room_number.strip(),
        building=room_in.building.strip(),
        capacity=room_in.capacity,
        room_type=room_in.room_type
    )
    db.add(room)
    db.commit()
    db.refresh(room)

    return RoomOut(
        room_id=room.room_id,
        room_number=room.room_number,
        building=room.building,
        capacity=room.capacity,
        room_type=room.room_type,
        active_schedules_count=0
    )

@router.put("/{room_id}", response_model=RoomOut)
def update_room(
    room_id: int,
    room_in: RoomUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    r = db.query(Room).filter(Room.room_id == room_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Room not found.")

    if room_in.room_number:
        existing = db.query(Room).filter(
            Room.room_number.ilike(room_in.room_number),
            Room.room_id != room_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Room number already in use.")
        r.room_number = room_in.room_number.strip()

    if room_in.building:
        r.building = room_in.building.strip()
    if room_in.capacity is not None:
        r.capacity = room_in.capacity
    if room_in.room_type:
        r.room_type = room_in.room_type

    db.commit()
    db.refresh(r)
    return get_room(room_id=r.room_id, db=db, current_user=current_user)

@router.delete("/{room_id}")
def delete_room(
    room_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    r = db.query(Room).filter(Room.room_id == room_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Room not found.")

    db.delete(r)
    db.commit()
    return {"message": f"Room '{r.room_number}' deleted successfully."}
