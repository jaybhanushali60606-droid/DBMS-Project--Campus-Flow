import axios from 'axios';
import {
  User, Department, Faculty, Course, Student, Room,
  Lecture, AttendanceRecord, StudentCourseAttendanceSummary,
  MonthlyDefaulterItem, Exam, Result, Schedule, AcademicSummaryReport, Division
} from '../types';

const API_BASE_URL = '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('campusflow_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('campusflow_token');
      localStorage.removeItem('campusflow_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// --- Auth Service ---
export const authApi = {
  login: async (credentials: { username: string; password: string; role?: 'STUDENT' | 'FACULTY' | 'ADMIN' }) => {
    const res = await apiClient.post('/auth/login', credentials);
    return res.data;
  },
  getCurrentUser: async () => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },
  updateProfile: async (data: Record<string, unknown>) => {
    const res = await apiClient.patch('/auth/profile', data);
    return res.data;
  },
  changePassword: async (data: { old_password: string; new_password: string }) => {
    const res = await apiClient.post('/auth/change-password', data);
    return res.data;
  },
  requestPasswordReset: async (email: string) => {
    const res = await apiClient.post('/auth/password-reset/request', { email }); return res.data;
  },
  resetPassword: async (data: { token: string; new_password: string }) => {
    const res = await apiClient.post('/auth/password-reset/confirm', data); return res.data;
  },
};

// --- Department Service ---
export const departmentApi = {
  getAll: async (): Promise<Department[]> => {
    const res = await apiClient.get('/departments');
    return res.data;
  },
  getById: async (id: number): Promise<Department> => {
    const res = await apiClient.get(`/departments/${id}`);
    return res.data;
  },
  create: async (data: Partial<Department>): Promise<Department> => {
    const res = await apiClient.post('/departments', data);
    return res.data;
  },
  update: async (id: number, data: Partial<Department>): Promise<Department> => {
    const res = await apiClient.put(`/departments/${id}`, data);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await apiClient.delete(`/departments/${id}`);
    return res.data;
  },
};

// --- Faculty Service ---
export const facultyApi = {
  getAll: async (dept_id?: number): Promise<Faculty[]> => {
    const params = dept_id ? { dept_id } : {};
    const res = await apiClient.get('/faculty', { params });
    return res.data;
  },
  getById: async (id: number): Promise<Faculty> => {
    const res = await apiClient.get(`/faculty/${id}`);
    return res.data;
  },
  create: async (data: any): Promise<Faculty> => {
    const res = await apiClient.post('/faculty', data);
    return res.data;
  },
  update: async (id: number, data: Partial<Faculty>): Promise<Faculty> => {
    const res = await apiClient.put(`/faculty/${id}`, data);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await apiClient.delete(`/faculty/${id}`);
    return res.data;
  },
  getCourses: async (id: number): Promise<Course[]> => {
    const res = await apiClient.get(`/faculty/${id}/courses`);
    return res.data;
  },
};

// --- Course Service ---
export const courseApi = {
  getAll: async (dept_id?: number): Promise<Course[]> => {
    const params = dept_id ? { dept_id } : {};
    const res = await apiClient.get('/courses', { params });
    return res.data;
  },
  getById: async (id: number): Promise<Course> => {
    const res = await apiClient.get(`/courses/${id}`);
    return res.data;
  },
  create: async (data: Partial<Course>): Promise<Course> => {
    const res = await apiClient.post('/courses', data);
    return res.data;
  },
  update: async (id: number, data: Partial<Course>): Promise<Course> => {
    const res = await apiClient.put(`/courses/${id}`, data);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await apiClient.delete(`/courses/${id}`);
    return res.data;
  },
  assignFaculty: async (courseId: number, facultyIds: number[]) => {
    const res = await apiClient.post(`/courses/${courseId}/assign-faculty`, { faculty_ids: facultyIds });
    return res.data;
  },
  getFaculty: async (courseId: number): Promise<Faculty[]> => {
    const res = await apiClient.get(`/courses/${courseId}/faculty`);
    return res.data;
  },
  assignDivisions: async (courseId: number, divisionIds: number[]) => {
    const res = await apiClient.post(`/courses/${courseId}/assign-divisions`, { division_ids: divisionIds });
    return res.data;
  },
  getStudents: async (courseId: number): Promise<Student[]> => {
    const res = await apiClient.get(`/courses/${courseId}/students`);
    return res.data;
  },
};

