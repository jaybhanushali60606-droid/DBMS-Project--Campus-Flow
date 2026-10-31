import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Layers, Plus, Trash2, Users } from 'lucide-react';
import { divisionApi } from '../services/api';
import { Division } from '../types';
import { Button } from '../components/ui/Button';

const branches: Division['branch'][] = ['CE', 'CSE', 'EXTC'];
const years = [1, 2, 3, 4];
const yearLabel = (year: number) => `${year}${year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'} Year`;

export const DivisionsPage: React.FC = () => {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [selectedYear, setSelectedYear] = useState(1);
  const [branch, setBranch] = useState<Division['branch']>('CE');
  const [divisionName, setDivisionName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadDivisions = async () => {
    setLoading(true);
    try {
      setDivisions(await divisionApi.getAll());
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not load divisions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDivisions(); }, []);

  const visibleDivisions = useMemo(
    () => divisions.filter((item) => item.academic_year === selectedYear),
    [divisions, selectedYear],
  );

  const createDivision = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedName = divisionName.trim().toUpperCase();
    if (!/^[A-Z]$/.test(normalizedName)) {
      setError('Division must be one capital letter, such as A or B.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await divisionApi.create({ academic_year: selectedYear, branch, division_name: normalizedName });
      setDivisionName('');
      await loadDivisions();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not create division.');
    } finally {
      setSaving(false);
    }
  };

  const deleteDivision = async (division: Division) => {
    if (!confirm(`Delete ${yearLabel(division.academic_year)} ${division.branch} division ${division.division_name}?`)) return;
    try {
      await divisionApi.delete(division.division_id);
      await loadDivisions();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not delete division.');
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Years & Divisions</h1>
        <p className="mt-1 text-sm text-slate-500">Create the class groups students belong to. Only students assigned here appear in that division’s lecture attendance roster.</p>
      </header>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-slate-900">Academic years</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {years.map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => setSelectedYear(year)}
              className={`rounded-lg border px-4 py-3 text-sm font-semibold transition-colors ${selectedYear === year ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-200 text-slate-700 hover:border-sky-300 hover:bg-sky-50'}`}
            >
              {yearLabel(year)}
            </button>
          ))}
        </div>
      </div>

      {error && <div role="alert" className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"><AlertCircle className="h-4 w-4" />{error}</div>}

      <form onSubmit={createDivision} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-700">Year <span aria-hidden="true" className="required-marker">*</span></p>
          <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">{yearLabel(selectedYear)}</div>
        </div>
        <div>
          <label htmlFor="division-branch" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">Branch</label>
          <select id="division-branch" required value={branch} onChange={(event) => setBranch(event.target.value as Division['branch'])} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            {branches.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="division-name" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">Division name</label>
          <input id="division-name" required maxLength={1} pattern="[A-Za-z]" value={divisionName} onChange={(event) => setDivisionName(event.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 1))} placeholder="A" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal uppercase" />
        </div>
        <Button type="submit" isLoading={saving}><Plus className="mr-1.5 h-4 w-4" />Create</Button>
      </form>

      <section className="space-y-3">
        <h2 className="font-semibold text-slate-900">{yearLabel(selectedYear)} divisions</h2>
        {loading ? <div className="p-10 text-center text-sm text-slate-500">Loading divisions…</div> : visibleDivisions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500"><Layers className="mx-auto mb-2 h-8 w-8 text-slate-300" />No divisions yet. Add one above, for example CE – A.</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleDivisions.map((division) => (
              <article key={division.division_id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div>
                  <p className="font-bold text-slate-900">{division.branch} · {division.division_name}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><Users className="h-3.5 w-3.5" />{division.students_count} students</p>
                </div>
                <button type="button" onClick={() => deleteDivision(division)} aria-label={`Delete ${division.branch} ${division.division_name}`} className="rounded-md p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
