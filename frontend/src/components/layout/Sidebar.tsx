import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  Users,
  GraduationCap,
  BookOpen,
  CalendarCheck2,
  AlertTriangle,
  FileCheck2,
  Layers,
  Calendar,
  BarChart3,
  UserCircle,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role;

  const getDashboardPath = () => {
    switch (role) {
      case 'ADMIN':
        return '/admin/dashboard';
      case 'FACULTY':
        return '/faculty/dashboard';
      case 'STUDENT':
        return '/student/dashboard';
      default:
        return '/login';
    }
  };

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-sky-600 text-white shadow-sm'
        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    }`;

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
        <div className="h-8 w-8 rounded-lg bg-sky-500 flex items-center justify-center text-white font-black text-lg shadow-md shadow-sky-500/20">
          CF
        </div>
        <div>
          <h1 className="text-white font-bold tracking-tight text-base">CampusFlow</h1>
          <p className="text-[10px] text-sky-400 font-medium uppercase tracking-wider">College Management</p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {/* Core Main Section */}
        <div>
          <div className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Overview
          </div>
          <nav className="space-y-1">
            <NavLink to={getDashboardPath()} className={navItemClass}>
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
            </NavLink>
          </nav>
        </div>

        {/* Attendance & Defaulters (CampusFlow Highest Priority Feature) */}
        <div>
          <div className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Attendance Core
          </div>
          <nav className="space-y-1">
            {(role === 'ADMIN' || role === 'FACULTY') && (
              <NavLink to="/attendance/marking" className={navItemClass}>
                <CalendarCheck2 className="h-4 w-4" />
                <span>Mark Attendance</span>
              </NavLink>
            )}
            <NavLink to="/attendance/defaulters" className={navItemClass}>
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span>Monthly Defaulters</span>
            </NavLink>
            <NavLink to="/lectures" className={navItemClass}>
              <CalendarCheck2 className="h-4 w-4" />
              <span>Lectures</span>
            </NavLink>
          </nav>
        </div>

        {/* Academic Records */}
        <div>
          <div className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Academics
          </div>
          <nav className="space-y-1">
            {role === 'ADMIN' && (
              <>
                <NavLink to="/departments" className={navItemClass}>
                  <Building2 className="h-4 w-4" />
                  <span>Departments</span>
                </NavLink>
                <NavLink to="/faculty" className={navItemClass}>
                  <Users className="h-4 w-4" />
                  <span>Faculty</span>
                </NavLink>
                <NavLink to="/students" className={navItemClass}>
                  <GraduationCap className="h-4 w-4" />
                  <span>Students</span>
                </NavLink>
                <NavLink to="/divisions" className={navItemClass}>
                  <Layers className="h-4 w-4" />
                  <span>Years & Divisions</span>
                </NavLink>
              </>
            )}
            <NavLink to="/courses" className={navItemClass}>
              <BookOpen className="h-4 w-4" />
              <span>Courses</span>
            </NavLink>
            <NavLink to="/examinations" className={navItemClass}>
              <FileCheck2 className="h-4 w-4" />
              <span>Exams & Results</span>
            </NavLink>
          </nav>
        </div>

        {/* Timetable & Classroom Scheduling */}
        <div>
          <div className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Scheduling
          </div>
          <nav className="space-y-1">
            {role === 'ADMIN' && (
              <NavLink to="/rooms" className={navItemClass}>
                <Layers className="h-4 w-4" />
                <span>Rooms & Allocations</span>
              </NavLink>
            )}
            <NavLink to="/timetables" className={navItemClass}>
              <Calendar className="h-4 w-4" />
              <span>Weekly Timetable</span>
            </NavLink>
          </nav>
        </div>

        {/* Reports & Profile */}
        <div>
          <div className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            System
          </div>
          <nav className="space-y-1">
            {role === 'ADMIN' && (
              <NavLink to="/reports" className={navItemClass}>
                <BarChart3 className="h-4 w-4" />
                <span>System Reports</span>
              </NavLink>
            )}
            <NavLink to="/profile" className={navItemClass}>
              <UserCircle className="h-4 w-4" />
              <span>My Profile</span>
            </NavLink>
          </nav>
        </div>
      </div>

      {/* Role Footer */}
      <div className="p-4 border-t border-slate-800 text-xs text-slate-400">
        <p className="font-medium text-slate-300">CampusFlow v1.0</p>
        <p>PostgreSQL Connected</p>
      </div>
    </aside>
  );
};
