import os
import sys

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from datetime import date, time
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
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
from app.utils.security import get_password_hash, create_access_token

# In-memory SQLite database for fast, isolated test runs
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session")
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db(setup_db):
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def seed_test_data(db):
    # Department
    dept = Department(dept_name="Computer Science", building="Main Block")
    db.add(dept)
    db.commit()
    db.refresh(dept)

    # Faculty 1 & 2
    f1 = Faculty(dept_id=dept.dept_id, f_name="Alan", l_name="Turing", designation="Professor", email="alan@test.com")
    f2 = Faculty(dept_id=dept.dept_id, f_name="Ada", l_name="Lovelace", designation="Associate Professor", email="ada@test.com")
    db.add_all([f1, f2])
    db.commit()
    db.refresh(f1)
    db.refresh(f2)

    dept.head_id = f1.faculty_id
    db.commit()

    # Room
    room = Room(room_number="Room 101", building="Main Block", capacity=50, room_type="CLASSROOM")
    db.add(room)
    db.commit()
    db.refresh(room)

    # Course
    course = Course(dept_id=dept.dept_id, course_code="CS101", title="Database Systems", credits=4)
    db.add(course)
    db.commit()
    db.refresh(course)

    # Assign Faculty to Course
    db.execute(faculty_courses.insert().values(faculty_id=f1.faculty_id, course_id=course.course_id))
    db.commit()

    # Students: Student 1 (good att), Student 2 (defaulter)
    s1 = Student(dept_id=dept.dept_id, f_name="John", l_name="Doe", dob=date(2003, 1, 1), roll_no="CS001", email="john@test.com")
    s2 = Student(dept_id=dept.dept_id, f_name="Jane", l_name="Smith", dob=date(2003, 2, 2), roll_no="CS002", email="jane@test.com")
    db.add_all([s1, s2])
    db.commit()
    db.refresh(s1)
    db.refresh(s2)

    # Enrollments
    e1 = Enrollment(student_id=s1.student_id, course_id=course.course_id)
    e2 = Enrollment(student_id=s2.student_id, course_id=course.course_id)
    db.add_all([e1, e2])
    db.commit()

    # Users
    u_admin = User(username="admin_test", email="admin@test.com", hashed_password=get_password_hash("pass123"), role="ADMIN")
    u_faculty = User(username="faculty_test", email="faculty@test.com", hashed_password=get_password_hash("pass123"), role="FACULTY", faculty_id=f1.faculty_id)
    u_other_faculty = User(username="other_faculty", email="other@test.com", hashed_password=get_password_hash("pass123"), role="FACULTY", faculty_id=f2.faculty_id)
    u_student1 = User(username="student1_test", email="s1@test.com", hashed_password=get_password_hash("pass123"), role="STUDENT", student_id=s1.student_id)
    u_student2 = User(username="student2_test", email="s2@test.com", hashed_password=get_password_hash("pass123"), role="STUDENT", student_id=s2.student_id)
    db.add_all([u_admin, u_faculty, u_other_faculty, u_student1, u_student2])
    db.commit()

    return {
        "dept": dept,
        "f1": f1,
        "f2": f2,
        "room": room,
        "course": course,
        "s1": s1,
        "s2": s2,
        "u_admin": u_admin,
        "u_faculty": u_faculty,
        "u_other_faculty": u_other_faculty,
        "u_student1": u_student1,
        "u_student2": u_student2,
    }

@pytest.fixture
def admin_headers(seed_test_data):
    token = create_access_token(data={"sub": seed_test_data["u_admin"].username, "role": "ADMIN", "user_id": seed_test_data["u_admin"].user_id})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def faculty_headers(seed_test_data):
    token = create_access_token(data={"sub": seed_test_data["u_faculty"].username, "role": "FACULTY", "user_id": seed_test_data["u_faculty"].user_id})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def other_faculty_headers(seed_test_data):
    token = create_access_token(data={"sub": seed_test_data["u_other_faculty"].username, "role": "FACULTY", "user_id": seed_test_data["u_other_faculty"].user_id})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def student1_headers(seed_test_data):
    token = create_access_token(data={"sub": seed_test_data["u_student1"].username, "role": "STUDENT", "user_id": seed_test_data["u_student1"].user_id})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def student2_headers(seed_test_data):
    token = create_access_token(data={"sub": seed_test_data["u_student2"].username, "role": "STUDENT", "user_id": seed_test_data["u_student2"].user_id})
    return {"Authorization": f"Bearer {token}"}
