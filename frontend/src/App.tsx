import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './components/layout/DashboardLayout';

// Pages
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/AdminDashboard';
import { FacultyDashboard } from './pages/FacultyDashboard';
import { StudentDashboard } from './pages/StudentDashboard';
import { DepartmentsPage } from './pages/DepartmentsPage';
import { FacultyPage } from './pages/FacultyPage';
import { StudentsPage } from './pages/StudentsPage';
import { CoursesPage } from './pages/CoursesPage';
import { LecturesPage } from './pages/LecturesPage';
import { AttendanceMarkingPage } from './pages/AttendanceMarkingPage';
import { AttendanceDefaultersPage } from './pages/AttendanceDefaultersPage';
import { ExaminationsPage } from './pages/ExaminationsPage';
import { RoomsSchedulingPage } from './pages/RoomsSchedulingPage';
import { TimetablesPage } from './pages/TimetablesPage';
import { ReportsPage } from './pages/ReportsPage';
import { ProfilePage } from './pages/ProfilePage';
import { DivisionsPage } from './pages/DivisionsPage';

const RootRedirect: React.FC = () => {
  const { user, token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'FACULTY') return <Navigate to="/faculty/dashboard" replace />;
  return <Navigate to="/student/dashboard" replace />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RootRedirect />} />

          {/* Authenticated Dashboard Layout Routes */}
          <Route
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            {/* Role Dashboards */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/faculty/dashboard"
              element={
                <ProtectedRoute allowedRoles={['FACULTY']}>
                  <FacultyDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/dashboard"
              element={
                <ProtectedRoute allowedRoles={['STUDENT']}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />

            {/* Attendance & Defaulters (CampusFlow Core Feature) */}
            <Route
              path="/attendance/marking"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'FACULTY']}>
                  <AttendanceMarkingPage />
                </ProtectedRoute>
              }
            />
            <Route path="/attendance/defaulters" element={<AttendanceDefaultersPage />} />
            <Route path="/lectures" element={<LecturesPage />} />

            {/* Academic Administration */}
            <Route
              path="/departments"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <DepartmentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/faculty"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <FacultyPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/students"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <StudentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/divisions"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <DivisionsPage />
                </ProtectedRoute>
              }
            />
            <Route path="/courses" element={<CoursesPage />} />
            <Route path="/examinations" element={<ExaminationsPage />} />

            {/* Timetable & Scheduling */}
            <Route
              path="/rooms"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <RoomsSchedulingPage />
                </ProtectedRoute>
              }
            />
            <Route path="/timetables" element={<TimetablesPage />} />

            {/* Reports & Profile */}
            <Route
              path="/reports"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
