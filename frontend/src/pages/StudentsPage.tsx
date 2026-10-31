import React, { useEffect, useState } from 'react';
import { studentApi, departmentApi, courseApi, divisionApi } from '../services/api';
import { Student, Department, Course, Division } from '../types';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { GraduationCap, Plus, Edit2, Trash2, Search, BookOpen, AlertCircle, Check, Eye, EyeOff } from 'lucide-react';
import { Badge } from '../components/ui/Badge';

const getOperationErrorMessage = (err: any): string => {
  const data = err?.response?.data;
  const detail = data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((item: any) => item?.msg || String(item)).join(' ');
  }
  if (typeof data?.message === 'string') return data.message;
  if (err?.response?.status) return `Request failed (HTTP ${err.response.status}). Check the backend terminal for details.`;
  return 'Could not reach the backend. Check that the backend server is running.';
};

export const StudentsPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<Division['branch'] | ''>('');
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Add/Edit student modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    f_name: '',
    m_name: '',
    l_name: '',
    dept_id: '',
    dob: '2004-01-01',
    email: '',
    password: '',
    academic_year: '1',
    branch: 'CE' as Division['branch'],
    division_id: '',
  });
  const [divisions, setDivisions] = useState<Division[]>([]);

  // Enrollment modal
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [enrollingStudent, setEnrollingStudent] = useState<Student | null>(null);
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReferenceData = async () => {
    try {
      const [dList, cList, divisionList] = await Promise.all([
        departmentApi.getAll(),
        courseApi.getAll(),
        divisionApi.getAll(),
      ]);
      setDepartments(dList);
      setAllCourses(cList);
      setDivisions(divisionList);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    void loadReferenceData();
  }, []);

  const loadStudents = async () => {
    if (!selectedDivisionId) {
      setStudents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await studentApi.getAll({
        academic_year: Number(selectedAcademicYear),
        branch: selectedBranch,
        division_id: Number(selectedDivisionId),
        search: search || undefined,
      });
      setStudents(list);
    } catch (err) {
      console.error(err);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedDivisionId) {
      setStudents([]);
      setLoading(false);
      return;
    }
    const timer = window.setTimeout(() => void loadStudents(), search ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [selectedAcademicYear, selectedBranch, selectedDivisionId, search]);

  const availableDirectoryDivisions = divisions.filter((division) =>
    (!selectedAcademicYear || division.academic_year === Number(selectedAcademicYear)) &&
    (!selectedBranch || division.branch === selectedBranch)
  );
  const canSearchDirectory = Boolean(selectedAcademicYear && selectedBranch && selectedDivisionId);
  const emailPart = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24) || 'student';
  const indianYearSuffix = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Kolkata', year: '2-digit' }).format(new Date());
  const emailPreview = editingStudent?.email || `${emailPart(formData.f_name)}.${emailPart(formData.l_name)}${indianYearSuffix}.[unique-id]@spit.ac.in`;

  const openAddModal = () => {
    setEditingStudent(null);
    setFormData({
      f_name: '',
      m_name: '',
      l_name: '',
      dept_id: departments[0]?.dept_id.toString() || '',
      dob: '2004-01-01',
      email: '',
      password: '',
      academic_year: '1',
      branch: 'CE',
      division_id: '',
    });
    setShowPassword(false);
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (s: Student) => {
    setEditingStudent(s);
    setFormData({
      f_name: s.f_name,
      m_name: s.m_name || '',
      l_name: s.l_name,
      dept_id: s.dept_id.toString(),
      dob: s.dob,
      email: s.email || '',
      password: '',
      academic_year: (s.academic_year || 1).toString(),
      branch: s.branch || 'CE',
      division_id: s.division_id?.toString() || '',
    });
    setShowPassword(false);
    setError(null);
    setIsModalOpen(true);
  };

  const openEnrollModal = async (s: Student) => {
    setEnrollingStudent(s);
    try {
      const studentCourses = await studentApi.getCourses(s.student_id);
      setSelectedCourseIds(studentCourses.map((c) => c.course_id));
      setIsEnrollModalOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleCourseSelection = (courseId: number) => {
    if (selectedCourseIds.includes(courseId)) {
      setSelectedCourseIds(selectedCourseIds.filter((id) => id !== courseId));
    } else {
      setSelectedCourseIds([...selectedCourseIds, courseId]);
    }
  };

  const handleEnrollSubmit = async () => {
    if (!enrollingStudent) return;
    setSubmitting(true);
    try {
      await studentApi.enrollCourses(enrollingStudent.student_id, selectedCourseIds);
      setIsEnrollModalOpen(false);
      await loadStudents();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Enrollment failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const payload = {
      f_name: formData.f_name,
      m_name: formData.m_name || null,
      l_name: formData.l_name,
      dept_id: parseInt(formData.dept_id),
      dob: formData.dob,
      password: formData.password || undefined,
      division_id: parseInt(formData.division_id),
      create_user_account: true,
    };

    try {
      if (editingStudent) {
        await studentApi.update(editingStudent.student_id, payload);
      } else {
        await studentApi.create(payload);
      }
      setIsModalOpen(false);
      await loadStudents();
    } catch (err: any) {
      setError(getOperationErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this student record?')) return;
    try {
      await studentApi.delete(id);
      await loadStudents();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Cannot delete student.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Student Directory</h1>
          <p className="text-sm text-slate-500">Admit students, manage roll numbers, and organize course enrollments</p>
        </div>
        <Button onClick={openAddModal}>
          <Plus className="h-4 w-4 mr-1.5" />
          Admit Student
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <select
          value={selectedAcademicYear}
          onChange={(e) => { setSelectedAcademicYear(e.target.value); setSelectedBranch(''); setSelectedDivisionId(''); setSearch(''); }}
          className="w-full sm:w-auto px-3.5 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="">Select Year</option>
          {[1, 2, 3, 4].map((year) => <option key={year} value={year}>{year}{year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'} Year</option>)}
        </select>
        <select value={selectedBranch} disabled={!selectedAcademicYear} onChange={(e) => { setSelectedBranch(e.target.value as Division['branch']); setSelectedDivisionId(''); setSearch(''); }} className="w-full sm:w-auto px-3.5 py-2 border rounded-lg text-sm bg-white disabled:bg-slate-100">
          <option value="">Select Branch</option>
          {[...new Set(divisions.filter((d) => d.academic_year === Number(selectedAcademicYear)).map((d) => d.branch))].map((branch) => <option key={branch} value={branch}>{branch}</option>)}
        </select>
        <select value={selectedDivisionId} disabled={!selectedBranch} onChange={(e) => setSelectedDivisionId(e.target.value)} className="w-full sm:w-auto px-3.5 py-2 border rounded-lg text-sm bg-white disabled:bg-slate-100">
          <option value="">Select Division</option>
          {availableDirectoryDivisions.map((d) => <option key={d.division_id} value={d.division_id}>Division {d.division_name}</option>)}
        </select>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input type="text" placeholder="Search by student name or UID..." value={search} disabled={!canSearchDirectory} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm disabled:bg-slate-100" />
        </div>
      </div>

      {/* Students Table */}
      {!canSearchDirectory ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">Select year, branch, and an available division to view students.</div>
      ) : loading ? (
        <div className="p-12 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent mx-auto" />
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">No students found in this division. Try another name or UID.</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-700 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Roll No</th>
                <th className="px-6 py-3.5">Student Name</th>
                <th className="px-6 py-3.5">Department</th>
                <th className="px-6 py-3.5">Year / Branch / Division</th>
                <th className="px-6 py-3.5">Date of Birth</th>
                <th className="px-6 py-3.5">Enrolled Courses</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((s) => (
                <tr key={s.student_id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-900">{s.roll_no || `ID-${s.student_id}`}</td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-800">{s.full_name}</div>
                    <div className="text-xs text-slate-400">{s.email || '-'}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-700 font-medium">{s.dept_name}</td>
                  <td className="px-6 py-4 text-slate-700">{s.academic_year ? `${s.academic_year}${s.academic_year === 1 ? 'st' : s.academic_year === 2 ? 'nd' : s.academic_year === 3 ? 'rd' : 'th'} · ${s.branch} · ${s.division_name}` : <span className="text-amber-700">Not assigned</span>}</td>
                  <td className="px-6 py-4 text-slate-500">{s.dob}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => openEnrollModal(s)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-semibold transition-colors border border-sky-200"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      {s.enrolled_courses_count ?? 0} Courses
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(s)}
                        className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-slate-100 rounded-md transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(s.student_id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-md transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Admit/Edit Student Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStudent ? 'Edit Student Record' : 'Admit New Student'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                First Name
              </label>
              <input
                type="text"
                required
                value={formData.f_name}
                onChange={(e) => setFormData({ ...formData, f_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Middle Name
              </label>
              <input
                type="text"
                value={formData.m_name}
                onChange={(e) => setFormData({ ...formData, m_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Last Name
              </label>
              <input
                type="text"
                required
                value={formData.l_name}
                onChange={(e) => setFormData({ ...formData, l_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-sky-100 bg-sky-50 px-3 py-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">{editingStudent ? 'Student UID' : 'Generated Student UID'}</label>
              <div className="font-semibold text-sky-800">{editingStudent?.roll_no || (formData.division_id ? 'Assigned on save' : 'Choose branch and division')}</div>
              <p className="mt-1 text-xs text-slate-500">Format: branch code + current year + 3 digit unique number.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                required
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Department
            </label>
            <select
              required
              value={formData.dept_id}
              onChange={(e) => setFormData({ ...formData, dept_id: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              {departments.map((d) => (
                <option key={d.dept_id} value={d.dept_id}>
                  {d.dept_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Year</label>
              <select required value={formData.academic_year} onChange={(e) => setFormData({ ...formData, academic_year: e.target.value, division_id: '' })} className="w-full rounded-lg border px-3 py-2 text-sm">
                {[1, 2, 3, 4].map((year) => <option key={year} value={year}>{year}{year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'} Year</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Branch</label>
              <select required value={formData.branch} onChange={(e) => setFormData({ ...formData, branch: e.target.value as Division['branch'], division_id: '' })} className="w-full rounded-lg border px-3 py-2 text-sm">
                {(['CE', 'CSE', 'EXTC'] as const).map((branch) => <option key={branch} value={branch}>{branch}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Division</label>
              <select required value={formData.division_id} onChange={(e) => setFormData({ ...formData, division_id: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm">
                <option value="">Select division</option>
                {divisions.filter((division) => division.academic_year === Number(formData.academic_year) && division.branch === formData.branch).map((division) => <option key={division.division_id} value={division.division_id}>{division.division_name}</option>)}
              </select>
            </div>
          </div>
          {divisions.filter((division) => division.academic_year === Number(formData.academic_year) && division.branch === formData.branch).length === 0 && (
            <p className="-mt-2 text-xs text-amber-700">No division exists for this class yet. <Link to="/divisions" className="font-semibold underline">Create it in Years & Divisions</Link>, then return here.</p>
          )}
          <p className="-mt-2 text-xs text-slate-500">Year, branch, and division control the lecture roster. Department above remains the academic department record.</p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              {editingStudent ? 'Student Email' : 'Generated Student Email'}
            </label>
            <input type="text" readOnly value={emailPreview} className="w-full rounded-lg border bg-slate-50 px-3 py-2 text-sm text-slate-700" />
            {!editingStudent && <p className="mt-1 text-xs text-slate-500">The system adds the student’s unique database ID when the account is created.</p>}
          </div>

          <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                {editingStudent ? 'New Login Password' : 'Login Password'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required={!editingStudent}
                  minLength={8}
                  maxLength={72}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 pr-11 border rounded-lg text-sm"
                  placeholder={editingStudent ? 'Leave blank to keep current password' : 'Set a password (at least 8 characters)'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-500 hover:text-slate-800"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {editingStudent && <p className="mt-1 text-xs text-slate-500">Leave blank to keep the current password. Enter a new one to change it.</p>}
            </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              {editingStudent ? 'Save Changes' : 'Admit Student'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Course Enrollment Modal */}
      <Modal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        title={`Course Enrollment for ${enrollingStudent?.full_name}`}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Select courses that this student is officially registered to attend this semester:
          </p>

          <div className="max-h-64 overflow-y-auto space-y-2 border border-slate-200 rounded-lg p-3">
            {allCourses.map((c) => {
              const isSelected = selectedCourseIds.includes(c.course_id);
              return (
                <div
                  key={c.course_id}
                  onClick={() => toggleCourseSelection(c.course_id)}
                  className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-sky-50 border-sky-300 text-sky-900'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div>
                    <span className="font-bold text-sm">{c.course_code}: </span>
                    <span className="font-medium text-sm">{c.title}</span>
                    <div className="text-xs text-slate-500">{c.dept_name} • {c.credits} Credits</div>
                  </div>
                  <div
                    className={`h-5 w-5 rounded-md border flex items-center justify-center ${
                      isSelected ? 'bg-sky-600 border-sky-600 text-white' : 'border-slate-300'
                    }`}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5" />}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsEnrollModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" isLoading={submitting} onClick={handleEnrollSubmit}>
              Save Enrollments
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
