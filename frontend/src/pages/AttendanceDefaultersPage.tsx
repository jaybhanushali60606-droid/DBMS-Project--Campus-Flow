import React, { useEffect, useState } from 'react';
import { attendanceApi, departmentApi, courseApi } from '../services/api';
import { MonthlyDefaulterItem, Department, Course } from '../types';
import { Button } from '../components/ui/Button';
import { DefaulterBadge } from '../components/ui/Badge';
import {
  AlertTriangle,
  Download,
  Filter,
  Search,
  CheckCircle2,
  Users,
  Building2,
  BookOpen,
  Calendar,
} from 'lucide-react';

export const AttendanceDefaultersPage: React.FC = () => {
  const currentDate = new Date();
  const [month, setMonth] = useState<number>(currentDate.getMonth() + 1);
  const [year, setYear] = useState<number>(currentDate.getFullYear());
  const [threshold, setThreshold] = useState<number>(75);
  const [deptId, setDeptId] = useState<string>('');
  const [courseId, setCourseId] = useState<string>('');
  const [defaulterOnly, setDefaulterOnly] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [items, setItems] = useState<MonthlyDefaulterItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Load departments and courses for dropdown filters
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [dList, cList] = await Promise.all([departmentApi.getAll(), courseApi.getAll()]);
        setDepartments(dList);
        setCourses(cList);
      } catch (err) {
        console.error('Failed to load filter metadata:', err);
      }
    };
    loadMetadata();
  }, []);

  // Fetch defaulters list
  const fetchDefaulters = async () => {
    setLoading(true);
    try {
      const data = await attendanceApi.getDefaulters({
        month,
        year,
        threshold,
        dept_id: deptId ? parseInt(deptId) : undefined,
        course_id: courseId ? parseInt(courseId) : undefined,
        defaulter_only: defaulterOnly,
      });
      setItems(data);
    } catch (err) {
      console.error('Failed to fetch monthly defaulters:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDefaulters();
  }, [month, year, threshold, deptId, courseId, defaulterOnly]);

  const filteredItems = items.filter(
    (item) =>
      item.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.roll_no && item.roll_no.toLowerCase().includes(searchTerm.toLowerCase())) ||
      item.course_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalDefaulters = items.filter((i) => i.is_defaulter).length;
  const totalEvaluated = items.length;

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Monthly Defaulter Generator</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
              CampusFlow Feature
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time automated evaluation of students falling below the mandatory attendance threshold
          </p>
        </div>

        <a
          href={attendanceApi.exportCsvUrl(month, year, threshold)}
          download
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg shadow transition-colors"
        >
          <Download className="h-4 w-4" />
          Export CSV Report
        </a>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Students Evaluated</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{totalEvaluated}</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Users className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-rose-200 p-5 shadow-sm flex items-center justify-between bg-rose-50/30">
          <div>
            <p className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
              Defaulters (&lt;{threshold}%)
            </p>
            <p className="text-3xl font-extrabold text-rose-600 mt-1">{totalDefaulters}</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-emerald-200 p-5 shadow-sm flex items-center justify-between bg-emerald-50/30">
          <div>
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Eligible Students</p>
            <p className="text-3xl font-extrabold text-emerald-600 mt-1">
              {totalEvaluated - totalDefaulters}
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Month Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Month
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Year
            </label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Configurable Threshold */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Threshold (%)
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value) || 75)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          {/* Department */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Department
            </label>
            <select
              value={deptId}
              onChange={(e) => setDeptId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.dept_id} value={d.dept_id}>
                  {d.dept_name}
                </option>
              ))}
            </select>
          </div>

          {/* Course */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Course
            </label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              <option value="">All Courses</option>
              {courses.map((c) => (
                <option key={c.course_id} value={c.course_id}>
                  {c.course_code} - {c.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-100">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student name, roll no, course..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          {/* Defaulter Toggle Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDefaulterOnly(!defaulterOnly)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                defaulterOnly
                  ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {defaulterOnly ? 'Showing Defaulters Only (<75%)' : 'Showing All Students'}
            </button>
          </div>
        </div>
      </div>

      {/* Defaulter Results Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent mx-auto mb-2" />
            <p className="text-sm text-slate-500">Calculating monthly attendance records...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500 mb-2" />
            <h4 className="text-base font-bold text-slate-700">No Defaulters Found</h4>
            <p className="text-sm text-slate-500 mt-1">
              All students have met or exceeded the {threshold}% attendance threshold for this period.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Roll No</th>
                  <th className="px-6 py-3.5">Student Name</th>
                  <th className="px-6 py-3.5">Department</th>
                  <th className="px-6 py-3.5">Course</th>
                  <th className="px-6 py-3.5">Attended / Total</th>
                  <th className="px-6 py-3.5">Monthly Attendance</th>
                  <th className="px-6 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr
                    key={`${item.student_id}-${item.course_id}-${item.month}-${item.year}`}
                    className={`transition-colors ${
                      item.is_defaulter ? 'bg-rose-50/30 hover:bg-rose-50/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="px-6 py-4 font-bold text-slate-900">{item.roll_no || `ID-${item.student_id}`}</td>
                    <td className="px-6 py-4 font-semibold text-slate-800">{item.student_name}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{item.dept_name}</td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-sky-700 text-xs">{item.course_code}</span>
                      <span className="text-xs text-slate-600 ml-1.5">{item.course_title}</span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {item.attended_lectures} / {item.total_lectures}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-black ${
                            item.is_defaulter ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          {item.attendance_percentage}%
                        </span>
                        <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              item.is_defaulter ? 'bg-rose-600' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, item.attendance_percentage)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <DefaulterBadge percentage={item.attendance_percentage} threshold={threshold} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
