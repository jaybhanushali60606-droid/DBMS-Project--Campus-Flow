import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { lectureApi, courseApi, facultyApi, roomApi, divisionApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Lecture, Course, Faculty, Room, Division, Student } from '../types';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { CalendarCheck2, Plus, Calendar, Clock, BookOpen, Layers, CheckCircle2, AlertCircle, Eye, UserRound, Trash2 } from 'lucide-react';
import { Badge } from '../components/ui/Badge';

const getIndiaDateTime = (instant: Date) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value || '00';
  return {
    date: `${part('year')}-${part('month')}-${part('day')}`,
    time: `${part('hour')}:${part('minute')}:${part('second')}`,
  };
};

const addMinutesToTime = (time: string, minutes: number) => {
  const [hoursRaw, minutesRaw, secondsRaw = '00'] = time.split(':');
  const hours = Number(hoursRaw);
  const mins = Number(minutesRaw);
  const seconds = Number(secondsRaw);
  const totalSeconds = Math.min(23 * 3600 + 59 * 60 + 59, hours * 3600 + mins * 60 + seconds + minutes * 60);
  return [Math.floor(totalSeconds / 3600), Math.floor((totalSeconds % 3600) / 60), totalSeconds % 60]
    .map((value) => String(value).padStart(2, '0')).join(':');
};

const getDefaultLectureSlot = () => {
  const start = new Date(Date.now() + 60_000);
  start.setSeconds(0, 0);
  const local = getIndiaDateTime(start);
  return { date: local.date, start_time: local.time, end_time: addMinutesToTime(local.time, 60) };
};