// --- Student Service ---
export const studentApi = {
  getAll: async (filters?: { dept_id?: number; academic_year?: number; branch?: string; division_id?: number; search?: string }): Promise<Student[]> => {
    const params = filters || {};
    const res = await apiClient.get('/students', { params });
    return res.data;
  },
  getById: async (id: number): Promise<Student> => {
    const res = await apiClient.get(`/students/${id}`);
    return res.data;
  },
  create: async (data: any): Promise<Student> => {
    const res = await apiClient.post('/students', data);
    return res.data;
  },
  update: async (id: number, data: Partial<Student>): Promise<Student> => {
    const res = await apiClient.put(`/students/${id}`, data);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await apiClient.delete(`/students/${id}`);
    return res.data;
  },
  enrollCourses: async (studentId: number, courseIds: number[]) => {
    const res = await apiClient.post(`/students/${studentId}/enroll`, { course_ids: courseIds });
    return res.data;
  },
  getCourses: async (studentId: number): Promise<Course[]> => {
    const res = await apiClient.get(`/students/${studentId}/courses`);
    return res.data;
  },
  getAttendance: async (studentId: number): Promise<StudentCourseAttendanceSummary[]> => {
    const res = await apiClient.get(`/students/${studentId}/attendance`);
    return res.data;
  },
};

export const divisionApi = {
  getAll: async (): Promise<Division[]> => {
    const res = await apiClient.get('/divisions');
    return res.data;
  },
  create: async (data: { academic_year: number; branch: Division['branch']; division_name: string }): Promise<Division> => {
    const res = await apiClient.post('/divisions', data);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await apiClient.delete(`/divisions/${id}`);
    return res.data;
  },
};

// --- Lecture Service ---
export const lectureApi = {
  getAll: async (params?: { course_id?: number; faculty_id?: number; lecture_date?: string; date_from?: string; date_to?: string }): Promise<Lecture[]> => {
    const res = await apiClient.get('/lectures', { params });
    return res.data;
  },
  getById: async (id: number): Promise<Lecture> => {
    const res = await apiClient.get(`/lectures/${id}`);
    return res.data;
  },
  create: async (data: any): Promise<Lecture> => {
    const res = await apiClient.post('/lectures', data);
    return res.data;
  },
  update: async (id: number, data: any): Promise<Lecture> => {
    const res = await apiClient.put(`/lectures/${id}`, data);
    return res.data;
  },
  delete: async (id: number): Promise<{ message: string }> => {
    const res = await apiClient.delete(`/lectures/${id}`);
    return res.data;
  },
  getAttendance: async (lectureId: number): Promise<AttendanceRecord[]> => {
    const res = await apiClient.get(`/lectures/${lectureId}/attendance`);
    return res.data;
  },
  getStudents: async (lectureId: number): Promise<Student[]> => {
    const res = await apiClient.get(`/lectures/${lectureId}/students`);
    return res.data;
  },
};

// --- Attendance Service ---
export const attendanceApi = {
  submit: async (lectureId: number, records: { student_id: number; status: string; remarks?: string }[]) => {
    const res = await apiClient.post('/attendance/submit', {
      lecture_id: lectureId,
      records,
    });
    return res.data;
  },
  getDefaulters: async (params: {
    month: number;
    year: number;
    dept_id?: number;
    course_id?: number;
    threshold?: number;
    defaulter_only?: boolean;
  }): Promise<MonthlyDefaulterItem[]> => {
    const res = await apiClient.get('/attendance/defaulters', { params });
    return res.data;
  },
  getMyAttendance: async (): Promise<StudentCourseAttendanceSummary[]> => {
    const res = await apiClient.get('/attendance/my-attendance');
    return res.data;
  },
  getMyAttendanceRecords: async (): Promise<AttendanceRecord[]> => {
    const res = await apiClient.get('/attendance/my-attendance/records');
    return res.data;
  },
  exportCsvUrl: (month: number, year: number, threshold: number = 75) => {
    return `/api/v1/reports/defaulters/export-csv?month=${month}&year=${year}&threshold=${threshold}`;
  },
};

