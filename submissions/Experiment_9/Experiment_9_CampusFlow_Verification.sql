-- EXPERIMENT 9 - VERIFY DATABASE OBJECTS
-- Select the CampusFlow database before running these read-only checks.

-- 1. Confirm the stored procedures are installed in the selected database.
SHOW PROCEDURE STATUS
WHERE Db = DATABASE()
  AND Name IN (
      'sp_record_attendance',
      'sp_student_course_attendance',
      'sp_course_roster'
  );

-- 2. Confirm the CampusFlow triggers are installed.
SHOW TRIGGERS
WHERE `Trigger` IN (
    'trg_attendance_validate_before_insert',
    'trg_attendance_validate_before_update',
    'trg_result_validate_before_insert',
    'trg_result_validate_before_update',
    'trg_enrollment_status_before_insert',
    'trg_enrollment_status_before_update'
);

-- 3. Confirm views exist and inspect their rows.
SHOW FULL TABLES WHERE Table_type = 'VIEW';
SELECT * FROM vw_student_academic_roster LIMIT 20;
SELECT * FROM vw_active_course_enrollments LIMIT 20;
SELECT * FROM vw_lecture_attendance_summary LIMIT 20;
SELECT * FROM vw_student_result_summary LIMIT 20;

-- 4. Run read-only stored procedures with IDs that exist in your MySQL database.
-- CALL sp_course_roster(1);
-- CALL sp_student_course_attendance(1, 1);

-- 5. Optional trigger demonstration in a disposable/test database only:
-- Try to insert an attendance row with status 'LATE' or a student outside the
-- lecture roster. The trigger should reject it with an explanatory SQL error.
-- Do not run invalid test inserts against a database containing important data.
