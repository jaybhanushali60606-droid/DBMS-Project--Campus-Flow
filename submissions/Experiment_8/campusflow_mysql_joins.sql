-- CampusFlow MySQL JOIN examples
-- These are SELECT queries, not database objects. Depends on the CampusFlow tables.

-- 1. Student directory: student + department + assigned year/branch/division.
SELECT
    s.student_id,
    s.roll_no AS uid,
    CONCAT_WS(' ', s.f_name, NULLIF(s.m_name, ''), s.l_name) AS student_name,
    dep.dept_name AS department_name,
    divi.academic_year,
    divi.branch,
    divi.division_name
FROM student AS s
JOIN department AS dep ON dep.dept_id = s.dept_id
LEFT JOIN student_division AS sd ON sd.student_id = s.student_id
LEFT JOIN division AS divi ON divi.division_id = sd.division_id
ORDER BY divi.academic_year, divi.branch, divi.division_name, s.roll_no;

-- 2. Active course roster: course + department + enrollment + student.
SELECT
    c.course_code,
    c.title AS course_title,
    dep.dept_name AS department_name,
    s.roll_no AS uid,
    CONCAT_WS(' ', s.f_name, NULLIF(s.m_name, ''), s.l_name) AS student_name,
    e.enrolled_at
FROM course AS c
LEFT JOIN department AS dep ON dep.dept_id = c.dept_id
JOIN enrollments AS e ON e.course_id = c.course_id AND e.status = 'ENROLLED'
JOIN student AS s ON s.student_id = e.student_id
ORDER BY c.course_code, s.roll_no;

-- 3. Lecture schedule with its course, faculty, room, and assigned class division.
SELECT
    l.lecture_id,
    l.date AS lecture_date,
    l.start_time,
    l.end_time,
    c.course_code,
    c.title AS course_title,
    CONCAT_WS(' ', f.f_name, NULLIF(f.m_name, ''), f.l_name) AS faculty_name,
    r.room_number,
    divi.academic_year,
    divi.branch,
    divi.division_name
FROM lecture AS l
JOIN course AS c ON c.course_id = l.course_id
JOIN faculty AS f ON f.faculty_id = l.faculty_id
LEFT JOIN room AS r ON r.room_id = l.room_id
LEFT JOIN lecture_division AS ld ON ld.lecture_id = l.lecture_id
LEFT JOIN division AS divi ON divi.division_id = ld.division_id
ORDER BY l.date DESC, l.start_time;

-- 4. Attendance details: attendance + student + lecture + course.
SELECT
    l.lecture_id,
    l.date AS lecture_date,
    c.course_code,
    c.title AS course_title,
    s.roll_no AS uid,
    CONCAT_WS(' ', s.f_name, NULLIF(s.m_name, ''), s.l_name) AS student_name,
    a.status AS attendance_status,
    a.remarks,
    a.marked_at
FROM attendance AS a
JOIN student AS s ON s.student_id = a.student_id
JOIN lecture AS l ON l.lecture_id = a.lecture_id
JOIN course AS c ON c.course_id = l.course_id
ORDER BY l.date DESC, c.course_code, s.roll_no;

-- 5. Exam results: result + student + exam + course with calculated percentage.
SELECT
    s.roll_no AS uid,
    CONCAT_WS(' ', s.f_name, NULLIF(s.m_name, ''), s.l_name) AS student_name,
    ex.exam_type,
    ex.exam_date,
    c.course_code,
    c.title AS course_title,
    res.marks,
    ex.max_marks,
    ROUND(CASE WHEN ex.max_marks > 0 THEN res.marks / ex.max_marks * 100 ELSE 0 END, 2) AS percentage,
    res.grade
FROM result AS res
JOIN student AS s ON s.student_id = res.student_id
JOIN exam AS ex ON ex.exam_id = res.exam_id
JOIN course AS c ON c.course_id = ex.course_id
ORDER BY ex.exam_date DESC, s.roll_no;
