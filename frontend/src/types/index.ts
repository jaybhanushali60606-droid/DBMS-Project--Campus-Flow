export type Role = 'ADMIN' | 'FACULTY' | 'STUDENT';

export interface User {
  user_id: number;
  username: string;
  email: string;
  role: Role;
  faculty_id?: number | null;
  student_id?: number | null;
  full_name?: string | null;
  is_active?: boolean;
}

export interface Department {
  dept_id: number;
  dept_name: string;
  building: string;
  head_id?: number | null;
  head_name?: string | null;
  student_count?: number;
  faculty_count?: number;
  course_count?: number;
}

export interface Faculty {
  faculty_id: number;
  dept_id: number;
  f_name: string;
  m_name?: string | null;
  l_name: string;
  full_name: string;
  designation: string;
  email?: string | null;
  dept_name?: string | null;
  specialization: string;
  course_ids?: number[];
  assigned_courses?: FacultyAssignedCourse[];
  assigned_divisions: FacultyTeachingGroup[];
  eligible_division_ids: number[];
  administrative_roles: string[];
  coordinator_division_ids: number[];
}

export interface FacultyAssignedCourse {
  course_id: number;
  course_code: string;
  title: string;
}

export interface FacultyTeachingGroup {
  division_id: number;
  academic_year: number;
  branch: 'CE' | 'CSE' | 'EXTC';
  division_name: string;
}

export interface Course {
  course_id: number;
  dept_id?: number | null;
  course_code: string;
  title: string;
  credits: number;
  dept_name?: string | null;
  enrolled_students_count?: number;
  assigned_faculty_count?: number;
  assigned_faculty?: CourseFacultyAssignment[];
  assigned_divisions?: Division[];
}

export interface CourseFacultyAssignment {
  faculty_id: number;
  full_name: string;
  designation: string;
  dept_name?: string | null;
  specialization?: string;
  eligible_division_ids?: number[];
}

export interface Student {
  student_id: number;
  dept_id: number;
  f_name: string;
  m_name?: string | null;
  l_name: string;
  full_name: string;
  dob: string;
  roll_no?: string | null;
  email?: string | null;
  dept_name?: string | null;
  enrolled_courses_count?: number;
  academic_year?: number | null;
  branch?: 'CE' | 'CSE' | 'EXTC' | null;
  division_id?: number | null;
  division_name?: string | null;
}

export interface Division {
  division_id: number;
  academic_year: number;
  branch: 'CE' | 'CSE' | 'EXTC';
  division_name: string;
  students_count: number;
}

export interface Room {
  room_id: number;
  room_number: string;
  building: string;
  capacity: number;
  room_type: string;
  active_schedules_count?: number;
}

export interface Lecture {
  lecture_id: number;
  course_id: number;
  faculty_id: number;
  room_id?: number | null;
  date: string;
  start_time: string;
  end_time: string;
  duration: number;
  topic?: string | null;
  status: 'COMPLETED' | 'SCHEDULED' | 'CANCELLED';
  course_title?: string | null;
  course_code?: string | null;
  faculty_name?: string | null;
  room_number?: string | null;
  attendance_recorded?: boolean;
  present_count?: number;
  absent_count?: number;
  total_enrolled?: number;
  division_id?: number | null;
  division_name?: string | null;
  branch?: string | null;
  academic_year?: number | null;
}

export interface AttendanceRecord {
  student_id: number;
  lecture_id: number;
  status: 'PRESENT' | 'ABSENT';
  percentage?: number | null;
  remarks?: string | null;
  student_name?: string | null;
  roll_no?: string | null;
  lecture_date?: string | null;
  course_title?: string | null;
  course_code?: string | null;
  topic?: string | null;
  marked_at?: string | null;
}

export interface StudentCourseAttendanceSummary {
  student_id: number;
  student_name: string;
  roll_no?: string | null;
  course_id: number;
  course_code: string;
  course_title: string;
  attended_lectures: number;
  total_lectures: number;
  attendance_percentage: number;
  is_defaulter: boolean;
}

export interface MonthlyDefaulterItem {
  student_id: number;
  student_name: string;
  roll_no?: string | null;
  dept_name: string;
  course_id: number;
  course_code: string;
  course_title: string;
  month: number;
  year: number;
  month_name: string;
  attended_lectures: number;
  total_lectures: number;
  attendance_percentage: number;
  threshold: number;
  is_defaulter: boolean;
}

export interface Exam {
  exam_id: number;
  course_id: number;
  faculty_id?: number | null;
  exam_type: string;
  exam_date: string;
  max_marks: number;
  grade?: string | null;
  course_title?: string | null;
  course_code?: string | null;
  faculty_name?: string | null;
  total_results?: number;
  average_marks?: number | null;
  division_id?: number | null;
  academic_year?: number | null;
  branch?: string | null;
  division_name?: string | null;
}

export interface Result {
  exam_id: number;
  student_id: number;
  marks: number;
  grade: string;
  student_name?: string | null;
  roll_no?: string | null;
  exam_type?: string | null;
  course_title?: string | null;
  course_code?: string | null;
  max_marks?: number;
  percentage?: number;
  submitted_at?: string | null;
}

export interface Schedule {
  schedule_id: number;
  room_id: number;
  course_id?: number | null;
  faculty_id?: number | null;
  activity_type: 'LECTURE' | 'LAB' | 'EXTRACURRICULAR';
  title: string;
  day_of_week: string;
  schedule_date?: string | null;
  start_time: string;
  end_time: string;
  room_number?: string | null;
  room_building?: string | null;
  room_type?: string | null;
  course_code?: string | null;
  course_title?: string | null;
  faculty_name?: string | null;
}

export interface AcademicSummaryReport {
  total_departments: number;
  total_students: number;
  total_faculty: number;
  total_courses: number;
  total_lectures_held: number;
  total_attendance_records: number;
  overall_attendance_average: number;
  total_defaulters_count: number;
  department_distribution: {
    dept_id: number;
    dept_name: string;
    students: number;
    faculty: number;
    courses: number;
  }[];
  grade_distribution: Record<string, number>;
}
