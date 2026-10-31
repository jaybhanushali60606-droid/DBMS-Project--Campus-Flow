-- EXPERIMENT 8 - PROJECT PHASE II
-- SQL Query Implementation for the CampusFlow College Management case study
-- Topics demonstrated: JOINs, aggregate functions, and subqueries
-- DBMS: MySQL 8+
--
-- IMPORTANT:
-- 1. Select the MySQL database containing the CampusFlow tables before running.
-- 2. This file contains read-only SELECT statements; it does not insert, update,
--    or delete records.
-- 3. Queries use the table and column names from campusflow_schema_mysql.sql.

-- Select the database you created/imported the CampusFlow schema into.
-- Example (edit the database name if yours is different):
-- USE campusflow;


-- ============================ JOIN QUERIES ============================

-- Query 1: Student directory with department and assigned year/branch/division.
-- Demonstrates INNER JOIN and LEFT JOIN across related academic tables.
SELECT
    s.roll_no AS student_uid,
    CONCAT_WS(' ', s.f_name, NULLIF(s.m_name, ''), s.l_name) AS student_name,
    dep.dept_name AS department,
    divi.academic_year,
    divi.branch,
    divi.division_name
FROM student AS s
INNER JOIN department AS dep ON dep.dept_id = s.dept_id
LEFT JOIN student_division AS sd ON sd.student_id = s.student_id
LEFT JOIN division AS divi ON divi.division_id = sd.division_id
ORDER BY divi.academic_year, divi.branch, divi.division_name, s.roll_no;

-- Query 2: Course-wise enrolled student roster.
-- Demonstrates joining course, enrollment, student, and department.
SELECT
    c.course_code,
    c.title AS course_title,
    dep.dept_name AS course_department,
    s.roll_no AS student_uid,
    CONCAT_WS(' ', s.f_name, NULLIF(s.m_name, ''), s.l_name) AS student_name,
    e.enrolled_at,
    e.status AS enrollment_status
FROM course AS c
INNER JOIN enrollments AS e ON e.course_id = c.course_id
INNER JOIN student AS s ON s.student_id = e.student_id
LEFT JOIN department AS dep ON dep.dept_id = c.dept_id
WHERE e.status = 'ENROLLED'
ORDER BY c.course_code, s.roll_no;

-- Query 3: Lecture timetable with course, faculty, room, and assigned class.
-- Demonstrates a multi-table join with optional room/division information.
SELECT
    l.lecture_id,
    l.date AS lecture_date,
    l.start_time,
    l.end_time,
    c.course_code,
    c.title AS course_title,
    l.topic,
    CONCAT_WS(' ', f.f_name, NULLIF(f.m_name, ''), f.l_name) AS faculty_name,
    r.room_number,
    divi.academic_year,
    divi.branch,
    divi.division_name
FROM lecture AS l
INNER JOIN course AS c ON c.course_id = l.course_id
INNER JOIN faculty AS f ON f.faculty_id = l.faculty_id
LEFT JOIN room AS r ON r.room_id = l.room_id
LEFT JOIN lecture_division AS ld ON ld.lecture_id = l.lecture_id
LEFT JOIN division AS divi ON divi.division_id = ld.division_id
ORDER BY l.date, l.start_time;

-- Query 4: Attendance register with student, lecture, and course details.
SELECT
    l.date AS lecture_date,
    c.course_code,
    c.title AS course_title,
    l.topic,
    s.roll_no AS student_uid,
    CONCAT_WS(' ', s.f_name, NULLIF(s.m_name, ''), s.l_name) AS student_name,
    a.status AS attendance_status,
    a.remarks,
    a.marked_at
FROM attendance AS a
INNER JOIN student AS s ON s.student_id = a.student_id
INNER JOIN lecture AS l ON l.lecture_id = a.lecture_id
INNER JOIN course AS c ON c.course_id = l.course_id
ORDER BY l.date DESC, c.course_code, s.roll_no;

