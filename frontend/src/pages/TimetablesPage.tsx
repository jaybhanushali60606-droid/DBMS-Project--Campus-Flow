import React, { useEffect, useMemo, useState } from 'react';
import { lectureApi } from '../services/api';
import { Lecture } from '../types';
import { AlertCircle, CalendarDays, ChevronLeft, ChevronRight, Clock, Layers, User } from 'lucide-react';
import { Badge } from '../components/ui/Badge';

const asLocalDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const mondayOf = (date: Date) => {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
};
const plusDays = (date: Date, days: number) => {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + days);
  return result;
};

export const TimetablesPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const weekStart = useMemo(() => mondayOf(selectedDate), [selectedDate]);
  const weekEnd = plusDays(weekStart, 6);
  const dateFrom = asLocalDate(weekStart);
  const dateTo = asLocalDate(weekEnd);
  const weekDays = Array.from({ length: 7 }, (_, index) => plusDays(weekStart, index));

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    lectureApi.getAll({ date_from: dateFrom, date_to: dateTo })
      .then((rows) => { if (active) setLectures(rows.filter((lecture) => lecture.status !== 'CANCELLED')); })
      .catch((err) => {
        console.error('Failed to load timetable:', err);
        if (active) setError(err.response?.data?.detail || 'Could not load this week’s timetable.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [dateFrom, dateTo]);

  const moveWeek = (amount: number) => setSelectedDate((date) => plusDays(date, amount * 7));
  const isCurrentWeek = dateFrom === asLocalDate(mondayOf(new Date()));
  const weekLabel = `${weekStart.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })} – ${weekEnd.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Weekly Timetable</h1>
          <p className="text-sm text-slate-500">Scheduled lectures for {weekLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
          <button type="button" onClick={() => moveWeek(-1)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Previous week" title="Previous week"><ChevronLeft className="h-5 w-5" /></button>
          <button type="button" onClick={() => setSelectedDate(new Date())} disabled={isCurrentWeek} className="rounded-lg px-3 py-2 text-sm font-medium text-sky-700 hover:bg-sky-50 disabled:text-slate-400" title="Go to current week">This week</button>
          <button type="button" onClick={() => moveWeek(1)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Next week" title="Next week"><ChevronRight className="h-5 w-5" /></button>
          <label className="flex items-center gap-2 border-l border-slate-200 pl-3 text-slate-500" title="Choose a date to view its week">
            <CalendarDays className="h-4 w-4" />
            <input type="date" value={asLocalDate(selectedDate)} onChange={(event) => {
              if (!event.target.value) return;
              const [year, month, day] = event.target.value.split('-').map(Number);
              setSelectedDate(new Date(year, month - 1, day));
            }} className="w-36 rounded-md border-0 bg-transparent py-1 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-sky-500" aria-label="Pick a date for the timetable week" />
          </label>
        </div>
      </div>

      {error && <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}

      {loading ? (
        <div className="p-12 text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" /></div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-7">
          {weekDays.map((day) => {
            const dayKey = asLocalDate(day);
            const dayLectures = lectures.filter((lecture) => lecture.date === dayKey).sort((a, b) => a.start_time.localeCompare(b.start_time));
            const today = dayKey === asLocalDate(new Date());
            return <section key={dayKey} className={`flex min-h-64 flex-col overflow-hidden rounded-xl border bg-white shadow-sm ${today ? 'border-sky-300 ring-1 ring-sky-100' : 'border-slate-200'}`}>
              <header className={`border-b px-3 py-2.5 ${today ? 'bg-sky-50' : 'bg-slate-50'}`}>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-slate-900">{day.toLocaleDateString(undefined, { weekday: 'long' })}</h2>
                  {today && <span className="text-[10px] font-semibold uppercase text-sky-700">Today</span>}
                </div>
                <div className="mt-0.5 text-xs text-slate-500">{day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {dayLectures.length} {dayLectures.length === 1 ? 'lecture' : 'lectures'}</div>
              </header>
              <div className="flex-1 space-y-2 p-2">
                {dayLectures.length === 0 ? <p className="py-8 text-center text-xs italic text-slate-400">No lectures</p> : dayLectures.map((lecture) => (
                  <article key={lecture.lecture_id} className="rounded-lg border border-sky-100 bg-sky-50/60 p-2.5">
                    <div className="mb-1 flex items-center justify-between gap-1">
                      <span className="text-[11px] font-bold text-sky-800">{lecture.course_code || 'Lecture'}</span>
                      <Badge size="sm" variant={lecture.status === 'COMPLETED' ? 'success' : 'primary'}>{lecture.status === 'COMPLETED' ? 'Done' : 'Scheduled'}</Badge>
                    </div>
                    <h3 className="text-xs font-semibold leading-snug text-slate-900">{lecture.topic || lecture.course_title || 'Class lecture'}</h3>
                    <div className="mt-2 space-y-1 text-[11px] text-slate-600">
                      <p className="flex items-center gap-1"><Clock className="h-3 w-3 shrink-0" />{lecture.start_time.slice(0, 5)}–{lecture.end_time.slice(0, 5)}</p>
                      {lecture.room_number && <p className="flex items-center gap-1"><Layers className="h-3 w-3 shrink-0" />{lecture.room_number}</p>}
                      {lecture.faculty_name && <p className="flex items-center gap-1"><User className="h-3 w-3 shrink-0" /><span className="truncate">{lecture.faculty_name}</span></p>}
                      {lecture.academic_year && <p className="text-slate-500">{lecture.academic_year}{lecture.academic_year === 1 ? 'st' : lecture.academic_year === 2 ? 'nd' : lecture.academic_year === 3 ? 'rd' : 'th'} · {lecture.branch} · Div {lecture.division_name}</p>}
                    </div>
                  </article>
                ))}
              </div>
            </section>;
          })}
        </div>
      )}
    </div>
  );
};
