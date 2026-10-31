# Experiment 9 — Project Phase III: Advanced Database Programming

**Case study:** CampusFlow College Management System  
**DBMS:** MySQL 8+  
**Topics from the assignment brief:** Stored procedures, triggers, and views  
**Student name:** ______________________________  
**Roll number:** _______________________________  
**Class / Division:** ___________________________  
**Subject / Course:** ___________________________  
**Date:** ______________________________________

## Aim

To implement stored procedures, triggers, and views for the CampusFlow case study to enforce business rules and improve database functionality.

## What is included

- **MySQL schema:** table definitions and relationships for the case study.
- **Stored procedures:** record/update attendance, calculate a student's attendance summary in a course, and retrieve a course roster.
- **Triggers:** validate attendance status and class roster, validate exam marks and assign a grade when blank, and validate enrollment status.
- **Views:** student academic roster, active course enrollments, lecture attendance summary, and student result summary.
- **Verification SQL:** commands to inspect the installed procedures, triggers, and views, plus safe read-only view/procedure examples.

## Files and execution order

1. `CampusFlow_MySQL_Schema.sql`
2. `campusflow_mysql_triggers.sql`
3. `campusflow_mysql_views.sql`
4. `Experiment_9_CampusFlow_Stored_Procedures.sql`
5. `Experiment_9_CampusFlow_Verification.sql`

Use MySQL Workbench connected to MySQL 8+. First create/select a **new empty test database**, then open each file in the order above and execute it. If the schema file is large, run it first as one script. It creates tables and does not migrate data from the app's SQLite database. Stored procedure and trigger files use `DELIMITER`, so run them in Workbench or another SQL client that supports delimiter directives.

The schema creates database tables; the trigger/view/procedure files create database objects. Creating the stored procedures does not call them. The attendance procedure can insert or update attendance when called, so use a disposable/test database for write demonstrations. The other two procedures are read-only.

## How to demonstrate each requirement

### Stored procedures

Run `Experiment_9_CampusFlow_Verification.sql` to check that the procedures are installed. Then use existing IDs from your test database and call `sp_course_roster(student course ID)` or `sp_student_course_attendance(student ID, course ID)` (the actual parameters are course ID, and student ID plus course ID, respectively). These two procedures only read data. To demonstrate the write procedure, call `sp_record_attendance(student ID, lecture ID, 'PRESENT', 'Experiment demo')` in the test database and show the resulting row in `attendance`.

### Triggers

Use `SHOW TRIGGERS` in the verification file and capture the output. To demonstrate enforcement, in a disposable database try an attendance insert with an invalid status (for example `LATE`) or a student not assigned to that lecture. The trigger should reject it with an error. Do not use invalid test inserts on a database with important data.

### Views

Run the four `SELECT * FROM vw_...` statements in the verification file and capture their result grids. Views are stored SELECT queries; reading them does not alter the underlying records.

## Suggested report format

For each object, include its purpose, the relevant SQL definition or a short excerpt, and a MySQL Workbench screenshot showing it exists or runs. Include screenshots for all three required categories: procedures, triggers, and views. Add one sentence explaining what each output or validation demonstrates.

## Expected observations

- The attendance procedure inserts a new attendance row or updates the existing student/lecture row. Attendance triggers reject invalid status or a student outside the lecture roster.
- The attendance summary procedure calculates marked, present, absent, and attendance percentage for the requested student and course.
- The course roster procedure returns students whose enrollment status is `ENROLLED`.
- The result triggers reject marks below zero or above exam maximum and fill a blank grade based on percentage.
- The enrollment triggers accept only `ENROLLED`, `COMPLETED`, or `DROPPED`.
- The views provide reusable student, enrollment, lecture/attendance, and result reports.

Actual rows depend on the data loaded in MySQL. Empty result grids can mean the database has no sample records yet; they do not necessarily mean object creation failed.

## Conclusion

CampusFlow was extended with MySQL stored procedures for common operations and reports, triggers that enforce data rules, and views that simplify repeated academic queries.

## Note about the assignment brief

The provided image asks for stored procedures, triggers, and views but does not specify an exact object count or report template. This folder includes three procedures, six triggers, and four views to demonstrate the requested features. Confirm with your instructor whether a printed report or additional screenshots are required.
