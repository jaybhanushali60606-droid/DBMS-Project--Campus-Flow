import React, { useEffect, useState } from 'react';
import { roomApi, scheduleApi, courseApi, facultyApi } from '../services/api';
import { Room, Schedule, Course, Faculty } from '../types';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import {
  Layers,
  Plus,
  Trash2,
  Calendar,
  Clock,
  BookOpen,
  User,
  AlertCircle,
  Building,
  CheckCircle2,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';

export const RoomsSchedulingPage: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Room Modal
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [roomFormData, setRoomFormData] = useState({
    room_number: '',
    building: '',
    capacity: '50',
    room_type: 'CLASSROOM',
  });

  // Manual Allocation Modal
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleFormData, setScheduleFormData] = useState({
    room_id: '',
    course_id: '',
    faculty_id: '',
    activity_type: 'LECTURE',
    title: '',
    day_of_week: 'Monday',
    start_time: '09:00:00',
    end_time: '10:30:00',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rList, sList, cList, fList] = await Promise.all([
        roomApi.getAll(),
        scheduleApi.getAll(),
        courseApi.getAll(),
        facultyApi.getAll(),
      ]);
      setRooms(rList);
      setSchedules(sList);
      setCourses(cList);
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

  const openAddRoom = () => {
    setRoomFormData({
      room_number: '',
      building: '',
      capacity: '50',
      room_type: 'CLASSROOM',
    });
    setError(null);
    setIsRoomModalOpen(true);
  };

  const openAddSchedule = () => {
    setScheduleFormData({
      room_id: rooms[0]?.room_id.toString() || '',
      course_id: courses[0]?.course_id.toString() || '',
      faculty_id: facultyList[0]?.faculty_id.toString() || '',
      activity_type: 'LECTURE',
      title: '',
      day_of_week: 'Monday',
      start_time: '09:00:00',
      end_time: '10:30:00',
    });
    setError(null);
    setIsScheduleModalOpen(true);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await roomApi.create({
        room_number: roomFormData.room_number,
        building: roomFormData.building,
        capacity: parseInt(roomFormData.capacity),
        room_type: roomFormData.room_type,
      });
      setIsRoomModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create room.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const payload = {
      room_id: parseInt(scheduleFormData.room_id),
      course_id: scheduleFormData.course_id ? parseInt(scheduleFormData.course_id) : null,
      faculty_id: scheduleFormData.faculty_id ? parseInt(scheduleFormData.faculty_id) : null,
      activity_type: scheduleFormData.activity_type,
      title: scheduleFormData.title || `${scheduleFormData.activity_type} Session`,
      day_of_week: scheduleFormData.day_of_week,
      start_time: scheduleFormData.start_time,
      end_time: scheduleFormData.end_time,
    };

    try {
      await scheduleApi.create(payload);
      setIsScheduleModalOpen(false);
      setSuccessMsg('Schedule slot successfully allocated without any collision.');
      loadData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      // Highlights room overlap or faculty conflict validation error from backend!
      setError(err.response?.data?.detail || 'Scheduling failed due to a room or faculty time conflict.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSchedule = async (id: number) => {
    if (!confirm('Are you sure you want to remove this timetable allocation?')) return;
    try {
      await scheduleApi.delete(id);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Delete failed.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Classrooms & Manual Scheduling</h1>
          <p className="text-sm text-slate-500">
            Allocate classrooms, laboratories, and activity spaces with automated conflict prevention
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={openAddRoom}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Room
          </Button>
          <Button variant="primary" onClick={openAddSchedule}>
            <Calendar className="h-4 w-4 mr-1.5" />
            Manual Allocation
          </Button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <p className="text-sm font-medium">{successMsg}</p>
        </div>
      )}

      {/* Rooms Directory Strip */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-3">Facility Spaces & Capacities</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {rooms.map((r) => (
            <div key={r.room_id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm text-slate-900">{r.room_number}</span>
                <Badge variant={r.room_type === 'LABORATORY' ? 'purple' : 'primary'}>
                  {r.room_type}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-2">{r.building}</p>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-semibold">
                <span>Capacity: {r.capacity} seats</span>
                <span className="text-sky-600">{r.active_schedules_count ?? 0} bookings</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Current Allocations Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-8">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Current Manual Room Allocations ({schedules.length})</h3>
          <p className="text-xs text-slate-500">Every allocated slot is strictly checked against double-booking conflicts</p>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent mx-auto" />
          </div>
        ) : schedules.length === 0 ? (
          <p className="text-sm text-slate-400 italic p-12 text-center">No allocations created yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Day & Time</th>
                  <th className="px-6 py-3.5">Room</th>
                  <th className="px-6 py-3.5">Activity Title</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5">Assigned Faculty</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schedules.map((sch) => (
                  <tr key={sch.schedule_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{sch.day_of_week}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {sch.start_time} - {sch.end_time}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-sky-800">
                      {sch.room_number} <span className="text-xs font-normal text-slate-500 block">({sch.room_building})</span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {sch.title}
                      {sch.course_code && (
                        <span className="text-xs font-normal text-slate-500 block">Course: {sch.course_code}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={sch.activity_type === 'LAB' ? 'purple' : sch.activity_type === 'EXTRACURRICULAR' ? 'success' : 'primary'}>
                        {sch.activity_type}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-medium">
                      {sch.faculty_name || 'General Space'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteSchedule(sch.schedule_id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-md transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Room Modal */}
      <Modal isOpen={isRoomModalOpen} onClose={() => setIsRoomModalOpen(false)} title="Register Physical Room / Lab">
        <form onSubmit={handleCreateRoom} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Room Identifier / Number
            </label>
            <input
              type="text"
              required
              value={roomFormData.room_number}
              onChange={(e) => setRoomFormData({ ...roomFormData, room_number: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="e.g. Hall 101 or Lab 203"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Building Block
            </label>
            <input
              type="text"
              required
              value={roomFormData.building}
              onChange={(e) => setRoomFormData({ ...roomFormData, building: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="e.g. Alan Turing Block"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Seating Capacity
              </label>
              <input
                type="number"
                min="5"
                max="500"
                required
                value={roomFormData.capacity}
                onChange={(e) => setRoomFormData({ ...roomFormData, capacity: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Room Type
              </label>
              <select
                required
                value={roomFormData.room_type}
                onChange={(e) => setRoomFormData({ ...roomFormData, room_type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="CLASSROOM">Classroom</option>
                <option value="LABORATORY">Laboratory</option>
                <option value="SEMINAR_HALL">Seminar Hall</option>
                <option value="ACTIVITY_SPACE">Activity Space</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsRoomModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Add Room
            </Button>
          </div>
        </form>
      </Modal>

      {/* Manual Allocation Modal with Conflict Prevention Feedback */}
      <Modal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        title="Manual Room Allocation (Conflict Checked)"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateSchedule} className="space-y-4">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 text-rose-800 text-xs rounded-lg flex items-start gap-2.5">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Collision Conflict Detected:</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Select Room
            </label>
            <select
              required
              value={scheduleFormData.room_id}
              onChange={(e) => setScheduleFormData({ ...scheduleFormData, room_id: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              {rooms.map((r) => (
                <option key={r.room_id} value={r.room_id}>
                  {r.room_number} - {r.room_type} ({r.building}, {r.capacity} seats)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Day of Week
              </label>
              <select
                required
                value={scheduleFormData.day_of_week}
                onChange={(e) => setScheduleFormData({ ...scheduleFormData, day_of_week: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Activity Type
              </label>
              <select
                required
                value={scheduleFormData.activity_type}
                onChange={(e) => setScheduleFormData({ ...scheduleFormData, activity_type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="LECTURE">Lecture</option>
                <option value="LAB">Lab Session</option>
                <option value="EXTRACURRICULAR">Extracurricular Activity</option>
              </select>
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
                value={scheduleFormData.start_time}
                onChange={(e) => setScheduleFormData({ ...scheduleFormData, start_time: e.target.value })}
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
                value={scheduleFormData.end_time}
                onChange={(e) => setScheduleFormData({ ...scheduleFormData, end_time: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Title / Activity Name
            </label>
            <input
              type="text"
              required
              value={scheduleFormData.title}
              onChange={(e) => setScheduleFormData({ ...scheduleFormData, title: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="e.g. CS101 Lecture or Robotics Club Meeting"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Course (Optional)
              </label>
              <select
                value={scheduleFormData.course_id}
                onChange={(e) => setScheduleFormData({ ...scheduleFormData, course_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">No Course (General)</option>
                {courses.map((c) => (
                  <option key={c.course_id} value={c.course_id}>
                    {c.course_code} - {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Faculty Instructor (Optional)
              </label>
              <select
                value={scheduleFormData.faculty_id}
                onChange={(e) => setScheduleFormData({ ...scheduleFormData, faculty_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">No Faculty Assigned</option>
                {facultyList.map((f) => (
                  <option key={f.faculty_id} value={f.faculty_id}>
                    {f.full_name} ({f.dept_name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsScheduleModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Validate & Allocate
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
