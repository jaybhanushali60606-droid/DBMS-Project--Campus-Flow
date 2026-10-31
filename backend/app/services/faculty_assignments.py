from typing import List

from app.models.division import Division
from app.models.faculty import Faculty


def eligible_divisions_for_faculty(faculty: Faculty) -> List[Division]:
    """Use explicit teaching groups, falling back to legacy course class assignments."""
    explicit = [assignment.division for assignment in faculty.teaching_groups if assignment.division]
    if explicit:
        return explicit

    by_id = {
        division.division_id: division
        for course in faculty.taught_courses
        for division in course.assigned_divisions
    }
    return list(by_id.values())
