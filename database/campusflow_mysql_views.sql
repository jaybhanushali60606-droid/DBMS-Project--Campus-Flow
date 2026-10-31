-- CampusFlow MySQL views
-- Depends on tables in campusflow_schema_mysql.sql. Intended for MySQL 8+.

CREATE OR REPLACE VIEW vw_student_academic_roster AS
SELECT
    s.student_id,
    s.roll_no AS uid,
    CONCAT_WS(' ', s.f_name, NULLIF(s.m_name, ''), s.l_name) AS student_name,
    s.email,
    dep.dept_name AS department_name,
    divi.academic_year,
    divi.branch,
    divi.division_name
FROM student AS s
LEFT JOIN department AS dep ON dep.dept_id = s.dept_id
LEFT JOIN student_division AS sd ON sd.student_id = s.student_id
LEFT JOIN division AS divi ON divi.division_id = sd.division_id;

CREATE OR REPLACE VIEW vw_active_course_enrollments AS
SELECT
    c.course_id,
    c.course_code,
    c.title AS course_title,
    dep.dept_name AS department_name,
    e.student_id,
    s.roll_no AS uid,
    CONCAT_WS(' ', s.f_name, NULLIF(s.m_name, ''), s.l_name) AS student_name,
    e.enrolled_at
FROM enrollments AS e
JOIN student AS s ON s.student_id = e.student_id
JOIN course AS c ON c.course_id = e.course_id
LEFT JOIN department AS dep ON dep.dept_id = c.dept_id
WHERE e.status = 'ENROLLED';

CREATE OR REPLACE VIEW vw_lecture_attendance_summary AS
SELECT
    l.lecture_id,
    l.date AS lecture_date,
    l.start_time,
    l.end_time,
    l.topic,
    l.status AS lecture_status,
    c.course_code,
    c.title AS course_title,
    CONCAT_WS(' ', f.f_name, NULLIF(f.m_name, ''), f.l_name) AS faculty_name,
    r.room_number,
    divi.academic_year,
    divi.branch,
    divi.division_name,
    COALESCE(att.present_count, 0) AS present_count,
    COALESCE(att.absent_count, 0) AS absent_count,
    CASE
        WHEN ld.lecture_id IS NOT NULL THEN COALESCE(class_roster.student_count, 0)
        ELSE COALESCE(course_roster.student_count, 0)
    END AS roster_size
FROM lecture AS l
JOIN course AS c ON c.course_id = l.course_id
JOIN faculty AS f ON f.faculty_id = l.faculty_id
LEFT JOIN room AS r ON r.room_id = l.room_id
LEFT JOIN lecture_division AS ld ON ld.lecture_id = l.lecture_id
LEFT JOIN division AS divi ON divi.division_id = ld.division_id
LEFT JOIN (
    SELECT lecture_id,
           SUM(status = 'PRESENT') AS present_count,
           SUM(status = 'ABSENT') AS absent_count
    FROM attendance
    GROUP BY lecture_id
) AS att ON att.lecture_id = l.lecture_id
LEFT JOIN (
    SELECT sd.division_id, COUNT(*) AS student_count
    FROM student_division AS sd
    GROUP BY sd.division_id
) AS class_roster ON class_roster.division_id = ld.division_id
LEFT JOIN (
    SELECT course_id, COUNT(*) AS student_count
    FROM enrollments
    WHERE status = 'ENROLLED'
    GROUP BY course_id
) AS course_roster ON course_roster.course_id = l.course_id;

CREATE OR REPLACE VIEW vw_student_result_summary AS
SELECT
    res.student_id,
    s.roll_no AS uid,
    CONCAT_WS(' ', s.f_name, NULLIF(s.m_name, ''), s.l_name) AS student_name,
    ex.exam_id,
    ex.exam_type,
    ex.exam_date,
    c.course_code,
    c.title AS course_title,
    res.marks,
    ex.max_marks,
    ROUND(CASE WHEN ex.max_marks > 0 THEN (res.marks / ex.max_marks) * 100 ELSE 0 END, 2) AS percentage,
    res.grade,
    res.submitted_at
FROM result AS res
JOIN student AS s ON s.student_id = res.student_id
JOIN exam AS ex ON ex.exam_id = res.exam_id
JOIN course AS c ON c.course_id = ex.course_id;
