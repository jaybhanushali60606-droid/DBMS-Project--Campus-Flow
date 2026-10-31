import React, { useEffect, useState } from 'react';
import { examApi, courseApi, facultyApi, resultApi, divisionApi } from '../services/api';
import { Exam, Course, Faculty, Student, Result, Division } from '../types';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { FileCheck2, Plus, Edit2, Trash2, Calendar, BookOpen, AlertCircle, Save, Check } from 'lucide-react';
import { Badge } from '../components/ui/Badge';

export const ExaminationsPage: React.FC = () => {
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'FACULTY';
  const [exams, setExams] = useState<Exam[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [myResults, setMyResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Exam Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    course_id: '',
    faculty_id: '',
    exam_type: 'Midterm',
    exam_date: new Date().toISOString().split('T')[0],
    max_marks: '100',
    division_id: '',
  });

  // Enter Marks Modal
  const [isMarksModalOpen, setIsMarksModalOpen] = useState(false);
  const [currentExam, setCurrentExam] = useState<Exam | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);
  const [marksState, setMarksState] = useState<Record<number, number>>({});
  const [loadingStudents, setLoadingStudents] = useState(false);

  // View Results Modal
  const [isViewResultsModalOpen, setIsViewResultsModalOpen] = useState(false);
  const [examResults, setExamResults] = useState<Result[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [eList, cList, fList, divisionList, studentResults] = await Promise.all([
        examApi.getAll(),
        courseApi.getAll(),
        canManage ? facultyApi.getAll() : Promise.resolve([]),
        canManage ? divisionApi.getAll() : Promise.resolve([]),
        user?.role === 'STUDENT' ? resultApi.getMyResults() : Promise.resolve([]),
      ]);
      setExams(eList);
      setCourses(cList);
      setFacultyList(fList);
      setDivisions(divisionList);
      setMyResults(studentResults);
    } catch (err) {
      console.error(err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    if (user?.role !== 'STUDENT') return;
    const refreshOnFocus = () => { if (document.visibilityState === 'visible') void loadData(false); };
    const timer = window.setInterval(() => void loadData(false), 20000);
    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshOnFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshOnFocus);
    };
  }, [canManage, user?.role]);

  const openAddModal = () => {
    const initialCourse = courses[0];
    const initialDivisions = initialCourse?.assigned_divisions?.length ? initialCourse.assigned_divisions : divisions;
    const initialFaculty = initialCourse?.assigned_faculty?.length ? initialCourse.assigned_faculty : facultyList;
    setFormData({
      course_id: initialCourse?.course_id.toString() || '',
      faculty_id: initialFaculty[0]?.faculty_id.toString() || '',
      exam_type: 'Midterm',
      exam_date: new Date().toISOString().split('T')[0],
      max_marks: '100',
      division_id: initialDivisions[0]?.division_id.toString() || '',
    });
    setError(null);
    setIsModalOpen(true);
  };

  const selectedFormCourse = courses.find((course) => course.course_id.toString() === formData.course_id);
  const availableFormDivisions = selectedFormCourse?.assigned_divisions?.length ? selectedFormCourse.assigned_divisions : divisions;

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const payload = {
      course_id: parseInt(formData.course_id),
      faculty_id: formData.faculty_id ? parseInt(formData.faculty_id) : undefined,
      exam_type: formData.exam_type,
      exam_date: formData.exam_date,
      max_marks: parseFloat(formData.max_marks),
      division_id: formData.division_id ? parseInt(formData.division_id) : undefined,
    };

    try {
      await examApi.create(payload);
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create exam.');
    } finally {
      setSubmitting(false);
    }
  };

  const openEnterMarksModal = async (ex: Exam) => {
    setCurrentExam(ex);
    setIsMarksModalOpen(true);
    setLoadingStudents(true);
    setError(null);

    try {
      const [students, results] = await Promise.all([
        examApi.getStudents(ex.exam_id),
        resultApi.getAll({ exam_id: ex.exam_id }),
      ]);
      setEnrolledStudents(students);

      const mState: Record<number, number> = {};
      students.forEach((s) => {
        const found = results.find((r) => r.student_id === s.student_id);
        if (found) {
          mState[s.student_id] = found.marks;
        }
      });
      setMarksState(mState);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const openViewResultsModal = async (ex: Exam) => {
    setCurrentExam(ex);
    setIsViewResultsModalOpen(true);
    try {
      const res = await resultApi.getAll({ exam_id: ex.exam_id });
      setExamResults(res);
    } catch (err) {
      console.error(err);
    }
  };

  const calculateGradeHelper = (marks: number, max: number) => {
    if (max <= 0) return 'F';
    const pct = (marks / max) * 100;
    if (pct >= 90) return 'A+';
    if (pct >= 80) return 'A';
    if (pct >= 70) return 'B+';
    if (pct >= 60) return 'B';
    if (pct >= 50) return 'C';
    if (pct >= 40) return 'D';
    return 'F';
  };

  const handleSaveMarks = async () => {
    if (!currentExam) return;
    setSubmitting(true);
    setError(null);

    const payload = Object.entries(marksState).map(([sId, marks]) => ({
      student_id: parseInt(sId),
      marks: Number(marks),
      grade: calculateGradeHelper(Number(marks), currentExam.max_marks),
    }));

    try {
      await resultApi.bulkSubmit(currentExam.exam_id, payload);
      setIsMarksModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit marks.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this exam?')) return;
    try {
      await examApi.delete(id);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Cannot delete exam.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Examinations & Results</h1>
          <p className="text-sm text-slate-500">Create examinations, enter evaluated marks, and compute student grade scores</p>
        </div>
        {canManage && <Button onClick={openAddModal}>
          <Plus className="h-4 w-4 mr-1.5" />
          Schedule Exam
        </Button>}
      </div>

      {loading ? (
        <div className="p-12 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent mx-auto" />
        </div>
      ) : exams.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          <FileCheck2 className="h-10 w-10 mx-auto text-slate-300 mb-2" />
          <h4 className="text-base font-bold text-slate-700">No Examinations Scheduled</h4>
          <p className="text-sm text-slate-500 mt-1">Schedule your first exam to record marks and grades.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {exams.map((ex) => (
            <div
              key={ex.exam_id}
              className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm px-2.5 py-1 rounded bg-sky-100 text-sky-800">
                      {ex.course_code}
                    </span>
                    <Badge variant="purple">{ex.exam_type}</Badge>
                  </div>
                  {canManage && <button
                    onClick={() => handleDelete(ex.exam_id)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>}
                </div>

                <h3 className="text-base font-bold text-slate-900 mt-3">{ex.course_title}</h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  Date: {ex.exam_date}
                </div>
                <div className="text-xs text-slate-600 font-medium mt-1">
                  Maximum Marks: <span className="font-bold text-slate-900">{ex.max_marks} pts</span>
                </div>
                {ex.academic_year && <div className="mt-2 inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">{ex.academic_year}{ex.academic_year === 1 ? 'st' : ex.academic_year === 2 ? 'nd' : ex.academic_year === 3 ? 'rd' : 'th'} Year · {ex.branch} · Division {ex.division_name}</div>}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  onClick={() => openViewResultsModal(ex)}
                  className="font-semibold text-slate-600 hover:text-sky-700 transition-colors"
                >
                  {user?.role === 'STUDENT' ? 'View your result' : `${ex.total_results ?? 0} Results Entered`}
                </button>
                {user?.role === 'STUDENT' ? (() => {
                  const result = myResults.find((item) => item.exam_id === ex.exam_id);
                  return result ? <span className="font-bold text-emerald-700">{result.marks}/{result.max_marks} · {result.grade}</span> : <span className="text-slate-400">Result pending</span>;
                })() : canManage && <Button size="sm" variant="primary" onClick={() => openEnterMarksModal(ex)}>Enter Marks</Button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule Exam Modal */}
      {canManage && <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Schedule New Examination">
        <form onSubmit={handleCreateExam} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Course
            </label>
            <select
              required
              value={formData.course_id}
              onChange={(e) => {
                const nextCourse = courses.find((course) => course.course_id.toString() === e.target.value);
                const nextDivisions = nextCourse?.assigned_divisions?.length ? nextCourse.assigned_divisions : divisions;
                const nextFaculty = nextCourse?.assigned_faculty?.length ? nextCourse.assigned_faculty : facultyList;
                setFormData({ ...formData, course_id: e.target.value, division_id: nextDivisions[0]?.division_id.toString() || '', faculty_id: nextFaculty[0]?.faculty_id.toString() || '' });
              }}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              {courses.map((c) => (
                <option key={c.course_id} value={c.course_id}>
                  {c.course_code} - {c.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Year, Branch & Division <span className="text-rose-600">*</span></label>
            <select required value={formData.division_id} onChange={(e) => setFormData({ ...formData, division_id: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm">
              <option value="">Select class</option>
              {availableFormDivisions.map((division) => <option key={division.division_id} value={division.division_id}>{division.academic_year}{division.academic_year === 1 ? 'st' : division.academic_year === 2 ? 'nd' : division.academic_year === 3 ? 'rd' : 'th'} Year · {division.branch} · Division {division.division_name} ({division.students_count} students)</option>)}
            </select>
            {divisions.length === 0 && <p className="mt-1 text-xs text-amber-700">Create a class in Years & Divisions before scheduling an exam.</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Exam Type
              </label>
              <select
                required
                value={formData.exam_type}
                onChange={(e) => setFormData({ ...formData, exam_type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="Midterm">Midterm</option>
                <option value="Final">Final Examination</option>
                <option value="Quiz 1">Quiz 1</option>
                <option value="Quiz 2">Quiz 2</option>
                <option value="Practical">Practical Lab Exam</option>
                <option value="Assignment">Assignment</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Max Marks
              </label>
              <input
                type="number"
                min="10"
                max="200"
                required
                value={formData.max_marks}
                onChange={(e) => setFormData({ ...formData, max_marks: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Exam Date
            </label>
            <input
              type="date"
              required
              value={formData.exam_date}
              onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Save Examination
            </Button>
          </div>
        </form>
      </Modal>}

      {/* Enter Marks Modal */}
      {canManage && <Modal
        isOpen={isMarksModalOpen}
        onClose={() => setIsMarksModalOpen(false)}
        title={`Enter Marks: ${currentExam?.course_code} ${currentExam?.exam_type} (Max: ${currentExam?.max_marks})`}
        maxWidth="xl"
      >
        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loadingStudents ? (
            <div className="p-8 text-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-600 border-t-transparent mx-auto" />
            </div>
          ) : enrolledStudents.length === 0 ? (
            <p className="text-sm text-slate-400 italic p-4 text-center">No students enrolled in this course.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg p-3">
              {enrolledStudents.map((s) => {
                const marksVal = marksState[s.student_id];
                const grade = marksVal !== undefined ? calculateGradeHelper(Number(marksVal), currentExam!.max_marks) : '-';
                return (
                  <div key={s.student_id} className="py-2.5 flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="font-bold text-sm text-slate-900">{s.roll_no}</div>
                      <div className="text-xs text-slate-600">{s.full_name}</div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max={currentExam!.max_marks}
                          value={marksVal}
                          onChange={(e) =>
                            setMarksState({
                              ...marksState,
                              [s.student_id]: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-20 px-2 py-1 border rounded text-sm text-right font-bold text-slate-900 focus:ring-2 focus:ring-sky-500"
                          placeholder="0.0"
                        />
                        <span className="text-xs text-slate-400 font-medium">/ {currentExam!.max_marks}</span>
                      </div>

                      <div className="w-10 text-center">
                        <span className="font-extrabold text-sm px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                          {grade}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsMarksModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" isLoading={submitting} onClick={handleSaveMarks}>
              <Save className="h-4 w-4 mr-1" />
              Save Results
            </Button>
          </div>
        </div>
      </Modal>}

      {/* View Results Modal */}
      <Modal
        isOpen={isViewResultsModalOpen}
        onClose={() => setIsViewResultsModalOpen(false)}
        title={`Results for ${currentExam?.course_code} ${currentExam?.exam_type}`}
        maxWidth="lg"
      >
        {examResults.length === 0 ? (
          <p className="text-sm text-slate-400 italic p-6 text-center">No results entered for this exam yet.</p>
        ) : (
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {examResults.map((r) => (
              <div key={`${r.exam_id}-${r.student_id}`} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-sm text-slate-900">{r.roll_no} - </span>
                  <span className="font-medium text-sm text-slate-800">{r.student_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-sm text-slate-700">
                    {r.marks} / {r.max_marks} ({r.percentage}%)
                  </span>
                  <span className="font-extrabold text-xs px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                    {r.grade}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};
