import os
import sys
from datetime import date, time, timedelta

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, SessionLocal, Base
from app.models.department import Department
from app.models.faculty import Faculty
from app.models.course import Course
from app.models.student import Student
from app.models.enrollment import Enrollment, faculty_courses
from app.models.room import Room
from app.models.lecture import Lecture
from app.models.attendance import Attendance
from app.models.exam import Exam
from app.models.result import Result
from app.models.schedule import Schedule
from app.models.user import User
from app.utils.security import get_password_hash
from app.utils.grading import calculate_grade

def seed_database():
    print("--- Initializing CampusFlow Database Schema ---")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Clear existing data in reverse order of foreign keys
    print("Cleaning any existing records...")
    db.query(Attendance).delete()
    db.query(Result).delete()
    db.query(Schedule).delete()
    db.query(Lecture).delete()
    db.query(Exam).delete()
    db.query(Enrollment).delete()
    db.execute(faculty_courses.delete())
    db.query(User).delete()
    db.query(Student).delete()
    db.query(Course).delete()
    
    # Temporarily set head_id to None before removing faculty
    db.query(Department).update({"head_id": None})
    db.commit()
    db.query(Faculty).delete()
    db.query(Department).delete()
    db.query(Room).delete()
    db.commit()

    print("Seeding Departments...")
    d_cse = Department(dept_name="Computer Science & Engineering", building="Alan Turing Block")
    d_it = Department(dept_name="Information Technology", building="Grace Hopper Block")
    d_ece = Department(dept_name="Electronics & Communication", building="Claude Shannon Block")
    db.add_all([d_cse, d_it, d_ece])
    db.commit()
    db.refresh(d_cse)
    db.refresh(d_it)
    db.refresh(d_ece)

    print("Seeding Faculty...")
    f1 = Faculty(
        dept_id=d_cse.dept_id,
        f_name="Robert",
        m_name="A.",
        l_name="Smith",
        designation="Professor & HOD",
        email="dr.smith@campusflow.edu"
    )
    f2 = Faculty(
        dept_id=d_cse.dept_id,
        f_name="Sarah",
        m_name="J.",
        l_name="Connor",
        designation="Associate Professor",
        email="sarah.connor@campusflow.edu"
    )
    f3 = Faculty(
        dept_id=d_it.dept_id,
        f_name="Elena",
        m_name="",
        l_name="Vance",
        designation="Assistant Professor",
        email="elena.vance@campusflow.edu"
    )
    f4 = Faculty(
        dept_id=d_ece.dept_id,
        f_name="Vikram",
        m_name="K.",
        l_name="Sharma",
        designation="Professor",
        email="vikram.sharma@campusflow.edu"
    )
    db.add_all([f1, f2, f3, f4])
    db.commit()
    db.refresh(f1)
    db.refresh(f2)
    db.refresh(f3)
    db.refresh(f4)

    # Assign Department Heads
    d_cse.head_id = f1.faculty_id
    d_it.head_id = f3.faculty_id
    d_ece.head_id = f4.faculty_id
    db.commit()

    print("Seeding Rooms...")
    r1 = Room(room_number="Hall 101", building="Alan Turing Block", capacity=60, room_type="CLASSROOM")
    r2 = Room(room_number="Hall 102", building="Alan Turing Block", capacity=60, room_type="CLASSROOM")
    r3 = Room(room_number="Lab 201", building="Grace Hopper Block", capacity=35, room_type="LABORATORY")
    r4 = Room(room_number="Seminar Hall A", building="Central Block", capacity=120, room_type="SEMINAR_HALL")
    r5 = Room(room_number="Activity Room 3", building="Student Center", capacity=40, room_type="ACTIVITY_SPACE")
    db.add_all([r1, r2, r3, r4, r5])
    db.commit()
    db.refresh(r1)
    db.refresh(r2)
    db.refresh(r3)
    db.refresh(r4)
    db.refresh(r5)

    print("Seeding Courses...")
    c1 = Course(dept_id=d_cse.dept_id, course_code="CS101", title="Database Management Systems", credits=4)
    c2 = Course(dept_id=d_cse.dept_id, course_code="CS102", title="Data Structures & Algorithms", credits=4)
    c3 = Course(dept_id=d_cse.dept_id, course_code="CS103", title="Operating Systems", credits=3)
    c4 = Course(dept_id=d_it.dept_id, course_code="IT201", title="Computer Networks", credits=3)
    c5 = Course(dept_id=d_it.dept_id, course_code="IT202", title="Software Engineering", credits=3)
    db.add_all([c1, c2, c3, c4, c5])
    db.commit()
    db.refresh(c1)
    db.refresh(c2)
    db.refresh(c3)
    db.refresh(c4)
    db.refresh(c5)

    print("Assigning Faculty to Courses...")
    db.execute(faculty_courses.insert().values([
        {"faculty_id": f1.faculty_id, "course_id": c1.course_id},
        {"faculty_id": f2.faculty_id, "course_id": c2.course_id},
        {"faculty_id": f2.faculty_id, "course_id": c3.course_id},
        {"faculty_id": f3.faculty_id, "course_id": c4.course_id},
        {"faculty_id": f3.faculty_id, "course_id": c5.course_id},
    ]))
    db.commit()

    print("Seeding Students...")
    students_data = [
        # (f_name, m_name, l_name, dob, roll_no, email, dept)
        ("Alex", "T.", "Johnson", date(2004, 5, 14), "CS202601", "alex.johnson@campusflow.edu", d_cse),
        ("Maria", "L.", "Garcia", date(2004, 8, 22), "CS202602", "maria.garcia@campusflow.edu", d_cse), # Intended defaulter
        ("Liam", "R.", "Chen", date(2003, 11, 3), "CS202603", "liam.chen@campusflow.edu", d_cse),
        ("Sophia", "M.", "Patel", date(2004, 2, 19), "CS202604", "sophia.patel@campusflow.edu", d_cse),
        ("David", "W.", "Miller", date(2003, 7, 30), "CS202605", "david.miller@campusflow.edu", d_cse), # Intended defaulter
        ("Emma", "K.", "Watson", date(2004, 9, 12), "IT202601", "emma.watson@campusflow.edu", d_it),
        ("James", "H.", "Wilson", date(2004, 3, 25), "IT202602", "james.wilson@campusflow.edu", d_it),
        ("Aisha", "B.", "Khan", date(2004, 6, 17), "IT202603", "aisha.khan@campusflow.edu", d_it), # Intended defaulter
        ("Lucas", "G.", "Martin", date(2003, 12, 5), "ECE202601", "lucas.martin@campusflow.edu", d_ece),
        ("Chloe", "D.", "Brown", date(2004, 1, 15), "ECE202602", "chloe.brown@campusflow.edu", d_ece),
    ]

    created_students = []
    for fn, mn, ln, dob, roll, em, dept in students_data:
        s = Student(
            dept_id=dept.dept_id,
            f_name=fn,
            m_name=mn,
            l_name=ln,
            dob=dob,
            roll_no=roll,
            email=em
        )
        db.add(s)
        created_students.append(s)
    db.commit()
    for s in created_students:
        db.refresh(s)

    print("Enrolling Students into Courses...")
    # CSE students in CS101, CS102, CS103
    enrollments_to_add = []
    for s in created_students[:5]:
        enrollments_to_add.append(Enrollment(student_id=s.student_id, course_id=c1.course_id))
        enrollments_to_add.append(Enrollment(student_id=s.student_id, course_id=c2.course_id))
        enrollments_to_add.append(Enrollment(student_id=s.student_id, course_id=c3.course_id))

    # IT students in IT201, IT202, CS101
    for s in created_students[5:8]:
        enrollments_to_add.append(Enrollment(student_id=s.student_id, course_id=c4.course_id))
        enrollments_to_add.append(Enrollment(student_id=s.student_id, course_id=c5.course_id))
        enrollments_to_add.append(Enrollment(student_id=s.student_id, course_id=c1.course_id))

    # ECE students in CS101
    for s in created_students[8:]:
        enrollments_to_add.append(Enrollment(student_id=s.student_id, course_id=c1.course_id))

    db.add_all(enrollments_to_add)
    db.commit()

    print("Seeding Class Schedules & Room Allocations...")
    schedules = [
        Schedule(room_id=r1.room_id, course_id=c1.course_id, faculty_id=f1.faculty_id, activity_type="LECTURE", title="CS101 Database Systems Theory", day_of_week="Monday", start_time=time(9, 0), end_time=time(10, 0)),
        Schedule(room_id=r1.room_id, course_id=c2.course_id, faculty_id=f2.faculty_id, activity_type="LECTURE", title="CS102 Data Structures Lecture", day_of_week="Monday", start_time=time(10, 30), end_time=time(11, 30)),
        Schedule(room_id=r3.room_id, course_id=c1.course_id, faculty_id=f1.faculty_id, activity_type="LAB", title="CS101 SQL Lab Practice", day_of_week="Tuesday", start_time=time(14, 0), end_time=time(16, 0)),
        Schedule(room_id=r2.room_id, course_id=c4.course_id, faculty_id=f3.faculty_id, activity_type="LECTURE", title="IT201 Computer Networks", day_of_week="Wednesday", start_time=time(11, 0), end_time=time(12, 0)),
        Schedule(room_id=r5.room_id, course_id=None, faculty_id=None, activity_type="EXTRACURRICULAR", title="CampusFlow Tech & Robotics Club", day_of_week="Friday", start_time=time(16, 0), end_time=time(18, 0)),
    ]
    db.add_all(schedules)
    db.commit()

    print("Seeding Lectures & Real Attendance Records...")
    # Generate 10 completed lectures for CS101 in current month
    today = date.today()
    current_month = today.month
    current_year = today.year

    cs101_students = [s for s in created_students if s in [created_students[0], created_students[1], created_students[2], created_students[3], created_students[4]]]
    
    lecture_dates = []
    # Generate dates across current month
    for day in range(1, min(25, today.day if today.day > 5 else 20)):
        if day % 2 == 1:  # Mon/Wed/Fri pattern
            try:
                lecture_dates.append(date(current_year, current_month, day))
            except ValueError:
                pass

    if len(lecture_dates) < 6:
        lecture_dates = [
            date(current_year, current_month, 2),
            date(current_year, current_month, 4),
            date(current_year, current_month, 7),
            date(current_year, current_month, 9),
            date(current_year, current_month, 11),
            date(current_year, current_month, 14),
        ]

    for idx, ldate in enumerate(lecture_dates, 1):
        lec = Lecture(
            course_id=c1.course_id,
            faculty_id=f1.faculty_id,
            room_id=r1.room_id,
            date=ldate,
            start_time=time(9, 0),
            end_time=time(10, 0),
            duration=60,
            topic=f"Topic {idx}: Relational Algebra & SQL Operations",
            status="COMPLETED"
        )
        db.add(lec)
        db.commit()
        db.refresh(lec)

        # Mark attendance for all enrolled students in CS101
        for stu in cs101_students:
            # Maria Garcia (CS202602) and David Miller (CS202605) will attend very few lectures (<75% defaulters)
            if stu.roll_no == "CS202602":
                # Attends only 2 out of all lectures (~30% -> DEFAULTER)
                status_str = "PRESENT" if idx <= 2 else "ABSENT"
            elif stu.roll_no == "CS202605":
                # Attends only 3 lectures (<50% -> DEFAULTER)
                status_str = "PRESENT" if idx in (1, 3, 5) else "ABSENT"
            elif stu.roll_no == "CS202601":
                # Alex Johnson attends 90%+
                status_str = "PRESENT"
            else:
                # Other students attend ~80%+
                status_str = "PRESENT" if idx != 2 else "ABSENT"

            att = Attendance(
                student_id=stu.student_id,
                lecture_id=lec.lecture_id,
                status=status_str,
                percentage=100.0 if status_str == "PRESENT" else 0.0,
                remarks="Regular lecture attendance"
            )
            db.add(att)
    db.commit()

    print("Seeding Exams and Results...")
    exam1 = Exam(
        course_id=c1.course_id,
        faculty_id=f1.faculty_id,
        exam_type="Midterm",
        exam_date=date(current_year, current_month, 10),
        max_marks=100.0,
        grade="A"
    )
    exam2 = Exam(
        course_id=c1.course_id,
        faculty_id=f1.faculty_id,
        exam_type="Quiz 1",
        exam_date=date(current_year, current_month, 5),
        max_marks=20.0,
        grade="B+"
    )
    db.add_all([exam1, exam2])
    db.commit()
    db.refresh(exam1)
    db.refresh(exam2)

    # Add results for CS101 students
    results = [
        Result(exam_id=exam1.exam_id, student_id=created_students[0].student_id, marks=92.0, grade=calculate_grade(92.0, 100.0)),
        Result(exam_id=exam1.exam_id, student_id=created_students[1].student_id, marks=64.0, grade=calculate_grade(64.0, 100.0)),
        Result(exam_id=exam1.exam_id, student_id=created_students[2].student_id, marks=85.0, grade=calculate_grade(85.0, 100.0)),
        Result(exam_id=exam1.exam_id, student_id=created_students[3].student_id, marks=78.0, grade=calculate_grade(78.0, 100.0)),
        Result(exam_id=exam1.exam_id, student_id=created_students[4].student_id, marks=45.0, grade=calculate_grade(45.0, 100.0)),
        # Quiz 1
        Result(exam_id=exam2.exam_id, student_id=created_students[0].student_id, marks=19.0, grade=calculate_grade(19.0, 20.0)),
        Result(exam_id=exam2.exam_id, student_id=created_students[1].student_id, marks=11.0, grade=calculate_grade(11.0, 20.0)),
    ]
    db.add_all(results)
    db.commit()

    print("Seeding User Accounts for Authentication...")
    # Admin User
    u_admin = User(
        username="admin",
        email="admin@campusflow.edu",
        hashed_password=get_password_hash("admin123"),
        role="ADMIN",
        is_active=True
    )
    # Faculty User 1 (Dr. Robert Smith)
    u_f1 = User(
        username="dr.smith",
        email="dr.smith@campusflow.edu",
        hashed_password=get_password_hash("faculty123"),
        role="FACULTY",
        faculty_id=f1.faculty_id,
        is_active=True
    )
    # Faculty User 2 (Elena Vance)
    u_f3 = User(
        username="elena.vance",
        email="elena.vance@campusflow.edu",
        hashed_password=get_password_hash("faculty123"),
        role="FACULTY",
        faculty_id=f3.faculty_id,
        is_active=True
    )
    # Student User 1 (Alex Johnson - Good Attendance)
    u_s1 = User(
        username="cs202601",
        email="alex.johnson@campusflow.edu",
        hashed_password=get_password_hash("student123"),
        role="STUDENT",
        student_id=created_students[0].student_id,
        is_active=True
    )
    # Student User 2 (Maria Garcia - Defaulter <75%)
    u_s2 = User(
        username="cs202602",
        email="maria.garcia@campusflow.edu",
        hashed_password=get_password_hash("student123"),
        role="STUDENT",
        student_id=created_students[1].student_id,
        is_active=True
    )

    db.add_all([u_admin, u_f1, u_f3, u_s1, u_s2])
    db.commit()

    print("==================================================")
    print("CampusFlow Database Successfully Seeded!")
    print("==================================================")
    print("Default Test Accounts:")
    print("  Administrator: admin / admin123")
    print("  Faculty:       dr.smith / faculty123 (HOD Computer Science)")
    print("  Faculty:       elena.vance / faculty123 (Information Tech)")
    print("  Student (OK):  cs202601 / student123 (Alex Johnson, 100% Attendance)")
    print("  Student (Def): cs202602 / student123 (Maria Garcia, <75% Defaulter)")
    print("==================================================")
    db.close()

if __name__ == "__main__":
    seed_database()
