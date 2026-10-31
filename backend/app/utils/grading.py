def calculate_grade(marks: float, max_marks: float = 100.0) -> str:
    """
    Standard college grading scale based on percentage:
    >= 90%: A+ (Outstanding)
    >= 80%: A  (Excellent)
    >= 70%: B+ (Very Good)
    >= 60%: B  (Good)
    >= 50%: C  (Average)
    >= 40%: D  (Pass)
    < 40%:  F  (Fail)
    """
    if max_marks <= 0:
        return "F"
    percentage = (marks / max_marks) * 100.0
    if percentage >= 90.0:
        return "A+"
    elif percentage >= 80.0:
        return "A"
    elif percentage >= 70.0:
        return "B+"
    elif percentage >= 60.0:
        return "B"
    elif percentage >= 50.0:
        return "C"
    elif percentage >= 40.0:
        return "D"
    else:
        return "F"
