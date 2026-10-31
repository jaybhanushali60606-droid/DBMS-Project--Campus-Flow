-- EXPERIMENT 9 - PROJECT PHASE III
-- Advanced Database Programming for CampusFlow (MySQL 8+)
-- Stored procedures for common academic operations and reports.
-- Depends on CampusFlow_MySQL_Schema.sql and the referenced tables.
--
-- Run once in MySQL Workbench after selecting the CampusFlow database.
-- Procedure definitions do not alter existing rows. CALL examples are kept
-- commented because write procedures can insert/update records.

DELIMITER $$

-- Add or update one student's attendance for a lecture.
-- Validation trigger trg_attendance_validate_before_insert/update also checks
-- allowed status and that the student belongs to the lecture roster.
CREATE PROCEDURE sp_record_attendance(
    IN p_student_id INT,
    IN p_lecture_id INT,
    IN p_status VARCHAR(10),
    IN p_remarks VARCHAR(255)
)
BEGIN
    DECLARE v_status VARCHAR(10);
    SET v_status = UPPER(TRIM(p_status));

    IF v_status NOT IN ('PRESENT', 'ABSENT') THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Status must be PRESENT or ABSENT';
    END IF;

    INSERT INTO attendance (student_id, lecture_id, status, remarks)
    VALUES (p_student_id, p_lecture_id, v_status, p_remarks)
    ON DUPLICATE KEY UPDATE
        status = v_status,
        remarks = p_remarks,
        marked_at = CURRENT_TIMESTAMP;
END$$

-- Return attendance totals and percentage for one student in one course.
CREATE PROCEDURE sp_student_course_attendance(
    IN p_student_id INT,
    IN p_course_id INT
)
BEGIN
    SELECT
        s.student_id,
        s.roll_no AS student_uid,
        c.course_id,
        c.course_code,
        c.title AS course_title,
        COUNT(a.lecture_id) AS marked_lectures,
        SUM(CASE WHEN UPPER(a.status) = 'PRESENT' THEN 1 ELSE 0 END) AS present_count,
        SUM(CASE WHEN UPPER(a.status) = 'ABSENT' THEN 1 ELSE 0 END) AS absent_count,
        ROUND(
            100.0 * SUM(CASE WHEN UPPER(a.status) = 'PRESENT' THEN 1 ELSE 0 END)
            / NULLIF(COUNT(a.lecture_id), 0),
            2
        ) AS attendance_percentage
    FROM student AS s
    CROSS JOIN course AS c
    LEFT JOIN lecture AS l ON l.course_id = c.course_id
    LEFT JOIN attendance AS a
        ON a.lecture_id = l.lecture_id AND a.student_id = s.student_id
    WHERE s.student_id = p_student_id
      AND c.course_id = p_course_id
    GROUP BY s.student_id, s.roll_no, c.course_id, c.course_code, c.title;
END$$

-- Return active enrolled students for a course.
CREATE PROCEDURE sp_course_roster(
    IN p_course_id INT
)
BEGIN
    SELECT
        c.course_code,
        c.title AS course_title,
        s.student_id,
        s.roll_no AS student_uid,
        CONCAT_WS(' ', s.f_name, NULLIF(s.m_name, ''), s.l_name) AS student_name,
        e.enrolled_at
    FROM enrollments AS e
    INNER JOIN student AS s ON s.student_id = e.student_id
    INNER JOIN course AS c ON c.course_id = e.course_id
    WHERE e.course_id = p_course_id
      AND e.status = 'ENROLLED'
    ORDER BY s.roll_no;
END$$

DELIMITER ;

-- Example calls (uncomment only after selecting valid IDs in your test database):
-- CALL sp_course_roster(1);
-- CALL sp_student_course_attendance(1, 1);
-- This next call writes attendance (insert/update), so use a test database:
-- CALL sp_record_attendance(1, 1, 'PRESENT', 'Experiment 9 demo');
