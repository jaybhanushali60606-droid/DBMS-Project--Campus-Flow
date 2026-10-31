import React, { useEffect, useState } from 'react';
import { courseApi, facultyApi, divisionApi } from '../services/api';
import { Course, Faculty, Student, Division } from '../types';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { BookOpen, Plus, Edit2, Trash2, Users, GraduationCap, AlertCircle, Check, Layers } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';

export const CoursesPage: React.FC = () => {
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN';
  const [courses, setCourses] = useState<Course[]>([]);
  const [allFaculty, setAllFaculty] = useState<Faculty[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState({
    course_code: '',
    title: '',
    credits: '3',
  });

  // Assign Faculty Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assigningCourse, setAssigningCourse] = useState<Course | null>(null);
  const [selectedFacultyIds, setSelectedFacultyIds] = useState<number[]>([]);
  const [isAssignDivisionsOpen, setIsAssignDivisionsOpen] = useState(false);
  const [assigningDivisionsCourse, setAssigningDivisionsCourse] = useState<Course | null>(null);
  const [selectedDivisionIds, setSelectedDivisionIds] = useState<number[]>([]);

  // Enrolled Students Modal
  const [isStudentsModalOpen, setIsStudentsModalOpen] = useState(false);
  const [viewingCourse, setViewingCourse] = useState<Course | null>(null);
  const [courseStudents, setCourseStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cList, fList, divisionList] = await Promise.all([
        courseApi.getAll(),
        canManage ? facultyApi.getAll() : Promise.resolve([]),
        canManage ? divisionApi.getAll() : Promise.resolve([]),
      ]);
      setCourses(cList);
      setAllFaculty(fList);
      setDivisions(divisionList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [canManage]);

  const openAddModal = () => {
    setEditingCourse(null);
    setFormData({
      course_code: '',
      title: '',
      credits: '3',
    });
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (c: Course) => {
    setEditingCourse(c);
    setFormData({
      course_code: c.course_code,
      title: c.title,
      credits: c.credits.toString(),
    });
    setError(null);
    setIsModalOpen(true);
  };

  const openAssignModal = async (c: Course) => {
    setAssigningCourse(c);
    setIsAssignModalOpen(true);
    try {
      const selectedFaculty = await courseApi.getFaculty(c.course_id);
      setSelectedFacultyIds(selectedFaculty.map((faculty) => faculty.faculty_id));
    } catch (err) {
      setSelectedFacultyIds(c.assigned_faculty?.map((faculty) => faculty.faculty_id) || []);
    }
  };

  const openAssignDivisions = (course: Course) => {
    setAssigningDivisionsCourse(course);
    setSelectedDivisionIds(course.assigned_divisions?.map((division) => division.division_id) || []);
    setIsAssignDivisionsOpen(true);
  };

  const toggleDivisionSelection = (divisionId: number) => {
    setSelectedDivisionIds((selected) => selected.includes(divisionId)
      ? selected.filter((id) => id !== divisionId)
      : [...selected, divisionId]);
  };

  const handleAssignDivisions = async () => {
    if (!assigningDivisionsCourse) return;
    setSubmitting(true);
    try {
      await courseApi.assignDivisions(assigningDivisionsCourse.course_id, selectedDivisionIds);
      setIsAssignDivisionsOpen(false);
      await loadData();
    } catch (err: any) {
      window.alert(err.response?.data?.detail || 'Class assignment failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFacultySelection = (facultyId: number) => {
    if (selectedFacultyIds.includes(facultyId)) {
      setSelectedFacultyIds(selectedFacultyIds.filter((id) => id !== facultyId));
    } else {
      setSelectedFacultyIds([...selectedFacultyIds, facultyId]);
    }
  };

  const handleAssignSubmit = async () => {
    if (!assigningCourse) return;
    setSubmitting(true);
    try {
      await courseApi.assignFaculty(assigningCourse.course_id, selectedFacultyIds);
      setIsAssignModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Faculty assignment failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const openStudentsModal = async (c: Course) => {
    setViewingCourse(c);
    setIsStudentsModalOpen(true);
    setLoadingStudents(true);
    try {
      const students = await courseApi.getStudents(c.course_id);
      setCourseStudents(students);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const payload = {
      course_code: formData.course_code,
      title: formData.title,
      credits: parseInt(formData.credits),
    };

    try {
      if (editingCourse) {
        await courseApi.update(editingCourse.course_id, payload);
      } else {
        await courseApi.create(payload);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Course operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    try {
      await courseApi.delete(id);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Cannot delete course.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Academic Courses</h1>
          <p className="text-sm text-slate-500">Manage curriculum course codes, credit values, and faculty teaching assignments</p>
        </div>
        {canManage && <Button onClick={openAddModal}>
          <Plus className="h-4 w-4 mr-1.5" />
          Create Course
        </Button>}
      </div>

      {loading ? (
        <div className="p-12 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent mx-auto" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.length === 0 && <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center text-sm text-slate-500">{canManage ? 'No courses have been created yet.' : 'No courses are assigned to your account yet.'}</div>}
          {courses.map((course) => (
            <div
              key={course.course_id}
              className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-sky-100 text-sky-800 font-extrabold text-sm border border-sky-200">
                      {course.course_code}
                    </span>
                    <Badge variant="neutral">{course.credits} Credits</Badge>
                  </div>
                  {canManage && <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(course)}
                      className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-slate-100 rounded-md transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(course.course_id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-md transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>}
                </div>

                <h3 className="text-base font-bold text-slate-900 mt-3">{course.title}</h3>
                <p className="text-xs text-slate-500 mt-1">{course.dept_name || 'Shared curriculum course'}</p>
                <div className="mt-3 space-y-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Assigned classes</p>
                    {course.assigned_divisions?.length ? <div className="mt-1 flex flex-wrap gap-1">{course.assigned_divisions.map((division) => <span key={division.division_id} className="rounded-full bg-sky-50 px-2 py-1 text-[10px] font-semibold text-sky-800">Year {division.academic_year} · {division.branch} · Div {division.division_name}</span>)}</div> : <p className="mt-1 text-xs text-slate-400">No year/branch/division assigned</p>}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Teaching faculty</p>
                    {course.assigned_faculty?.length ? <p className="mt-1 text-xs text-slate-600">{course.assigned_faculty.map((faculty) => faculty.full_name).join(', ')}</p> : <p className="mt-1 text-xs text-slate-400">No faculty assigned</p>}
                  </div>
                </div>
              </div>

              {canManage && <div className="mt-6 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-xs">
                <button
                  onClick={() => openStudentsModal(course)}
                  className="flex items-center gap-1.5 font-semibold text-slate-600 hover:text-sky-700 transition-colors"
                >
                  <GraduationCap className="h-4 w-4 text-sky-600" />
                  <span>{course.enrolled_students_count ?? 0} Students</span>
                </button>

                <button
                  onClick={() => openAssignModal(course)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 font-semibold transition-colors"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>Assign Faculty</span>
                </button>
                <button onClick={() => openAssignDivisions(course)} className="flex items-center justify-center gap-1.5 rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1 text-sky-700 transition-colors hover:bg-sky-100">
                  <Layers className="h-3.5 w-3.5" /><span>Assign Classes</span>
                </button>
              </div>}
            </div>
          ))}
        </div>
      )}

      {canManage && <>
      {/* Add / Edit Course Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCourse ? 'Edit Course' : 'Create New Course'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Course Code
              </label>
              <input
                type="text"
                required
                value={formData.course_code}
                onChange={(e) => setFormData({ ...formData, course_code: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="e.g. CS101"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Credits
              </label>
              <input
                type="number"
                min="1"
                max="10"
                required
                value={formData.credits}
                onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Course Title
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="e.g. Database Management Systems"
            />
          </div>

          <p className="rounded-lg bg-sky-50 p-3 text-xs text-sky-800">Create the shared course record first, then assign it to one or more year, branch, and division groups.</p>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              {editingCourse ? 'Save Changes' : 'Create Course'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assign Faculty Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title={`Assign Teaching Faculty to ${assigningCourse?.course_code}`}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Select faculty members who are authorized to teach and mark attendance for this course:
          </p>

          <div className="max-h-64 overflow-y-auto space-y-2 border border-slate-200 rounded-lg p-3">
            {allFaculty.map((f) => {
              const isSelected = selectedFacultyIds.includes(f.faculty_id);
              return (
                <div
                  key={f.faculty_id}
                  onClick={() => toggleFacultySelection(f.faculty_id)}
                  className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-900'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div>
                    <span className="font-bold text-sm">{f.full_name}</span>
                    <div className="text-xs text-slate-500">{f.designation} • {f.dept_name}</div>
                    <div className="mt-1 text-xs text-indigo-700">Eligible groups: {f.assigned_divisions?.map((group) => `${group.academic_year}${group.branch}-${group.division_name}`).join(', ') || 'None'}</div>
                  </div>
                  <div
                    className={`h-5 w-5 rounded-md border flex items-center justify-center ${
                      isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'
                    }`}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5" />}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" isLoading={submitting} onClick={handleAssignSubmit}>
              Save Teaching Assignment
            </Button>
          </div>
        </div>
      </Modal>

      {/* Assign Course to One or More Class Divisions */}
      <Modal
        isOpen={isAssignDivisionsOpen}
        onClose={() => setIsAssignDivisionsOpen(false)}
        title={`Assign ${assigningDivisionsCourse?.course_code} to Classes`}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">Select every year, branch, and division that studies this course. The selection is saved in the course-to-division database mapping.</p>
          {divisions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Create classes from Years & Divisions first.</div>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
              {divisions.map((division) => {
                const isSelected = selectedDivisionIds.includes(division.division_id);
                return <button key={division.division_id} type="button" onClick={() => toggleDivisionSelection(division.division_id)} className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors ${isSelected ? 'border-sky-300 bg-sky-50 text-sky-900' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
                  <span><span className="block text-sm font-bold">{division.academic_year}{division.academic_year === 1 ? 'st' : division.academic_year === 2 ? 'nd' : division.academic_year === 3 ? 'rd' : 'th'} Year · {division.branch} · Division {division.division_name}</span><span className="text-xs text-slate-500">{division.students_count} students</span></span>
                  <span className={`flex h-5 w-5 items-center justify-center rounded border ${isSelected ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-300'}`}>{isSelected && <Check className="h-3.5 w-3.5" />}</span>
                </button>;
              })}
            </div>
          )}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsAssignDivisionsOpen(false)}>Cancel</Button>
            <Button type="button" isLoading={submitting} disabled={divisions.length === 0} onClick={handleAssignDivisions}>Save Class Assignments</Button>
          </div>
        </div>
      </Modal>

      {/* View Enrolled Students Modal */}
      <Modal
        isOpen={isStudentsModalOpen}
        onClose={() => setIsStudentsModalOpen(false)}
        title={`Enrolled Students in ${viewingCourse?.course_code} (${courseStudents.length})`}
        maxWidth="lg"
      >
        {loadingStudents ? (
          <div className="p-8 text-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-600 border-t-transparent mx-auto" />
          </div>
        ) : courseStudents.length === 0 ? (
          <p className="text-sm text-slate-400 italic p-4 text-center">No students enrolled yet.</p>
        ) : (
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {courseStudents.map((s) => (
              <div key={s.student_id} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-sm text-slate-900">{s.roll_no} - </span>
                  <span className="font-medium text-sm text-slate-800">{s.full_name}</span>
                </div>
                <span className="text-xs text-slate-500">{s.dept_name}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>
      </>}
    </div>
  );
};
