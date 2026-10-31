-- CampusFlow SQLite schema reference generated from backend/app/models.
-- This file is for a NEW/empty database; do not rerun it against an existing database.
PRAGMA foreign_keys = ON;

-- Table: department
CREATE TABLE department (
	dept_id INTEGER NOT NULL, 
	dept_name VARCHAR(100) NOT NULL, 
	building VARCHAR(100) NOT NULL, 
	head_id INTEGER, 
	PRIMARY KEY (dept_id), 
	CONSTRAINT fk_department_head_id FOREIGN KEY(head_id) REFERENCES faculty (faculty_id)
);

-- Table: division
CREATE TABLE division (
	division_id INTEGER NOT NULL, 
	academic_year INTEGER NOT NULL, 
	branch VARCHAR(10) NOT NULL, 
	division_name VARCHAR(20) NOT NULL, 
	PRIMARY KEY (division_id), 
	CONSTRAINT uq_division_year_branch_name UNIQUE (academic_year, branch, division_name)
);

-- Table: room
CREATE TABLE room (
	room_id INTEGER NOT NULL, 
	room_number VARCHAR(50) NOT NULL, 
	building VARCHAR(100) NOT NULL, 
	capacity INTEGER NOT NULL, 
	room_type VARCHAR(50) NOT NULL, 
	PRIMARY KEY (room_id)
);

-- Table: course
CREATE TABLE course (
	course_id INTEGER NOT NULL, 
	dept_id INTEGER NOT NULL, 
	course_code VARCHAR(20) NOT NULL, 
	title VARCHAR(100) NOT NULL, 
	credits INTEGER NOT NULL, 
	PRIMARY KEY (course_id), 
	CONSTRAINT fk_course_dept_id FOREIGN KEY(dept_id) REFERENCES department (dept_id)
);

-- Table: faculty
CREATE TABLE faculty (
	faculty_id INTEGER NOT NULL, 
	dept_id INTEGER NOT NULL, 
	f_name VARCHAR(50) NOT NULL, 
	m_name VARCHAR(50), 
	l_name VARCHAR(50) NOT NULL, 
	designation VARCHAR(50) NOT NULL, 
	email VARCHAR(100), 
	PRIMARY KEY (faculty_id), 
	CONSTRAINT fk_faculty_dept_id FOREIGN KEY(dept_id) REFERENCES department (dept_id), 
	UNIQUE (email)
);

-- Table: student
CREATE TABLE student (
	student_id INTEGER NOT NULL, 
	dept_id INTEGER NOT NULL, 
	f_name VARCHAR(50) NOT NULL, 
	m_name VARCHAR(50), 
	l_name VARCHAR(50) NOT NULL, 
	dob DATE NOT NULL, 
	roll_no VARCHAR(50), 
	email VARCHAR(100), 
	PRIMARY KEY (student_id), 
	CONSTRAINT fk_student_dept_id FOREIGN KEY(dept_id) REFERENCES department (dept_id), 
	UNIQUE (email)
);

-- Table: enrollments
CREATE TABLE enrollments (
	student_id INTEGER NOT NULL, 
	course_id INTEGER NOT NULL, 
	enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
	status VARCHAR(20) NOT NULL, 
	PRIMARY KEY (student_id, course_id), 
	FOREIGN KEY(student_id) REFERENCES student (student_id) ON DELETE CASCADE, 
	FOREIGN KEY(course_id) REFERENCES course (course_id) ON DELETE CASCADE
);

-- Table: exam
CREATE TABLE exam (
	exam_id INTEGER NOT NULL, 
	course_id INTEGER NOT NULL, 
	faculty_id INTEGER, 
	exam_type VARCHAR(50) NOT NULL, 
	exam_date DATE NOT NULL, 
	max_marks FLOAT NOT NULL, 
	grade VARCHAR(20), 
	PRIMARY KEY (exam_id), 
	CONSTRAINT fk_exam_course_id FOREIGN KEY(course_id) REFERENCES course (course_id) ON DELETE CASCADE, 
	CONSTRAINT fk_exam_faculty_id FOREIGN KEY(faculty_id) REFERENCES faculty (faculty_id)
);

-- Table: faculty_courses
CREATE TABLE faculty_courses (
	faculty_id INTEGER NOT NULL, 
	course_id INTEGER NOT NULL, 
	assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
	PRIMARY KEY (faculty_id, course_id), 
	FOREIGN KEY(faculty_id) REFERENCES faculty (faculty_id) ON DELETE CASCADE, 
	FOREIGN KEY(course_id) REFERENCES course (course_id) ON DELETE CASCADE
);

-- Table: lecture
CREATE TABLE lecture (
	lecture_id INTEGER NOT NULL, 
	course_id INTEGER NOT NULL, 
	faculty_id INTEGER NOT NULL, 
	room_id INTEGER, 
	date DATE NOT NULL, 
	start_time TIME NOT NULL, 
	end_time TIME NOT NULL, 
	duration INTEGER NOT NULL, 
	topic VARCHAR(255), 
	status VARCHAR(20) NOT NULL, 
	PRIMARY KEY (lecture_id), 
	CONSTRAINT fk_lecture_course_id FOREIGN KEY(course_id) REFERENCES course (course_id), 
	CONSTRAINT fk_lecture_faculty_id FOREIGN KEY(faculty_id) REFERENCES faculty (faculty_id), 
	CONSTRAINT fk_lecture_room_id FOREIGN KEY(room_id) REFERENCES room (room_id)
);