// --- Exam Service ---
export const examApi = {
  getAll: async (params?: { course_id?: number; faculty_id?: number }): Promise<Exam[]> => {
    const res = await apiClient.get('/exams', { params });
    return res.data;
  },
  getById: async (id: number): Promise<Exam> => {
    const res = await apiClient.get(`/exams/${id}`);
    return res.data;
  },
  create: async (data: any): Promise<Exam> => {
    const res = await apiClient.post('/exams', data);
    return res.data;
  },
  update: async (id: number, data: any): Promise<Exam> => {
    const res = await apiClient.put(`/exams/${id}`, data);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await apiClient.delete(`/exams/${id}`);
    return res.data;
  },
  getStudents: async (examId: number): Promise<Student[]> => {
    const res = await apiClient.get(`/exams/${examId}/students`);
    return res.data;
  },
};

// --- Result Service ---
export const resultApi = {
  getAll: async (params?: { exam_id?: number; student_id?: number; course_id?: number }): Promise<Result[]> => {
    const res = await apiClient.get('/results', { params });
    return res.data;
  },
  bulkSubmit: async (examId: number, results: { student_id: number; marks: number; grade?: string }[]) => {
    const res = await apiClient.post('/results/bulk', {
      exam_id: examId,
      results,
    });
    return res.data;
  },
  delete: async (examId: number, studentId: number) => {
    const res = await apiClient.delete(`/results/${examId}/${studentId}`);
    return res.data;
  },
  getMyResults: async (): Promise<Result[]> => {
    const res = await apiClient.get('/results/my-results');
    return res.data;
  },
};

// --- Room & Scheduling Service ---
export const roomApi = {
  getAll: async (params?: { room_type?: string; building?: string }): Promise<Room[]> => {
    const res = await apiClient.get('/rooms', { params });
    return res.data;
  },
  getById: async (id: number): Promise<Room> => {
    const res = await apiClient.get(`/rooms/${id}`);
    return res.data;
  },
  create: async (data: Partial<Room>): Promise<Room> => {
    const res = await apiClient.post('/rooms', data);
    return res.data;
  },
  update: async (id: number, data: Partial<Room>): Promise<Room> => {
    const res = await apiClient.put(`/rooms/${id}`, data);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await apiClient.delete(`/rooms/${id}`);
    return res.data;
  },
};

export const scheduleApi = {
  getAll: async (params?: {
    day_of_week?: string;
    room_id?: number;
    faculty_id?: number;
    course_id?: number;
    activity_type?: string;
  }): Promise<Schedule[]> => {
    const res = await apiClient.get('/schedules', { params });
    return res.data;
  },
  create: async (data: any): Promise<Schedule> => {
    const res = await apiClient.post('/schedules', data);
    return res.data;
  },
  update: async (id: number, data: any): Promise<Schedule> => {
    const res = await apiClient.put(`/schedules/${id}`, data);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await apiClient.delete(`/schedules/${id}`);
    return res.data;
  },
  getWeeklyTimetable: async (): Promise<Record<string, Schedule[]>> => {
    const res = await apiClient.get('/schedules/timetable/weekly');
    return res.data;
  },
};

// --- Reports & Dashboard Service ---
export const reportApi = {
  getSummary: async (): Promise<AcademicSummaryReport> => {
    const res = await apiClient.get('/reports/summary');
    return res.data;
  },
};

export const dashboardApi = {
  getStats: async (): Promise<any> => {
    const res = await apiClient.get('/dashboard/stats');
    return res.data;
  },
};
