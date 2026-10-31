from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class AcademicSummaryReport(BaseModel):
    total_departments: int
    total_students: int
    total_faculty: int
    total_courses: int
    total_lectures_held: int
    total_attendance_records: int
    overall_attendance_average: float
    total_defaulters_count: int
    department_distribution: List[Dict[str, Any]]
    grade_distribution: Dict[str, int]
