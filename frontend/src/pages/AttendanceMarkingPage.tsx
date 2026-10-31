import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { lectureApi, attendanceApi } from '../services/api';
import { Lecture, Course, Student } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  CalendarCheck2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Save,
  CheckCheck,
  Calendar,
  Clock,
  BookOpen,
  ArrowLeft,
} from 'lucide-react';

export const AttendanceMarkingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const initialLectureId = searchParams.get('lectureId');

  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [selectedLectureId, setSelectedLectureId] = useState<number | null>(
    initialLectureId ? parseInt(initialLectureId) : null
  );
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);
  const [attendanceState, setAttendanceState] = useState<Record<number, 'PRESENT' | 'ABSENT'>>({});
  const [loadingLectures, setLoadingLectures] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const goBack = () => {
    const from = (location.state as { from?: string } | null)?.from;
    if (from?.startsWith('/')) {
      navigate(from);
      return;
    }
    const historyIndex = window.history.state?.idx;
    if (typeof historyIndex === 'number' && historyIndex > 0) navigate(-1);
    else navigate('/lectures');
  };

  // 1. Fetch available lectures
  useEffect(() => {
    const fetchLectures = async () => {
      try {
        const lecs = await lectureApi.getAll();
        setLectures(lecs);
        if (lecs.length > 0 && !selectedLectureId) {
          setSelectedLectureId(lecs[0].lecture_id);
        }
      } catch (err) {
        console.error('Failed to load lectures:', err);
      } finally {
        setLoadingLectures(false);
      }
    };
    fetchLectures();
  }, []);

  // 2. When lecture is selected, load lecture details and existing or enrolled students
  useEffect(() => {
    if (!selectedLectureId) return;

    const loadLectureData = async () => {
      setLoadingStudents(true);
      setFeedback(null);
      try {
        const lec = await lectureApi.getById(selectedLectureId);
        setSelectedLecture(lec);

        // Use the selected class division roster, or course enrollment for older lectures.
        const students = await lectureApi.getStudents(lec.lecture_id);
        setEnrolledStudents(students);

        // Fetch existing attendance records for this lecture if already recorded
        const records = await lectureApi.getAttendance(selectedLectureId);
        const map: Record<number, 'PRESENT' | 'ABSENT'> = {};

        // Default all enrolled students to PRESENT or existing status
        students.forEach((stu) => {
          const found = records.find((r) => r.student_id === stu.student_id);
          map[stu.student_id] = found ? found.status : 'PRESENT';
        });

        setAttendanceState(map);
      } catch (err) {
        console.error('Failed to load lecture attendance data:', err);
      } finally {
        setLoadingStudents(false);
      }
    };

    loadLectureData();
  }, [selectedLectureId]);

  const toggleStatus = (studentId: number, status: 'PRESENT' | 'ABSENT') => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const markAll = (status: 'PRESENT' | 'ABSENT') => {
    const updated: Record<number, 'PRESENT' | 'ABSENT'> = {};
    enrolledStudents.forEach((s) => {
      updated[s.student_id] = status;
    });
    setAttendanceState(updated);
  };

  const handleSubmit = async () => {
    if (!selectedLectureId) return;
    setSubmitting(true);
    setFeedback(null);

    const payload = Object.entries(attendanceState).map(([sId, stat]) => ({
      student_id: parseInt(sId),
      status: stat,
      remarks: stat === 'PRESENT' ? 'Present in class' : 'Absent',
    }));

    try {
      const res = await attendanceApi.submit(selectedLectureId, payload);
      setFeedback({
        type: 'success',
        message: res.message || 'Attendance saved successfully to database.',
      });
      // Refresh lecture info
      const updatedLec = await lectureApi.getById(selectedLectureId);
      setSelectedLecture(updatedLec);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to submit attendance.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const presentCount = Object.values(attendanceState).filter((s) => s === 'PRESENT').length;
  const absentCount = Object.values(attendanceState).filter((s) => s === 'ABSENT').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Lecture Attendance Marking</h1>
          <p className="text-sm text-slate-500">Record and update daily student presence for college lectures</p>
        </div>
        <Button type="button" variant="outline" onClick={goBack}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to previous page
        </Button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          )}
          <p className="text-sm font-medium">{feedback.message}</p>
        </div>
      )}

      {/* Lecture Selector Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Select Lecture Session
        </label>
        {loadingLectures ? (
          <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
        ) : lectures.length === 0 ? (
          <p className="text-sm text-slate-500 italic">No lectures available. Please create a lecture first.</p>
        ) : (
          <select
            value={selectedLectureId || ''}
            onChange={(e) => setSelectedLectureId(parseInt(e.target.value))}
            className="w-full sm:w-auto min-w-[320px] px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-900 bg-white font-medium text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none"
          >
            {lectures.map((lec) => (
              <option key={lec.lecture_id} value={lec.lecture_id}>
                {lec.course_code}: {lec.topic || 'Class'} ({lec.date} at {lec.start_time})
              </option>
            ))}
          </select>
        )}

        {/* Selected Lecture Details Banner */}
        {selectedLecture && (
          <div className="mt-5 p-4 rounded-xl bg-sky-50/70 border border-sky-100 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700">
              <span className="flex items-center gap-1.5 font-semibold text-slate-900">
                <BookOpen className="h-4 w-4 text-sky-600" />
                {selectedLecture.course_code} - {selectedLecture.course_title}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-slate-500" />
                Date: {selectedLecture.date}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-slate-500" />
                Time: {selectedLecture.start_time} - {selectedLecture.end_time} ({selectedLecture.duration} mins)
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-600">
                Summary: <span className="text-emerald-700 font-bold">{presentCount} Present</span>,{' '}
                <span className="text-rose-700 font-bold">{absentCount} Absent</span>
              </span>
              <Badge variant={selectedLecture.attendance_recorded ? 'success' : 'warning'}>
                {selectedLecture.attendance_recorded ? 'Attendance Saved' : 'Pending Submission'}
              </Badge>
            </div>
          </div>
        )}
      </div>

      {/* Attendance Students Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Class Roster ({enrolledStudents.length})</h3>
            <p className="text-xs text-slate-500">Toggle each student's attendance status and submit below</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => markAll('PRESENT')}
              disabled={enrolledStudents.length === 0}
            >
              <CheckCheck className="h-4 w-4 mr-1 text-emerald-600" />
              All Present
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => markAll('ABSENT')}
              disabled={enrolledStudents.length === 0}
            >
              <XCircle className="h-4 w-4 mr-1 text-rose-600" />
              All Absent
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={submitting}
              onClick={handleSubmit}
              disabled={enrolledStudents.length === 0}
            >
              <Save className="h-4 w-4 mr-1" />
              Save Attendance
            </Button>
          </div>
        </div>

        {loadingStudents ? (
          <div className="p-12 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent mx-auto mb-2" />
            <p className="text-sm text-slate-500">Loading assigned class roster...</p>
          </div>
        ) : enrolledStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <CalendarCheck2 className="h-10 w-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium">
              {selectedLecture?.division_id
                ? 'No students are assigned to this lecture’s division yet.'
                : 'This lecture has no class group assigned yet.'}
            </p>
            <p className="mt-1 text-xs">
              {selectedLecture?.division_id
                ? 'Assign students to this division from the Students page.'
                : 'Open Class Lectures → Details, assign its year, branch, and division, then return here.'}
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
                  <th className="px-6 py-3.5 text-center">Attendance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {enrolledStudents.map((s) => {
                  const status = attendanceState[s.student_id] || 'PRESENT';
                  return (
                    <tr
                      key={s.student_id}
                      className={`transition-colors ${
                        status === 'PRESENT' ? 'hover:bg-emerald-50/40' : 'bg-rose-50/20 hover:bg-rose-50/50'
                      }`}
                    >
                      <td className="px-6 py-3.5 font-bold text-slate-900">{s.roll_no || `ID-${s.student_id}`}</td>
                      <td className="px-6 py-3.5 font-semibold text-slate-800">{s.full_name}</td>
                      <td className="px-6 py-3.5 text-slate-500">{s.dept_name || '-'}</td>
                      <td className="px-6 py-3.5 text-center">
                        <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-100 gap-1">
                          <button
                            type="button"
                            onClick={() => toggleStatus(s.student_id, 'PRESENT')}
                            className={`px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1.5 transition-all ${
                              status === 'PRESENT'
                                ? 'bg-emerald-600 text-white shadow'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Present
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleStatus(s.student_id, 'ABSENT')}
                            className={`px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1.5 transition-all ${
                              status === 'ABSENT'
                                ? 'bg-rose-600 text-white shadow'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