export const LecturesPage: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'FACULTY';
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailLecture, setDetailLecture] = useState<Lecture | null>(null);
  const [detailStudents, setDetailStudents] = useState<Student[]>([]);
  const [detailDivisionId, setDetailDivisionId] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailSaving, setDetailSaving] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    course_id: '',
    faculty_id: '',
    room_id: '',
    ...getDefaultLectureSlot(),
    topic: '',
    division_id: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const indiaNow = getIndiaDateTime(new Date());

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const cId = selectedCourseId ? parseInt(selectedCourseId) : undefined;
      const [lList, cList, fList, rList, divisionList] = await Promise.all([
        lectureApi.getAll(cId ? { course_id: cId } : undefined),
        courseApi.getAll(),
        canManage ? facultyApi.getAll() : Promise.resolve([]),
        canManage ? roomApi.getAll() : Promise.resolve([]),
        canManage ? divisionApi.getAll() : Promise.resolve([]),
      ]);
      setLectures(lList);
      setCourses(cList);
      setFacultyList(fList);
      setRooms(rList);
      setDivisions(divisionList);
    } catch (err) {
      console.error(err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void loadData(false);
    };
    const refreshTimer = window.setInterval(() => void loadData(false), 15000);
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(refreshTimer);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [selectedCourseId, canManage]);

  const deleteLecture = async (lecture: Lecture) => {
    const confirmed = window.confirm(lecture.attendance_recorded
      ? 'Delete this lecture and permanently remove all attendance records for it? This cannot be undone.'
      : 'Delete this lecture? This cannot be undone.');
    if (!confirmed) return;
    try {
      await lectureApi.delete(lecture.lecture_id);
      await loadData();
    } catch (err: any) {
      window.alert(err.response?.data?.detail || 'Could not delete this lecture.');
    }
  };

  const openAddModal = () => {
    const initialCourse = courses[0];
    const initialDivisions = initialCourse?.assigned_divisions?.length ? initialCourse.assigned_divisions : divisions;
    const initialDivisionId = initialDivisions[0]?.division_id;
    const initialFaculty = (initialCourse?.assigned_faculty || []).filter((faculty) => faculty.eligible_division_ids?.includes(initialDivisionId || -1));
    setFormData({
      course_id: initialCourse?.course_id.toString() || '',
      faculty_id: initialFaculty[0]?.faculty_id.toString() || '',
      room_id: rooms[0]?.room_id.toString() || '',
      ...getDefaultLectureSlot(),
      topic: '',
      division_id: initialDivisionId?.toString() || '',
    });
    setError(null);
    setIsModalOpen(true);
  };

  const selectedFormCourse = courses.find((course) => course.course_id.toString() === formData.course_id);
  const availableFormDivisions = selectedFormCourse?.assigned_divisions?.length ? selectedFormCourse.assigned_divisions : divisions;
  const availableFormFaculty = (selectedFormCourse?.assigned_faculty || []).filter(
    (faculty) => faculty.eligible_division_ids?.includes(Number(formData.division_id)),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const now = getIndiaDateTime(new Date());
    if (formData.date < now.date || (formData.date === now.date && formData.start_time <= now.time)) {
      setError('Choose a lecture start time later than the current India time.');
      return;
    }
    if (formData.end_time <= formData.start_time) {
      setError('Lecture end time must be after start time.');
      return;
    }
    setSubmitting(true);

    const payload = {
      course_id: parseInt(formData.course_id),
      faculty_id: parseInt(formData.faculty_id),
      room_id: formData.room_id ? parseInt(formData.room_id) : null,
      date: formData.date,
      start_time: formData.start_time,
      end_time: formData.end_time,
      topic: formData.topic || 'Lecture Session',
      status: 'SCHEDULED',
      division_id: parseInt(formData.division_id),
    };

    try {
      await lectureApi.create(payload);
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to schedule lecture.');
    } finally {
      setSubmitting(false);
    }
  };

  const openLectureDetails = async (lecture: Lecture) => {
    setDetailLecture(lecture);
    setDetailDivisionId(lecture.division_id?.toString() || '');
    setDetailStudents([]);
    setDetailError(null);
    setIsDetailsOpen(true);
    setDetailLoading(true);
    try {
      const [freshLecture, roster] = await Promise.all([
        lectureApi.getById(lecture.lecture_id),
        lectureApi.getStudents(lecture.lecture_id),
      ]);
      setDetailLecture(freshLecture);
      setDetailDivisionId(freshLecture.division_id?.toString() || '');
      setDetailStudents(roster);
    } catch (err: any) {
      setDetailError(err.response?.data?.detail || 'Could not load this lecture’s details.');
    } finally {
      setDetailLoading(false);
    }
  };

  const assignLectureDivision = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!detailLecture || !detailDivisionId) return;
    setDetailSaving(true);
    setDetailError(null);
    try {
      const updatedLecture = await lectureApi.update(detailLecture.lecture_id, { division_id: Number(detailDivisionId) });
      const roster = await lectureApi.getStudents(detailLecture.lecture_id);
      setDetailLecture(updatedLecture);
      setDetailStudents(roster);
      await loadData();
    } catch (err: any) {
      setDetailError(err.response?.data?.detail || 'Could not assign this lecture to the selected class.');
    } finally {
      setDetailSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Class Lectures</h1>
          <p className="text-sm text-slate-500">Track and manage scheduled lectures and daily attendance records</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">All Courses</option>
            {courses.map((c) => (
              <option key={c.course_id} value={c.course_id}>
                {c.course_code} - {c.title}
              </option>
            ))}
          </select>
          {canManage && <Button onClick={openAddModal}>
            <Plus className="h-4 w-4 mr-1.5" />
            Schedule Lecture
          </Button>}
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent mx-auto" />
        </div>
      ) : lectures.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          <CalendarCheck2 className="h-10 w-10 mx-auto text-slate-300 mb-2" />
          <h4 className="text-base font-bold text-slate-700">No Lectures Found</h4>
          <p className="text-sm text-slate-500 mt-1">Schedule a lecture session to begin taking attendance.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-700 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Course & Topic</th>
                <th className="px-6 py-3.5">Class</th>
                <th className="px-6 py-3.5">Faculty</th>
                <th className="px-6 py-3.5">Date & Time</th>
                <th className="px-6 py-3.5">Room</th>
                <th className="px-6 py-3.5">Attendance Status</th>
                {canManage && <th className="px-6 py-3.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lectures.map((lec) => (
                <tr key={lec.lecture_id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-bold text-sky-700 text-xs">{lec.course_code}</span>
                    <div className="font-semibold text-slate-900 mt-0.5">{lec.topic || 'Lecture Session'}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">{lec.academic_year ? `${lec.academic_year}${lec.academic_year === 1 ? 'st' : lec.academic_year === 2 ? 'nd' : lec.academic_year === 3 ? 'rd' : 'th'} ${lec.branch} · ${lec.division_name}` : canManage ? <button type="button" onClick={() => openLectureDetails(lec)} className="font-semibold text-amber-700 underline decoration-dotted underline-offset-2">Unassigned · set class</button> : '—'}</td>
                  <td className="px-6 py-4 text-slate-700 font-medium">{lec.faculty_name}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {lec.date}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      {lec.start_time} - {lec.end_time} ({lec.duration} min)
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-medium">
                    {lec.room_number ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-semibold">
                        <Layers className="h-3 w-3" />
                        {lec.room_number}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {lec.attendance_recorded ? (
                      <Badge variant="success">
                        {lec.present_count} / {lec.present_count! + lec.absent_count!} Present
                      </Badge>
                    ) : (
                      <Badge variant="warning">Not Recorded</Badge>
                    )}
                  </td>
                  {canManage && <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button type="button" onClick={() => openLectureDetails(lec)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50" aria-label={`View details for ${lec.course_code} ${lec.topic || 'lecture'}`}>
                        <Eye className="h-3.5 w-3.5" /> Details
                      </button>
                      <Link
                        to={`/attendance/marking?lectureId=${lec.lecture_id}`}
                        state={{ from: `${location.pathname}${location.search}` }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-colors shadow-sm"
                      >
                        <CalendarCheck2 className="h-3.5 w-3.5" />
                        {lec.attendance_recorded ? 'Edit Attendance' : 'Mark Attendance'}
                      </Link>
                      <button type="button" onClick={() => deleteLecture(lec)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50" aria-label={`Delete ${lec.course_code} ${lec.topic || 'lecture'}`}><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                    </div>
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Lecture Modal */}
      {canManage && <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Schedule New Lecture">
        <form onSubmit={handleSubmit} className="space-y-4">
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
                const nextDivisionId = nextDivisions[0]?.division_id;
                const nextFaculty = (nextCourse?.assigned_faculty || []).filter((faculty) => faculty.eligible_division_ids?.includes(nextDivisionId || -1));
                setFormData({ ...formData, course_id: e.target.value, division_id: nextDivisionId?.toString() || '', faculty_id: nextFaculty[0]?.faculty_id.toString() || '' });
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
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Assigned Faculty
            </label>
            <select
              required
              value={formData.faculty_id}
              onChange={(e) => setFormData({ ...formData, faculty_id: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              {availableFormFaculty.length === 0 && <option value="">No faculty assigned to this course</option>}
              {availableFormFaculty.map((f) => (
                <option key={f.faculty_id} value={f.faculty_id}>
                  {f.full_name} · {f.designation}
                </option>
              ))}
            </select>
            {availableFormFaculty.length === 0 && <p className="mt-1 text-xs text-amber-700">Assign faculty to this course in Courses before scheduling.</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Student group</label>
            <select required value={formData.division_id} onChange={(e) => {
              const nextDivisionId = e.target.value;
              const eligibleFaculty = (selectedFormCourse?.assigned_faculty || []).filter((faculty) => faculty.eligible_division_ids?.includes(Number(nextDivisionId)));
              const currentFacultyEligible = eligibleFaculty.some((faculty) => faculty.faculty_id.toString() === formData.faculty_id);
              setFormData({ ...formData, division_id: nextDivisionId, faculty_id: currentFacultyEligible ? formData.faculty_id : (eligibleFaculty[0]?.faculty_id.toString() || '') });
            }} className="w-full rounded-lg border px-3 py-2 text-sm">
              <option value="">Select year, branch and division</option>
              {availableFormDivisions.map((division) => <option key={division.division_id} value={division.division_id}>{division.academic_year}{division.academic_year === 1 ? 'st' : division.academic_year === 2 ? 'nd' : division.academic_year === 3 ? 'rd' : 'th'} Year · {division.branch} · Division {division.division_name} ({division.students_count} students)</option>)}
            </select>
            {divisions.length === 0 && <p className="mt-1 text-xs text-amber-700">Create a division in Years & Divisions before scheduling a lecture.</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Classroom / Room
              </label>
              <select
                value={formData.room_id}
                onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">No Room Assigned</option>
                {rooms.map((r) => (
                  <option key={r.room_id} value={r.room_id}>
                    {r.room_number} ({r.building})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Lecture Date
              </label>
              <input
                type="date"
                required
                min={indiaNow.date}
                value={formData.date}
                onChange={(e) => {
                  const nextDate = e.target.value;
                  if (nextDate === getIndiaDateTime(new Date()).date) setFormData({ ...formData, date: nextDate, ...getDefaultLectureSlot() });
                  else setFormData({ ...formData, date: nextDate });
                }}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Start Time
              </label>
              <input
                type="time"
                step="1"
                required
                min={formData.date === indiaNow.date ? indiaNow.time : undefined}
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value, end_time: formData.end_time <= e.target.value ? addMinutesToTime(e.target.value, 60) : formData.end_time })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                End Time
              </label>
              <input
                type="time"
                step="1"
                required
                min={formData.start_time}
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>
          <p className="-mt-2 text-xs text-slate-500">Schedule for today or a future date. For today, the start time must be later than the current India time.</p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Lecture Topic / Description
            </label>
            <input
              type="text"
              required
              value={formData.topic}
              onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="e.g. Relational Calculus & Normalization"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting} disabled={!availableFormFaculty.length || !formData.faculty_id || !formData.division_id}>
              Schedule Lecture
            </Button>
          </div>
        </form>
      </Modal>}

      {canManage && <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title={detailLecture ? `${detailLecture.course_code || 'Lecture'} · Details` : 'Lecture Details'}
        maxWidth="2xl"
      >
        {detailLoading ? (
          <div className="py-12 text-center text-sm text-slate-500">Loading lecture details…</div>
        ) : detailLecture ? (
          <div className="space-y-5">
            {detailError && <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{detailError}</div>}

            <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
              <div><p className="text-xs font-semibold uppercase text-slate-500">Course & topic</p><p className="mt-1 font-semibold text-slate-900">{detailLecture.course_title || detailLecture.course_code}</p><p className="text-sm text-slate-600">{detailLecture.topic || 'Lecture Session'}</p></div>
              <div><p className="text-xs font-semibold uppercase text-slate-500">Faculty</p><p className="mt-1 font-semibold text-slate-900">{detailLecture.faculty_name || '—'}</p></div>
              <div><p className="text-xs font-semibold uppercase text-slate-500">Date & time</p><p className="mt-1 text-slate-900">{detailLecture.date}</p><p className="text-sm text-slate-600">{detailLecture.start_time} – {detailLecture.end_time} ({detailLecture.duration} min)</p></div>
              <div><p className="text-xs font-semibold uppercase text-slate-500">Room & status</p><p className="mt-1 text-slate-900">{detailLecture.room_number || 'No room assigned'} · {detailLecture.status}</p></div>
              <div className="sm:col-span-2"><p className="text-xs font-semibold uppercase text-slate-500">Assigned class</p><p className="mt-1 font-semibold text-slate-900">{detailLecture.academic_year ? `${detailLecture.academic_year}${detailLecture.academic_year === 1 ? 'st' : detailLecture.academic_year === 2 ? 'nd' : detailLecture.academic_year === 3 ? 'rd' : 'th'} Year · ${detailLecture.branch} · Division ${detailLecture.division_name}` : 'Not assigned (using course enrollment)'}</p></div>
              <div className="sm:col-span-2"><p className="text-xs font-semibold uppercase text-slate-500">Attendance</p><p className="mt-1 text-slate-900">{detailLecture.present_count || 0} present · {detailLecture.absent_count || 0} absent · {detailLecture.total_enrolled || 0} students in roster</p></div>
            </div>

            <form onSubmit={assignLectureDivision} className="flex flex-col gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label htmlFor="lecture-detail-division" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">Assign / change student group</label>
                <select id="lecture-detail-division" required value={detailDivisionId} onChange={(event) => setDetailDivisionId(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                  <option value="">Select year, branch, and division</option>
                  {divisions.map((division) => <option key={division.division_id} value={division.division_id}>{division.academic_year}{division.academic_year === 1 ? 'st' : division.academic_year === 2 ? 'nd' : division.academic_year === 3 ? 'rd' : 'th'} Year · {division.branch} · Division {division.division_name} ({division.students_count} students)</option>)}
                </select>
              </div>
              <Button type="submit" isLoading={detailSaving} disabled={!detailDivisionId || divisions.length === 0}>Save Class</Button>
            </form>

            <section>
              <h4 className="mb-2 flex items-center gap-2 font-semibold text-slate-900"><UserRound className="h-4 w-4 text-sky-600" />Students in this lecture ({detailStudents.length})</h4>
              {detailStudents.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                  {detailLecture.division_id ? 'No students are assigned to this division yet. Assign students from the Students page.' : 'This lecture has no enrolled students. Assign its year, branch, and division above to load that class roster.'}
                </div>
              ) : (
                <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200">
                  {detailStudents.map((student) => <div key={student.student_id} className="flex items-center justify-between border-b border-slate-100 px-4 py-3 last:border-b-0"><div><p className="font-semibold text-slate-900">{student.full_name}</p><p className="text-xs text-slate-500">UID: {student.roll_no || '—'} · {student.dept_name || 'No department'}</p></div><span className="text-xs text-slate-500">{student.email || ''}</span></div>)}
                </div>
              )}
            </section>

            <div className="flex justify-end border-t border-slate-100 pt-4">
              <Link to={`/attendance/marking?lectureId=${detailLecture.lecture_id}`} state={{ from: `${location.pathname}${location.search}` }} onClick={() => setIsDetailsOpen(false)} className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"><CalendarCheck2 className="h-4 w-4" />Mark Attendance</Link>
            </div>
          </div>
        ) : null}
      </Modal>}
    </div>
  );
};