-- Query 5: Examination results with student and course information.
-- Percentage is calculated from marks obtained and exam maximum marks.
SELECT
    s.roll_no AS student_uid,
    CONCAT_WS(' ', s.f_name, NULLIF(s.m_name, ''), s.l_name) AS student_name,
    c.course_code,
    c.title AS course_title,
    ex.exam_type,
    ex.exam_date,
    res.marks,
    ex.max_marks,
    ROUND(100.0 * res.marks / NULLIF(ex.max_marks, 0), 2) AS percentage,
    res.grade
FROM result AS res
INNER JOIN student AS s ON s.student_id = res.student_id
INNER JOIN exam AS ex ON ex.exam_id = res.exam_id
INNER JOIN course AS c ON c.course_id = ex.course_id
ORDER BY ex.exam_date DESC, c.course_code, s.roll_no;


-- ======================= AGGREGATE FUNCTION QUERIES ===================

-- Query 6: Count students in each department.
-- Demonstrates COUNT, GROUP BY, and LEFT JOIN (departments with zero students remain visible).
SELECT
    dep.dept_name AS department,
    COUNT(s.student_id) AS student_count
FROM department AS dep
LEFT JOIN student AS s ON s.dept_id = dep.dept_id
GROUP BY dep.dept_id, dep.dept_name
ORDER BY student_count DESC, dep.dept_name;

-- Query 7: Number of enrolled students in each course.
-- Demonstrates COUNT with conditional filtering in the JOIN.
SELECT
    c.course_code,
    c.title AS course_title,
    COUNT(e.student_id) AS enrolled_students
FROM course AS c
LEFT JOIN enrollments AS e
    ON e.course_id = c.course_id AND e.status = 'ENROLLED'
GROUP BY c.course_id, c.course_code, c.title
ORDER BY enrolled_students DESC, c.course_code;

-- Query 8: Present and absent totals per lecture.
-- Demonstrates SUM, CASE, and COUNT.
SELECT
    l.lecture_id,
    l.date AS lecture_date,
    c.course_code,
    l.topic,
    COUNT(a.student_id) AS marked_students,
    SUM(CASE WHEN UPPER(a.status) = 'PRESENT' THEN 1 ELSE 0 END) AS present_count,
    SUM(CASE WHEN UPPER(a.status) = 'ABSENT' THEN 1 ELSE 0 END) AS absent_count
FROM lecture AS l
INNER JOIN course AS c ON c.course_id = l.course_id
LEFT JOIN attendance AS a ON a.lecture_id = l.lecture_id
GROUP BY l.lecture_id, l.date, c.course_code, l.topic
ORDER BY l.date DESC, l.lecture_id;

-- Query 9: Average, highest, and lowest result percentage for each course.
-- Demonstrates AVG, MAX, MIN, and COUNT.
SELECT
    c.course_code,
    c.title AS course_title,
    COUNT(res.student_id) AS result_count,
    ROUND(AVG(100.0 * res.marks / NULLIF(ex.max_marks, 0)), 2) AS average_percentage,
    ROUND(MAX(100.0 * res.marks / NULLIF(ex.max_marks, 0)), 2) AS highest_percentage,
    ROUND(MIN(100.0 * res.marks / NULLIF(ex.max_marks, 0)), 2) AS lowest_percentage
FROM course AS c
LEFT JOIN exam AS ex ON ex.course_id = c.course_id
LEFT JOIN result AS res ON res.exam_id = ex.exam_id
GROUP BY c.course_id, c.course_code, c.title
ORDER BY c.course_code;

-- Query 10: Total academic credits offered by each department.
-- Demonstrates SUM and COUNT with GROUP BY.
SELECT
    dep.dept_name AS department,
    COUNT(c.course_id) AS course_count,
    COALESCE(SUM(c.credits), 0) AS total_credits
FROM department AS dep
LEFT JOIN course AS c ON c.dept_id = dep.dept_id
GROUP BY dep.dept_id, dep.dept_name
ORDER BY total_credits DESC, dep.dept_name;


-- ============================== SUBQUERIES ===========================

