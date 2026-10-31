-- CampusFlow MySQL triggers
-- These encode validation rules also enforced by the application.
-- Depends on campusflow_schema_mysql.sql. Intended for MySQL 8+.

DELIMITER $$

CREATE TRIGGER trg_attendance_validate_before_insert
BEFORE INSERT ON attendance
FOR EACH ROW
BEGIN
    DECLARE v_division_id INT DEFAULT NULL;
    DECLARE v_lecture_has_division INT DEFAULT 0;
    DECLARE v_student_is_allowed INT DEFAULT 0;

    SET NEW.status = UPPER(TRIM(NEW.status));
    IF NEW.status NOT IN ('PRESENT', 'ABSENT') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Attendance status must be PRESENT or ABSENT';
    END IF;

    SELECT COUNT(*) INTO v_lecture_has_division
    FROM lecture_division
    WHERE lecture_id = NEW.lecture_id;

    IF v_lecture_has_division > 0 THEN
        SELECT division_id INTO v_division_id
        FROM lecture_division
        WHERE lecture_id = NEW.lecture_id;

        SELECT COUNT(*) INTO v_student_is_allowed
        FROM student_division
        WHERE student_id = NEW.student_id
          AND division_id = v_division_id;
    ELSE
        SELECT COUNT(*) INTO v_student_is_allowed
        FROM enrollments AS e
        JOIN lecture AS l ON l.course_id = e.course_id
        WHERE l.lecture_id = NEW.lecture_id
          AND e.student_id = NEW.student_id
          AND e.status = 'ENROLLED';
    END IF;

    IF v_student_is_allowed = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student is not assigned to this lecture roster';
    END IF;
END$$

CREATE TRIGGER trg_attendance_validate_before_update
BEFORE UPDATE ON attendance
FOR EACH ROW
BEGIN
    DECLARE v_division_id INT DEFAULT NULL;
    DECLARE v_lecture_has_division INT DEFAULT 0;
    DECLARE v_student_is_allowed INT DEFAULT 0;

    SET NEW.status = UPPER(TRIM(NEW.status));
    IF NEW.status NOT IN ('PRESENT', 'ABSENT') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Attendance status must be PRESENT or ABSENT';
    END IF;

    SELECT COUNT(*) INTO v_lecture_has_division
    FROM lecture_division
    WHERE lecture_id = NEW.lecture_id;

    IF v_lecture_has_division > 0 THEN
        SELECT division_id INTO v_division_id
        FROM lecture_division
        WHERE lecture_id = NEW.lecture_id;

        SELECT COUNT(*) INTO v_student_is_allowed
        FROM student_division
        WHERE student_id = NEW.student_id
          AND division_id = v_division_id;
    ELSE
        SELECT COUNT(*) INTO v_student_is_allowed
        FROM enrollments AS e
        JOIN lecture AS l ON l.course_id = e.course_id
        WHERE l.lecture_id = NEW.lecture_id
          AND e.student_id = NEW.student_id
          AND e.status = 'ENROLLED';
    END IF;

    IF v_student_is_allowed = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student is not assigned to this lecture roster';
    END IF;
END$$

CREATE TRIGGER trg_result_validate_before_insert
BEFORE INSERT ON result
FOR EACH ROW
BEGIN
    DECLARE v_max_marks FLOAT DEFAULT NULL;
    DECLARE v_percentage FLOAT DEFAULT 0;

    SELECT max_marks INTO v_max_marks
    FROM exam
    WHERE exam_id = NEW.exam_id;

    IF NEW.marks < 0 OR (v_max_marks IS NOT NULL AND NEW.marks > v_max_marks) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Marks must be between zero and the exam maximum';
    END IF;

    IF NEW.grade IS NULL OR TRIM(NEW.grade) = '' THEN
        SET v_percentage = CASE WHEN v_max_marks > 0 THEN (NEW.marks / v_max_marks) * 100 ELSE 0 END;
        SET NEW.grade = CASE
            WHEN v_percentage >= 90 THEN 'A+'
            WHEN v_percentage >= 80 THEN 'A'
            WHEN v_percentage >= 70 THEN 'B+'
            WHEN v_percentage >= 60 THEN 'B'
            WHEN v_percentage >= 50 THEN 'C'
            WHEN v_percentage >= 40 THEN 'D'
            ELSE 'F'
        END;
    END IF;
END$$

CREATE TRIGGER trg_result_validate_before_update
BEFORE UPDATE ON result
FOR EACH ROW
BEGIN
    DECLARE v_max_marks FLOAT DEFAULT NULL;
    DECLARE v_percentage FLOAT DEFAULT 0;

    SELECT max_marks INTO v_max_marks
    FROM exam
    WHERE exam_id = NEW.exam_id;

    IF NEW.marks < 0 OR (v_max_marks IS NOT NULL AND NEW.marks > v_max_marks) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Marks must be between zero and the exam maximum';
    END IF;

    IF NEW.grade IS NULL OR TRIM(NEW.grade) = '' THEN
        SET v_percentage = CASE WHEN v_max_marks > 0 THEN (NEW.marks / v_max_marks) * 100 ELSE 0 END;
        SET NEW.grade = CASE
            WHEN v_percentage >= 90 THEN 'A+'
            WHEN v_percentage >= 80 THEN 'A'
            WHEN v_percentage >= 70 THEN 'B+'
            WHEN v_percentage >= 60 THEN 'B'
            WHEN v_percentage >= 50 THEN 'C'
            WHEN v_percentage >= 40 THEN 'D'
            ELSE 'F'
        END;
    END IF;
END$$

CREATE TRIGGER trg_enrollment_status_before_insert
BEFORE INSERT ON enrollments
FOR EACH ROW
BEGIN
    IF NEW.status NOT IN ('ENROLLED', 'COMPLETED', 'DROPPED') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Enrollment status must be ENROLLED, COMPLETED, or DROPPED';
    END IF;
END$$

CREATE TRIGGER trg_enrollment_status_before_update
BEFORE UPDATE ON enrollments
FOR EACH ROW
BEGIN
    IF NEW.status NOT IN ('ENROLLED', 'COMPLETED', 'DROPPED') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Enrollment status must be ENROLLED, COMPLETED, or DROPPED';
    END IF;
END$$

DELIMITER ;
