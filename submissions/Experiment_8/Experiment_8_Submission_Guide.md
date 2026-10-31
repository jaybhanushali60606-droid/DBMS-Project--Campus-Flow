# Experiment 8 — Project Phase II: SQL Query Implementation

## Submission details

**Case study:** CampusFlow College Management System  
**DBMS:** MySQL 8+  
**Topics:** JOINs, aggregate functions, and subqueries  
**Student name:** ______________________________  
**Roll number:** _______________________________  
**Class / Division:** ___________________________  
**Subject / Course:** ___________________________  
**Date:** ______________________________________

## Aim

To write and execute SQL queries on the CampusFlow case study database using joins, aggregate functions, and subqueries.

## Requirements shown in the assignment image

The brief asks for SQL queries for the case study using:

1. **Joins** to retrieve related data from multiple tables.
2. **Aggregate functions** to calculate summaries from records.
3. **Subqueries** to use the result of one query inside another query.

The brief image does not state an exact query count or required report format. The attached SQL file provides 15 commented, read-only examples (5 joins, 5 aggregate queries, and 5 subquery queries) so each requested topic is represented several ways.

## CampusFlow tables used

`student`, `department`, `student_division`, `division`, `course`, `enrollments`, `faculty`, `faculty_courses`, `lecture`, `lecture_division`, `room`, `attendance`, `exam`, and `result`.

## How to run

1. Open MySQL Workbench and connect to your local MySQL server.
2. Create/select the database into which the CampusFlow MySQL schema has been imported.
3. Make sure the database contains the required tables and some records. The app currently uses SQLite; its records are not automatically present in MySQL.
4. Open `Experiment_8_CampusFlow_SQL_Queries.sql` in Workbench. If needed, uncomment and edit the `USE campusflow;` line near the top to match your database name.
5. Run the queries one at a time or select a query and click the lightning bolt. Capture result-grid screenshots for the report.

These are `SELECT` queries, so they read records and do not modify or delete data. A query can return zero rows when the relevant MySQL table has no data; that does not by itself mean the SQL is invalid.

## Suggested report layout

For each query, include:

- Query number and a short title.
- The SQL statement (already commented and numbered in the `.sql` file).
- A screenshot of the query in MySQL Workbench and its result grid.
- One sentence describing what the result shows.

Include at least one screenshot for each required topic—JOIN, aggregate function, and subquery. Including all 15 results gives a fuller record if your instructor wants every query demonstrated.

## Result / observation

The JOIN queries combine related CampusFlow records, such as students with departments and divisions, and attendance with lectures and courses. Aggregate queries summarize counts, marks, attendance, and credits. Subqueries compare records against calculated values or find records meeting a nested condition. Actual result rows depend on the data loaded into the selected MySQL database.

## Conclusion

The CampusFlow case study was queried using MySQL JOINs, aggregate functions, and subqueries to retrieve related records and produce useful academic summaries.

## Before submission

- Fill in the student and course details on the first page of your report.
- Run the SQL against the MySQL CampusFlow schema, not the SQLite database file.
- Save readable query-result screenshots and attach them if required by your instructor.
- Confirm whether your instructor expects a printed report, a `.sql` file, or both; the screenshot brief does not specify this.