-- Query 11: Students whose result percentage is above the overall average.
-- Demonstrates a scalar subquery in WHERE.
SELECT
    s.roll_no AS student_uid,
    CONCAT_WS(' ', s.f_name, NULLIF(s.m_name, ''), s.l_name) AS student_name,
    c.course_code,
    ex.exam_type,
    res.marks,
    ex.max_marks,
    ROUND(100.0 * res.marks / NULLIF(ex.max_marks, 0), 2) AS percentage
FROM result AS res
INNER JOIN student AS s ON s.student_id = res.student_id
INNER JOIN exam AS ex ON ex.exam_id = res.exam_id
INNER JOIN course AS c ON c.course_id = ex.course_id
WHERE 100.0 * res.marks / NULLIF(ex.max_marks, 0) > (
    SELECT AVG(100.0 * r2.marks / NULLIF(e2.max_marks, 0))
    FROM result AS r2
    INNER JOIN exam AS e2 ON e2.exam_id = r2.exam_id
)
ORDER BY percentage DESC;

-- Query 12: Courses with more enrolled students than the average course enrollment.
-- Demonstrates a derived table subquery in the FROM clause.
SELECT
    course_counts.course_code,
    course_counts.course_title,
    course_counts.enrolled_students
FROM (
    SELECT
        c.course_id,
        c.course_code,
        c.title AS course_title,
        COUNT(e.student_id) AS enrolled_students
    FROM course AS c
    LEFT JOIN enrollments AS e
        ON e.course_id = c.course_id AND e.status = 'ENROLLED'
    GROUP BY c.course_id, c.course_code, c.title
) AS course_counts
WHERE course_counts.enrolled_students > (
    SELECT AVG(counts_per_course.enrolled_students)
    FROM (
        SELECT COUNT(e2.student_id) AS enrolled_students
        FROM course AS c2
        LEFT JOIN enrollments AS e2
            ON e2.course_id = c2.course_id AND e2.status = 'ENROLLED'
        GROUP BY c2.course_id
    ) AS counts_per_course
)
ORDER BY course_counts.enrolled_students DESC;

-- Query 13: Students who have no attendance record yet.
-- Demonstrates NOT EXISTS correlated subquery.
SELECT
    s.roll_no AS student_uid,
    CONCAT_WS(' ', s.f_name, NULLIF(s.m_name, ''), s.l_name) AS student_name
FROM student AS s
WHERE NOT EXISTS (
    SELECT 1
    FROM attendance AS a
    WHERE a.student_id = s.student_id
)
ORDER BY s.roll_no;

-- Query 14: Exams whose maximum marks are above the average maximum marks.
-- Demonstrates a scalar subquery with an aggregate function.
SELECT
    ex.exam_id,
    c.course_code,
    c.title AS course_title,
    ex.exam_type,
    ex.exam_date,
    ex.max_marks
FROM exam AS ex
INNER JOIN course AS c ON c.course_id = ex.course_id
WHERE ex.max_marks > (
    SELECT AVG(max_marks)
    FROM exam
)
ORDER BY ex.max_marks DESC, ex.exam_date;

-- Query 15: Faculty members assigned to more courses than the average faculty assignment count.
-- Demonstrates a correlated scalar subquery and aggregate comparison.
SELECT
    f.faculty_id,
    CONCAT_WS(' ', f.f_name, NULLIF(f.m_name, ''), f.l_name) AS faculty_name,
    COUNT(fc.course_id) AS assigned_course_count
FROM faculty AS f
LEFT JOIN faculty_courses AS fc ON fc.faculty_id = f.faculty_id
GROUP BY f.faculty_id, f.f_name, f.m_name, f.l_name
HAVING COUNT(fc.course_id) > (
    SELECT AVG(faculty_course_counts.course_count)
    FROM (
        SELECT COUNT(fc2.course_id) AS course_count
        FROM faculty AS f2
        LEFT JOIN faculty_courses AS fc2 ON fc2.faculty_id = f2.faculty_id
        GROUP BY f2.faculty_id
    ) AS faculty_course_counts
)
ORDER BY assigned_course_count DESC, faculty_name;

-- END OF EXPERIMENT 8 QUERIES
