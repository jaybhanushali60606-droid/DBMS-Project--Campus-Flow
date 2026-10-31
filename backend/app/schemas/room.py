from pydantic import BaseModel, ConfigDict
from typing import Optional

class RoomBase(BaseModel):
    room_number: str
    building: str
    capacity: int = 40
    room_type: str = "CLASSROOM"  # CLASSROOM, LABORATORY, ACTIVITY_SPACE, SEMINAR_HALL

class RoomCreate(RoomBase):
    pass

class RoomUpdate(BaseModel):
    room_number: Optional[str] = None
    building: Optional[str] = None
    capacity: Optional[int] = None
    room_type: Optional[str] = None

class RoomOut(RoomBase):
    model_config = ConfigDict(from_attributes=True)

    room_id: int
    active_schedules_count: Optional[int] = 0
