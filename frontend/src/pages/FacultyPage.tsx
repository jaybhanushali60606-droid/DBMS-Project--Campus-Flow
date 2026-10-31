import React, { useEffect, useState } from 'react';
import { facultyApi, departmentApi, divisionApi, courseApi } from '../services/api';
import { Faculty, Department, Division, Course } from '../types';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Plus, Edit2, Trash2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Badge } from '../components/ui/Badge';

const administrativeRoleOptions = ['Head of Department', 'Dean', 'Principal', 'Exam Controller', 'Class Coordinator'];
const emailPart = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 18) || 'faculty';
const facultyEmailYear = () => new Intl.DateTimeFormat('en', { timeZone: 'Asia/Kolkata', year: '2-digit' }).format(new Date());

const ClassGroupPicker: React.FC<{
  divisions: Division[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  label: string;
  help?: string;
}> = ({ divisions, selectedIds, onChange, label, help }) => {
  const [year, setYear] = useState('');
  const [branch, setBranch] = useState('');
  const usableDivisions = divisions.filter((division) => /^[A-Za-z]$/.test(division.division_name));
  const years = [...new Set(usableDivisions.map((division) => division.academic_year))].sort((a, b) => a - b);
  const branches = [...new Set(usableDivisions.filter((division) => division.academic_year === Number(year)).map((division) => division.branch))];
  const options = usableDivisions.filter((division) => division.academic_year === Number(year) && division.branch === branch);

  return (
    <div className="space-y-2">
      <div>
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">{label}</label>
        {help && <p className="mb-2 text-xs text-slate-500">{help}</p>}
        <div className="grid grid-cols-2 gap-2">
          <select value={year} onChange={(event) => { setYear(event.target.value); setBranch(''); }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            <option value="">Select year</option>
            {years.map((item) => <option key={item} value={item}>{item}{item === 1 ? 'st' : item === 2 ? 'nd' : item === 3 ? 'rd' : 'th'} Year</option>)}
          </select>
          <select value={branch} disabled={!year} onChange={(event) => setBranch(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100">
            <option value="">Select branch</option>
            {branches.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
      </div>
      {year && branch && <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 p-2">
        {options.map((division) => {
          const checked = selectedIds.includes(division.division_id);
          return <label key={division.division_id} className={`flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs ${checked ? 'border-sky-300 bg-sky-50 text-sky-800' : 'border-slate-200 text-slate-600'}`}>
            <input type="checkbox" checked={checked} onChange={() => onChange(checked ? selectedIds.filter((id) => id !== division.division_id) : [...selectedIds, division.division_id])} />
            Division {division.division_name}
          </label>;
        })}
      </div>}
      <p className="text-xs text-slate-500">{selectedIds.length} group{selectedIds.length === 1 ? '' : 's'} selected</p>
    </div>
  );
};

export const FacultyPage: React.FC = () => {
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [courseList, setCourseList] = useState<Course[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const [viewingFaculty, setViewingFaculty] = useState<Faculty | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    f_name: '',
    m_name: '',
    l_name: '',
    dept_id: '',
    designation: 'Assistant Professor',
    course_ids: [] as number[],
    division_ids: [] as number[],
    administrative_roles: [] as string[],
    coordinator_division_ids: [] as number[],
    password: 'faculty123',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const dId = selectedDeptId ? parseInt(selectedDeptId) : undefined;
      const [fList, dList, divisionList, cList] = await Promise.all([facultyApi.getAll(dId), departmentApi.getAll(), divisionApi.getAll(), courseApi.getAll()]);
      setFacultyList(fList);
      setDepartments(dList);
      setDivisions(divisionList);
      setCourseList(cList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDeptId]);

  const openAddModal = () => {
    setEditingFaculty(null);
    setShowPassword(false);
    setFormData({
      f_name: '',
      m_name: '',
      l_name: '',
      dept_id: departments[0]?.dept_id.toString() || '',
      designation: 'Assistant Professor',
      course_ids: [],
      division_ids: [],
      administrative_roles: [],
      coordinator_division_ids: [],
      password: 'faculty123',
    });
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (f: Faculty) => {
    setViewingFaculty(null);
    setEditingFaculty(f);
    setShowPassword(false);
    setFormData({
      f_name: f.f_name,
      m_name: f.m_name || '',
      l_name: f.l_name,
      dept_id: f.dept_id.toString(),
      designation: f.designation,
      course_ids: f.assigned_courses?.map((course) => course.course_id) || [],
      division_ids: (f.assigned_divisions || []).filter((division) => /^[A-Za-z]$/.test(division.division_name)).map((division) => division.division_id),
      administrative_roles: f.administrative_roles || [],
      coordinator_division_ids: f.coordinator_division_ids || [],
      password: '',
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!formData.division_ids.length) {
      setError('Select at least one year, branch, and division teaching group.');
      return;
    }
    setSubmitting(true);

    const payload = {
      f_name: formData.f_name,
      m_name: formData.m_name || null,
      l_name: formData.l_name,
      dept_id: parseInt(formData.dept_id),
      designation: formData.designation,
      course_ids: formData.course_ids,
      division_ids: formData.division_ids,
      administrative_roles: formData.administrative_roles,
      coordinator_division_ids: formData.coordinator_division_ids,
      password: formData.password || undefined,
      create_user_account: true,
    };

    try {
      if (editingFaculty) {
        await facultyApi.update(editingFaculty.faculty_id, payload);
      } else {
        await facultyApi.create(payload);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (faculty: Faculty) => {
    const roles = [faculty.designation, ...(faculty.administrative_roles || [])].join(', ');
    if (!confirm(`Remove ${faculty.full_name} (${roles}) and their faculty login? ${faculty.administrative_roles?.includes('Head of Department') ? 'The department will have no HOD until another faculty member is assigned.' : ''}`)) return;
    try {
      await facultyApi.delete(faculty.faculty_id);
      setViewingFaculty(null);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Cannot delete faculty.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Faculty Directory</h1>
          <p className="text-sm text-slate-500">Faculty directory</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.dept_id} value={d.dept_id}>
                {d.dept_name}
              </option>
            ))}
          </select>
          <Button onClick={openAddModal}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Faculty
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent mx-auto" />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {facultyList.map((f) => (
            <article key={f.faculty_id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate font-semibold text-slate-900">{f.full_name}</h2>
                  <p className="mt-1 truncate text-sm text-slate-500">{f.dept_name}</p>
                </div>
                <Badge variant="primary">{f.designation}</Badge>
              </div>
              {f.administrative_roles?.length > 0 && <div className="mt-3 flex flex-wrap gap-1">{f.administrative_roles.map((role) => <Badge key={role} variant="warning">{role}</Badge>)}</div>}
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-xs text-slate-500">{f.assigned_courses?.length || 0} courses · {f.assigned_divisions?.length || 0} groups</span>
                <Button size="sm" variant="outline" onClick={() => setViewingFaculty(f)}><Eye className="mr-1.5 h-4 w-4" />View details</Button>
              </div>
            </article>
          ))}
          {facultyList.length === 0 && <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center text-sm text-slate-500">No faculty found.</div>}
        </div>
      )}

      <Modal isOpen={!!viewingFaculty} onClose={() => setViewingFaculty(null)} title="Faculty details" maxWidth="lg">
        {viewingFaculty && <div className="space-y-5">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{viewingFaculty.full_name}</h2>
            <p className="text-sm text-slate-500">FAC-{viewingFaculty.faculty_id} · {viewingFaculty.dept_name}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><p className="text-xs font-medium uppercase text-slate-500">Academic rank</p><p className="mt-1 text-sm text-slate-800">{viewingFaculty.designation}</p></div>
            <div><p className="text-xs font-medium uppercase text-slate-500">Email / login</p><p className="mt-1 break-all text-sm text-slate-800">{viewingFaculty.email || '—'}</p></div>
            <div className="sm:col-span-2"><p className="text-xs font-medium uppercase text-slate-500">Assigned courses</p><p className="mt-1 text-sm text-slate-800">{viewingFaculty.assigned_courses?.map((course) => `${course.course_code} · ${course.title}`).join(', ') || 'None assigned'}</p></div>
            <div className="sm:col-span-2"><p className="text-xs font-medium uppercase text-slate-500">Administrative roles</p><p className="mt-1 text-sm text-slate-800">{viewingFaculty.administrative_roles?.join(', ') || 'None'}</p></div>
            <div className="sm:col-span-2"><p className="text-xs font-medium uppercase text-slate-500">Teaching groups</p><p className="mt-1 text-sm text-slate-800">{viewingFaculty.assigned_divisions?.map((d) => `${d.academic_year}${d.academic_year === 1 ? 'st' : d.academic_year === 2 ? 'nd' : d.academic_year === 3 ? 'rd' : 'th'} Year · ${d.branch} · Div ${d.division_name}`).join(', ') || 'None assigned'}</p></div>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button variant="danger" onClick={() => handleDelete(viewingFaculty)}><Trash2 className="mr-1.5 h-4 w-4" />Remove</Button>
            <Button onClick={() => openEditModal(viewingFaculty)}><Edit2 className="mr-1.5 h-4 w-4" />Edit faculty</Button>
          </div>
        </div>}
      </Modal>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingFaculty ? 'Edit Faculty Member' : 'Register New Faculty Member'}
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Department
            </label>
            <select
              required
              value={formData.dept_id}
              onChange={(e) => {
                const deptId = Number(e.target.value);
                const deptCourseIds = new Set(courseList.filter((course) => course.dept_id === deptId).map((course) => course.course_id));
                setFormData({ ...formData, dept_id: e.target.value, course_ids: formData.course_ids.filter((courseId) => deptCourseIds.has(courseId)) });
              }}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              {departments.map((d) => (
                <option key={d.dept_id} value={d.dept_id}>
                  {d.dept_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Academic Rank *
            </label>
            <select
              required
              value={formData.designation}
              onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="Assistant Professor">Assistant Professor</option>
              <option value="Associate Professor">Associate Professor</option>
              <option value="Professor">Professor</option>
              <option value="Senior Professor">Senior Professor</option>
              <option value="Lecturer">Lecturer</option>
              <option value="Visiting Professor">Visiting Professor</option>
              <option value="Visiting Lecturer">Visiting Lecturer</option>
              <option value="Adjunct Faculty">Adjunct Faculty</option>
              <option value="Professor of Practice">Professor of Practice</option>
              <option value="Lab Instructor">Lab Instructor</option>
            </select>
          </div>

          <section className="space-y-2 rounded-lg border border-slate-200 p-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">Administrative roles</h3>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {administrativeRoleOptions.map((role) => {
                const checked = formData.administrative_roles.includes(role);
                return <label key={role} className="flex cursor-pointer items-start gap-2 rounded-md border border-slate-200 p-2 text-sm text-slate-700">
                  <input type="checkbox" checked={checked} onChange={() => setFormData({
                    ...formData,
                    administrative_roles: checked ? formData.administrative_roles.filter((item) => item !== role) : [...formData.administrative_roles, role],
                    coordinator_division_ids: role === 'Class Coordinator' && checked ? [] : formData.coordinator_division_ids,
                  })} />
                  <span>{role}</span>
                </label>;
              })}
            </div>
            {formData.administrative_roles.includes('Class Coordinator') && <ClassGroupPicker
              divisions={divisions.filter((division) => formData.division_ids.includes(division.division_id))}
              selectedIds={formData.coordinator_division_ids}
              onChange={(ids) => setFormData({ ...formData, coordinator_division_ids: ids })}
              label="Coordinator class groups *"
            />}
          </section>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Available courses</label>
            <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
              {courseList.filter((course) => course.dept_id === Number(formData.dept_id)).map((course) => {
                const checked = formData.course_ids.includes(course.course_id);
                return <label key={course.course_id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <input type="checkbox" checked={checked} onChange={() => setFormData({ ...formData, course_ids: checked ? formData.course_ids.filter((id) => id !== course.course_id) : [...formData.course_ids, course.course_id] })} />
                  <span><b>{course.course_code}</b> · {course.title}</span>
                </label>;
              })}
              {courseList.filter((course) => course.dept_id === Number(formData.dept_id)).length === 0 && <p className="px-2 py-3 text-sm text-slate-500">No courses in this department yet.</p>}
            </div>
            <p className="text-xs text-slate-500">{formData.course_ids.length} course{formData.course_ids.length === 1 ? '' : 's'} selected</p>
          </div>

          <ClassGroupPicker
            divisions={divisions}
            selectedIds={formData.division_ids}
            onChange={(ids) => setFormData({ ...formData, division_ids: ids, coordinator_division_ids: formData.coordinator_division_ids.filter((id) => ids.includes(id)) })}
            label="Eligible teaching groups *"
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Generated faculty email / login</label>
            <input type="text" readOnly value={editingFaculty?.email || `${emailPart(formData.f_name)}.${emailPart(formData.l_name)}${facultyEmailYear()}.[unique-id]@spit.ac.in`} className="w-full rounded-lg border bg-slate-50 px-3 py-2 text-sm text-slate-700" />
            <p className="mt-1 text-xs text-slate-500">Auto-generated and locked after registration.</p>
          </div>

          {!editingFaculty && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Initial Account Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 pr-11 border rounded-lg text-sm"
                  placeholder="faculty123"
                  autoComplete="new-password"
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
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              {editingFaculty ? 'Save Changes' : 'Register Faculty'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
