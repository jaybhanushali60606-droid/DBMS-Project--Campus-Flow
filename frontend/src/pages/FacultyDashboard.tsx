import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi, lectureApi } from '../services/api';
import { Lecture } from '../types';
import {
  BookOpen,
  Users,
  CalendarCheck2,
  AlertTriangle,
  FileCheck2,
  Calendar,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';

export const FacultyDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [recentLectures, setRecentLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const statsRes = await dashboardApi.getStats();
        setData(statsRes);
        const lecturesRes = await lectureApi.getAll();
        setRecentLectures(lecturesRes.slice(0, 5));
      } catch (err) {
        console.error('Failed to load faculty dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
      </div>
    );
  }

  const stats = data?.stats;
  const assignedCourses = data?.assigned_courses || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Faculty Teaching Portal</h1>
          <p className="text-sm text-slate-500">Manage course teaching, daily attendance, and student evaluations</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/attendance/marking"
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
          >
            <CalendarCheck2 className="h-4 w-4" />
            Mark Today's Attendance
          </Link>
          <Link
            to="/examinations"
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg shadow-sm transition-colors"
          >
            <FileCheck2 className="h-4 w-4" />
            Enter Exam Marks
          </Link>
        </div>
      </div>

      {/* Defaulter warning if any in assigned courses */}
      {stats?.defaulters_in_courses > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-100 text-amber-700 rounded-lg shrink-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-amber-900">
                Attendance Alert: {stats.defaulters_in_courses} Student(s) in your courses are Defaulters (&lt;75%)
              </h3>
              <p className="text-sm text-amber-700 mt-0.5">
                Students below the threshold will not be permitted to sit for final semester examinations without medical condonation.
              </p>
            </div>
          </div>
          <Link
            to="/attendance/defaulters"
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg shadow transition-colors shrink-0"
          >
            View Course Defaulters
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned Courses</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{stats?.assigned_courses_count ?? 0}</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
            <BookOpen className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Students Taught</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{stats?.students_taught ?? 0}</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
            <Users className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Lectures Delivered</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{stats?.lectures_delivered ?? 0}</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <CalendarCheck2 className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Course Defaulters</p>
            <p className="text-3xl font-bold text-rose-600 mt-1">{stats?.defaulters_in_courses ?? 0}</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Courses & Recent Lectures Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assigned Courses List */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-900">My Assigned Courses</h3>
            <Link to="/courses" className="text-xs font-semibold text-sky-600 hover:text-sky-700">
              View All
            </Link>
          </div>
          {assignedCourses.length === 0 ? (
            <p className="text-sm text-slate-500 italic">No courses currently assigned.</p>
          ) : (
            <div className="space-y-3">
              {assignedCourses.map((c: any) => (
                <div
                  key={c.course_id}
                  className="p-4 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between hover:bg-sky-50/50 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sky-700 text-sm">{c.course_code}</span>
                      <span className="font-medium text-slate-900 text-sm">{c.title}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/attendance/marking?courseId=${c.course_id}`}
                      className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-md transition-colors"
                    >
                      Attendance
                    </Link>
                    <Link
                      to={`/attendance/defaulters?courseId=${c.course_id}`}
                      className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-md transition-colors"
                    >
                      Defaulters
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Lectures */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-900">Recent Lectures & Attendance Status</h3>
            <Link to="/lectures" className="text-xs font-semibold text-sky-600 hover:text-sky-700">
              View All
            </Link>
          </div>
          {recentLectures.length === 0 ? (
            <p className="text-sm text-slate-500 italic">No lectures conducted yet.</p>
          ) : (
            <div className="space-y-3">
              {recentLectures.map((lec) => (
                <div
                  key={lec.lecture_id}
                  className="p-3.5 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between text-sm"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{lec.course_code}: {lec.topic || 'Lecture Session'}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {lec.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {lec.start_time} - {lec.end_time}
                      </span>
                    </div>
                  </div>
                  <div>
                    {lec.attendance_recorded ? (
                      <Badge variant="success">
                        {lec.present_count} / {lec.present_count! + lec.absent_count!} Present
                      </Badge>
                    ) : (
                      <Link
                        to={`/attendance/marking?lectureId=${lec.lecture_id}`}
                        className="px-2.5 py-1 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-md transition-colors"
                      >
                        Mark Now
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
