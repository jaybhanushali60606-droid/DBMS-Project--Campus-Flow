import React, { useEffect, useState } from 'react';
import { departmentApi, facultyApi } from '../services/api';
import { Department, Faculty } from '../types';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Building2, Plus, Edit2, Trash2, Users, BookOpen, GraduationCap, AlertCircle } from 'lucide-react';

export const DepartmentsPage: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState({ dept_name: '', building: '', head_id: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dList, fList] = await Promise.all([departmentApi.getAll(), facultyApi.getAll()]);
      setDepartments(dList);
      setFacultyList(fList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingDept(null);
    setFormData({ dept_name: '', building: '', head_id: '' });
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (d: Department) => {
    setEditingDept(d);
    setFormData({
      dept_name: d.dept_name,
      building: d.building,
      head_id: d.head_id ? d.head_id.toString() : '',
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const payload = {
      dept_name: formData.dept_name,
      building: formData.building,
      head_id: formData.head_id ? parseInt(formData.head_id) : undefined,
    };

    try {
      if (editingDept) {
        await departmentApi.update(editingDept.dept_id, payload);
      } else {
        await departmentApi.create(payload);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this department?')) return;
    try {
      await departmentApi.delete(id);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Cannot delete department.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Academic Departments</h1>
          <p className="text-sm text-slate-500">Manage academic departments, buildings, and appointed department heads</p>
        </div>
        <Button onClick={openAddModal}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Department
        </Button>
      </div>

      {loading ? (
        <div className="p-12 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent mx-auto" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {departments.map((dept) => (
            <div
              key={dept.dept_id}
              className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="h-10 w-10 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(dept)}
                      className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-slate-100 rounded-md transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(dept.dept_id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-md transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-900 mt-4">{dept.dept_name}</h3>
                <p className="text-xs text-slate-500 mt-1">Location: <span className="font-medium text-slate-700">{dept.building}</span></p>
                <p className="text-xs text-slate-500 mt-1">
                  Head of Dept: <span className="font-semibold text-sky-800">{dept.head_name || 'Not Assigned'}</span>
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-slate-50 p-2 rounded-lg">
                  <span className="font-bold text-slate-800 text-sm block">{dept.student_count ?? 0}</span>
                  <span className="text-slate-500 text-[10px]">Students</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg">
                  <span className="font-bold text-slate-800 text-sm block">{dept.faculty_count ?? 0}</span>
                  <span className="text-slate-500 text-[10px]">Faculty</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg">
                  <span className="font-bold text-slate-800 text-sm block">{dept.course_count ?? 0}</span>
                  <span className="text-slate-500 text-[10px]">Courses</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Department Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDept ? 'Edit Department' : 'Create New Department'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Department Name
            </label>
            <input
              type="text"
              required
              value={formData.dept_name}
              onChange={(e) => setFormData({ ...formData, dept_name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
              placeholder="e.g. Computer Science & Engineering"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Building / Block
            </label>
            <input
              type="text"
              required
              value={formData.building}
              onChange={(e) => setFormData({ ...formData, building: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
              placeholder="e.g. Alan Turing Block"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Head of Department (Faculty)
            </label>
            <select
              value={formData.head_id}
              onChange={(e) => setFormData({ ...formData, head_id: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              <option value="">Select Faculty Head (Optional)</option>
              {facultyList.map((f) => (
                <option key={f.faculty_id} value={f.faculty_id}>
                  {f.full_name} ({f.designation})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              {editingDept ? 'Update Department' : 'Create Department'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