-- Table: schedule
CREATE TABLE schedule (
	schedule_id INTEGER NOT NULL, 
	room_id INTEGER NOT NULL, 
	course_id INTEGER, 
	faculty_id INTEGER, 
	activity_type VARCHAR(50) NOT NULL, 
	title VARCHAR(100) NOT NULL, 
	day_of_week VARCHAR(20) NOT NULL, 
	schedule_date DATE, 
	start_time TIME NOT NULL, 
	end_time TIME NOT NULL, 
	PRIMARY KEY (schedule_id), 
	CONSTRAINT fk_schedule_room_id FOREIGN KEY(room_id) REFERENCES room (room_id) ON DELETE CASCADE, 
	CONSTRAINT fk_schedule_course_id FOREIGN KEY(course_id) REFERENCES course (course_id) ON DELETE SET NULL, 
	CONSTRAINT fk_schedule_faculty_id FOREIGN KEY(faculty_id) REFERENCES faculty (faculty_id) ON DELETE SET NULL
);

-- Table: student_division
CREATE TABLE student_division (
	student_id INTEGER NOT NULL, 
	division_id INTEGER NOT NULL, 
	PRIMARY KEY (student_id), 
	FOREIGN KEY(student_id) REFERENCES student (student_id) ON DELETE CASCADE, 
	FOREIGN KEY(division_id) REFERENCES division (division_id) ON DELETE RESTRICT
);

-- Table: users
CREATE TABLE users (
	user_id INTEGER NOT NULL, 
	username VARCHAR(50) NOT NULL, 
	email VARCHAR(100) NOT NULL, 
	hashed_password VARCHAR(255) NOT NULL, 
	role VARCHAR(20) NOT NULL, 
	faculty_id INTEGER, 
	student_id INTEGER, 
	is_active BOOLEAN NOT NULL, 
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
	PRIMARY KEY (user_id), 
	UNIQUE (faculty_id), 
	FOREIGN KEY(faculty_id) REFERENCES faculty (faculty_id) ON DELETE SET NULL, 
	UNIQUE (student_id), 
	FOREIGN KEY(student_id) REFERENCES student (student_id) ON DELETE SET NULL
);

-- Table: attendance
CREATE TABLE attendance (
	student_id INTEGER NOT NULL, 
	lecture_id INTEGER NOT NULL, 
	status VARCHAR(10) NOT NULL, 
	percentage FLOAT, 
	remarks VARCHAR(255), 
	marked_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
	PRIMARY KEY (student_id, lecture_id), 
	CONSTRAINT fk_attendance_student_id FOREIGN KEY(student_id) REFERENCES student (student_id) ON DELETE CASCADE, 
	CONSTRAINT fk_attendance_lecture_id FOREIGN KEY(lecture_id) REFERENCES lecture (lecture_id) ON DELETE CASCADE
);

-- Table: lecture_division
CREATE TABLE lecture_division (
	lecture_id INTEGER NOT NULL, 
	division_id INTEGER NOT NULL, 
	PRIMARY KEY (lecture_id), 
	FOREIGN KEY(lecture_id) REFERENCES lecture (lecture_id) ON DELETE CASCADE, 
	FOREIGN KEY(division_id) REFERENCES division (division_id) ON DELETE RESTRICT
);

-- Table: result
CREATE TABLE result (
	exam_id INTEGER NOT NULL, 
	student_id INTEGER NOT NULL, 
	marks FLOAT NOT NULL, 
	grade VARCHAR(5) NOT NULL, 
	submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
	PRIMARY KEY (exam_id, student_id), 
	CONSTRAINT fk_result_exam_id FOREIGN KEY(exam_id) REFERENCES exam (exam_id) ON DELETE CASCADE, 
	CONSTRAINT fk_result_student_id FOREIGN KEY(student_id) REFERENCES student (student_id) ON DELETE CASCADE
);

CREATE INDEX ix_department_dept_id ON department (dept_id);
CREATE UNIQUE INDEX ix_department_dept_name ON department (dept_name);
CREATE INDEX ix_division_academic_year ON division (academic_year);
CREATE INDEX ix_division_branch ON division (branch);
CREATE INDEX ix_division_division_id ON division (division_id);
CREATE INDEX ix_room_room_id ON room (room_id);
CREATE UNIQUE INDEX ix_room_room_number ON room (room_number);
CREATE UNIQUE INDEX ix_course_course_code ON course (course_code);
CREATE INDEX ix_course_course_id ON course (course_id);
CREATE INDEX ix_faculty_faculty_id ON faculty (faculty_id);
CREATE UNIQUE INDEX ix_student_roll_no ON student (roll_no);
CREATE INDEX ix_student_student_id ON student (student_id);
CREATE INDEX ix_exam_exam_id ON exam (exam_id);
CREATE INDEX ix_lecture_date ON lecture (date);
CREATE INDEX ix_lecture_lecture_id ON lecture (lecture_id);
CREATE INDEX ix_schedule_day_of_week ON schedule (day_of_week);
CREATE INDEX ix_schedule_schedule_id ON schedule (schedule_id);
CREATE INDEX ix_student_division_division_id ON student_division (division_id);
CREATE UNIQUE INDEX ix_users_email ON users (email);
CREATE INDEX ix_users_user_id ON users (user_id);
CREATE UNIQUE INDEX ix_users_username ON users (username);
CREATE INDEX ix_lecture_division_division_id ON lecture_division (division_id);
