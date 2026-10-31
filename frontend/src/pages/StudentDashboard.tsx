import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { attendanceApi, dashboardApi, resultApi } from '../services/api';
import { AttendanceRecord, Result } from '../types';
import {
  BookOpen,
  CalendarCheck2,
  AlertTriangle,
  FileCheck2,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { DefaulterBadge, Badge } from '../components/ui/Badge';

export const StudentDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchStudentDashboard = async () => {
      try {
        const [statsRes, resRes, attendanceRes] = await Promise.all([
          dashboardApi.getStats(), resultApi.getMyResults(), attendanceApi.getMyAttendanceRecords(),
        ]);
        if (!active) return;
        setData(statsRes);
        setResults(resRes);
        setAttendanceRecords(attendanceRes);
        setLoadError(null);
      } catch (err) {
        console.error('Failed to load student dashboard:', err);
        if (active) setLoadError('Dashboard could not refresh. Check your connection and try again.');
      } finally {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };
    const refreshOnFocus = () => { if (document.visibilityState === 'visible') void fetchStudentDashboard(); };
    void fetchStudentDashboard();
    const timer = window.setInterval(() => void fetchStudentDashboard(), 20000);
    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshOnFocus);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshOnFocus);
    };
  }, []);

  const refreshDashboard = async () => {
    setRefreshing(true);
    setLoadError(null);
    try {
      const [statsRes, resultsRes, attendanceRes] = await Promise.all([
        dashboardApi.getStats(), resultApi.getMyResults(), attendanceApi.getMyAttendanceRecords(),
      ]);
      setData(statsRes);
      setResults(resultsRes);
      setAttendanceRecords(attendanceRes);
    } catch (err) {
      console.error('Failed to refresh student dashboard:', err);
      setLoadError('Dashboard could not refresh. Check your connection and try again.');
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
      </div>
    );
  }

  const profile = data?.student_profile;
  const stats = data?.stats;
  const courseAttendances = data?.courses_attendance || [];
  const isDefaulter = stats?.is_defaulter;

  return (
    <div className="space-y-8">
      {loadError && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{loadError}</div>}
      {/* Profile & Attendance Greeting */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-indigo-950 rounded-2xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm mb-3 text-sky-200">
              Student Academic Portal
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Welcome back, {profile?.name || 'Student'}!
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              Roll No: <span className="font-semibold text-white">{profile?.roll_no}</span> | Department:{' '}
              <span className="font-semibold text-white">{profile?.department}</span>
            </p>
          </div>

          {/* Quick Gauge Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 flex items-center gap-5 shrink-0">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-300 font-semibold">Overall Attendance</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span
                  className={`text-3xl font-black ${
                    isDefaulter ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {stats?.overall_attendance_percentage ?? 0}%
                </span>
                <span className="text-xs text-slate-300">
                  ({stats?.total_attended_lectures} / {stats?.total_held_lectures} classes)
                </span>
              </div>
            </div>
            <div
              className={`h-12 w-12 rounded-xl flex items-center justify-center font-bold text-xl ${
                isDefaulter ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
              }`}
            >
              {isDefaulter ? '!' : '✓'}
            </div>
          </div>
        </div>
      </div>

      {/* Critical Defaulter Warning Banner */}
      {isDefaulter && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-5 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-rose-100 text-rose-600 rounded-lg shrink-0 mt-0.5">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-rose-900">
              ATTENDANCE WARNING: You are listed on the Monthly Defaulter List
            </h3>
            <p className="text-sm text-rose-700 mt-1 leading-relaxed">
              Your overall attendance is currently at{' '}
              <span className="font-bold underline">{stats?.overall_attendance_percentage}%</span>, which is below the mandatory university threshold of <span className="font-bold">75%</span>. Please contact your department coordinator or course instructors immediately to resolve unrecorded attendance.
            </p>
            <div className="mt-3">
              <Link
                to="/attendance/defaulters"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-800 hover:text-rose-950 underline"
              >
                View Defaulter Status Details <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Course Attendance Breakdown (CampusFlow Core Feature) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Course-wise Attendance & Defaulter Status</h3>
            <p className="text-xs text-slate-500 mt-0.5">Track your live attendance status for each enrolled course</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Threshold: 75%</span>
            <button type="button" onClick={refreshDashboard} disabled={refreshing} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-50 disabled:opacity-60" aria-label="Refresh student dashboard">
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-700 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Course</th>
                <th className="px-6 py-3.5">Lectures Attended</th>
                <th className="px-6 py-3.5">Total Held</th>
                <th className="px-6 py-3.5">Attendance %</th>
                <th className="px-6 py-3.5">Eligibility Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {courseAttendances.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">
                    No attendance recorded yet. It will appear here after your faculty saves it.
                  </td>
                </tr>
              ) : (
                courseAttendances.map((c: any) => (
                  <tr key={c.course_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{c.course_code}</div>
                      <div className="text-xs text-slate-500">{c.course_title}</div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">{c.attended_lectures}</td>
                    <td className="px-6 py-4 text-slate-600">{c.total_lectures}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{c.attendance_percentage}%</span>
                        <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              c.is_defaulter ? 'bg-rose-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, c.attendance_percentage)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <DefaulterBadge percentage={c.attendance_percentage} threshold={75} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-bold text-slate-900">Recent Attendance Updates</h3>
          <p className="mt-0.5 text-xs text-slate-500">Latest attendance saved by your faculty</p>
        </div>
        {attendanceRecords.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm italic text-slate-400">No attendance updates yet. This section refreshes automatically.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {attendanceRecords.slice(0, 8).map((record) => (
              <div key={`${record.lecture_id}-${record.student_id}`} className="flex flex-col gap-2 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{record.course_code || record.course_title || 'Class'}{record.topic ? ` · ${record.topic}` : ''}</p>
                  <p className="text-xs text-slate-500">{record.lecture_date || 'Date unavailable'}{record.marked_at ? ` · Updated ${new Date(record.marked_at).toLocaleString()}` : ''}</p>
                </div>
                <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${record.status === 'PRESENT' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{record.status === 'PRESENT' ? 'Present' : 'Absent'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Exam Results & Grades */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Examination Results</h3>
            <p className="text-xs text-slate-500">Verified grades published by instructors</p>
          </div>
          <Link to="/examinations" className="text-xs font-semibold text-sky-600 hover:text-sky-700">
            View All Exams
          </Link>
        </div>

        {results.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No examination results released yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((res) => (
              <div
                key={`${res.exam_id}-${res.student_id}`}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-bold text-sky-700">{res.course_code}</span>
                  <h4 className="text-sm font-semibold text-slate-900 mt-0.5">{res.exam_type}</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Marks: <span className="font-bold text-slate-800">{res.marks}</span> / {res.max_marks}
                  </p>
                </div>
                <div className="text-center">
                  <div className="h-10 w-10 rounded-lg bg-sky-600 text-white font-extrabold flex items-center justify-center text-sm shadow-md">
                    {res.grade}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Grade</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
