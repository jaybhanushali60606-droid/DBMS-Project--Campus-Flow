import React, { useEffect, useState } from 'react';
import { reportApi, attendanceApi } from '../services/api';
import { AcademicSummaryReport } from '../types';
import {
  FileBarChart,
  Download,
  Building2,
  Users,
  GraduationCap,
  CalendarCheck2,
  AlertTriangle,
  Award,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [report, setReport] = useState<AcademicSummaryReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const data = await reportApi.getSummary();
        setReport(data);
      } catch (err) {
        console.error('Failed to load academic reports:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, []);

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent mx-auto" />
      </div>
    );
  }

  const currentDate = new Date();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Academic Reports</h1>
          <p className="text-sm text-slate-500">Comprehensive institution-wide metrics and academic performance analytics</p>
        </div>
        <a
          href={attendanceApi.exportCsvUrl(currentDate.getMonth() + 1, currentDate.getFullYear())}
          download
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg shadow transition-colors"
        >
          <Download className="h-4 w-4" />
          Export Current Month Defaulters CSV
        </a>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs uppercase font-semibold text-slate-500">Total Enrolled Students</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{report?.total_students}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs uppercase font-semibold text-slate-500">Total Faculty Members</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{report?.total_faculty}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs uppercase font-semibold text-slate-500">Lectures Completed</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{report?.total_lectures_held}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs uppercase font-semibold text-slate-500">Attendance Average</p>
          <p className="text-2xl font-bold text-sky-600 mt-1">{report?.overall_attendance_average}%</p>
        </div>
      </div>

      {/* Department Breakdown & Grade Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department-wise Enrollment */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5 text-sky-600" />
            <h3 className="text-base font-bold text-slate-900">Department Academic Distribution</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3 text-center">Students</th>
                  <th className="py-2.5 px-3 text-center">Faculty</th>
                  <th className="py-2.5 px-3 text-center">Courses</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report?.department_distribution.map((d) => (
                  <tr key={d.dept_id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-semibold text-slate-800">{d.dept_name}</td>
                    <td className="py-3 px-3 text-center font-bold text-blue-600">{d.students}</td>
                    <td className="py-3 px-3 text-center font-bold text-indigo-600">{d.faculty}</td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-600">{d.courses}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Grade Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Award className="h-5 w-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Institution Grade Distribution</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(report?.grade_distribution || {}).map(([grade, count]) => (
              <div key={grade} className="p-4 rounded-xl border border-slate-100 bg-slate-50 text-center">
                <span className="text-xl font-extrabold text-slate-900 block">{grade}</span>
                <span className="text-sm font-semibold text-slate-600 mt-1 block">{count} Students</span>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500">
            Grading Scale: A+ (≥90%), A (≥80%), B+ (≥70%), B (≥60%), C (≥50%), D (≥40%), F (&lt;40%)
          </div>
        </div>
      </div>
    </div>
  );
};
