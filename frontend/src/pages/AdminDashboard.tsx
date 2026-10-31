import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../services/api';
import {
  Users,
  GraduationCap,
  BookOpen,
  Building2,
  CalendarCheck2,
  AlertTriangle,
  Layers,
  ArrowRight,
  PlusCircle,
  FileBarChart,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await dashboardApi.getStats();
        setStats(data.stats);
      } catch (err) {
        console.error('Failed to fetch admin stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Students',
      value: stats?.total_students ?? 0,
      icon: GraduationCap,
      color: 'bg-blue-500 text-white',
      link: '/students',
    },
    {
      title: 'Total Faculty',
      value: stats?.total_faculty ?? 0,
      icon: Users,
      color: 'bg-indigo-500 text-white',
      link: '/faculty',
    },
    {
      title: 'Active Courses',
      value: stats?.total_courses ?? 0,
      icon: BookOpen,
      color: 'bg-emerald-500 text-white',
      link: '/courses',
    },
    {
      title: 'Academic Departments',
      value: stats?.total_departments ?? 0,
      icon: Building2,
      color: 'bg-purple-500 text-white',
      link: '/departments',
    },
    {
      title: 'Classrooms & Labs',
      value: stats?.total_rooms ?? 0,
      icon: Layers,
      color: 'bg-slate-700 text-white',
      link: '/rooms',
    },
    {
      title: 'Overall Attendance Avg',
      value: `${stats?.overall_attendance ?? 0}%`,
      icon: CalendarCheck2,
      color: 'bg-sky-600 text-white',
      link: '/lectures',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome & Overview Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Administrator Dashboard</h1>
          <p className="text-sm text-slate-500">System-wide academic overview and real-time operations</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/attendance/marking"
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
          >
            <CalendarCheck2 className="h-4 w-4" />
            Mark Attendance
          </Link>
          <Link
            to="/reports"
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg shadow-sm transition-colors"
          >
            <FileBarChart className="h-4 w-4" />
            System Reports
          </Link>
        </div>
      </div>

      {/* CampusFlow Highlight Alert: Monthly Defaulter Alert */}
      {stats?.monthly_defaulters_count > 0 && (
        <div className="bg-gradient-to-r from-rose-50 to-amber-50 border border-rose-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-rose-100 text-rose-600 rounded-lg shrink-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-rose-900">
                Monthly Attendance Defaulter Alert: {stats.monthly_defaulters_count} Student(s) Below 75%
              </h3>
              <p className="text-sm text-rose-700 mt-0.5">
                CampusFlow automatically identified students whose monthly lecture attendance has dropped below the 75% university eligibility requirement.
              </p>
            </div>
          </div>
          <Link
            to="/attendance/defaulters"
            className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-lg shadow transition-colors shrink-0"
          >
            Review Defaulter List
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Link
              key={idx}
              to={card.link}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-sky-300 transition-all flex items-center justify-between group"
            >
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.title}</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{card.value}</p>
                <div className="flex items-center gap-1 text-xs text-sky-600 font-medium mt-3 group-hover:translate-x-1 transition-transform">
                  <span>Manage</span>
                  <ArrowRight className="h-3 w-3" />
                </div>
              </div>
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${card.color} shadow-md`}>
                <Icon className="h-6 w-6" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions Panel */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900 mb-4">Quick Management Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <Link
            to="/departments"
            className="p-3 rounded-lg border border-slate-200 hover:bg-sky-50 hover:border-sky-300 transition-all text-center flex flex-col items-center gap-2"
          >
            <Building2 className="h-5 w-5 text-sky-600" />
            <span className="text-xs font-semibold text-slate-700">Add Dept</span>
          </Link>
          <Link
            to="/faculty"
            className="p-3 rounded-lg border border-slate-200 hover:bg-sky-50 hover:border-sky-300 transition-all text-center flex flex-col items-center gap-2"
          >
            <Users className="h-5 w-5 text-indigo-600" />
            <span className="text-xs font-semibold text-slate-700">Add Faculty</span>
          </Link>
          <Link
            to="/students"
            className="p-3 rounded-lg border border-slate-200 hover:bg-sky-50 hover:border-sky-300 transition-all text-center flex flex-col items-center gap-2"
          >
            <GraduationCap className="h-5 w-5 text-blue-600" />
            <span className="text-xs font-semibold text-slate-700">Add Student</span>
          </Link>
          <Link
            to="/courses"
            className="p-3 rounded-lg border border-slate-200 hover:bg-sky-50 hover:border-sky-300 transition-all text-center flex flex-col items-center gap-2"
          >
            <BookOpen className="h-5 w-5 text-emerald-600" />
            <span className="text-xs font-semibold text-slate-700">Add Course</span>
          </Link>
          <Link
            to="/rooms"
            className="p-3 rounded-lg border border-slate-200 hover:bg-sky-50 hover:border-sky-300 transition-all text-center flex flex-col items-center gap-2"
          >
            <Layers className="h-5 w-5 text-purple-600" />
            <span className="text-xs font-semibold text-slate-700">Allocate Room</span>
          </Link>
          <Link
            to="/examinations"
            className="p-3 rounded-lg border border-slate-200 hover:bg-sky-50 hover:border-sky-300 transition-all text-center flex flex-col items-center gap-2"
          >
            <PlusCircle className="h-5 w-5 text-amber-600" />
            <span className="text-xs font-semibold text-slate-700">Schedule Exam</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
