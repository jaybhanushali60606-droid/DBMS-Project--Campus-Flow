import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import { Button } from '../components/ui/Button';
import { UserCircle, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';
import { Badge } from '../components/ui/Badge';

type ProfileForm = Record<string, string>;

const emptyForm: ProfileForm = {
  phone: '', personal_email: '', gender: '', address: '', guardian_name: '', guardian_phone: '', blood_group: '',
  date_of_birth: '', highest_qualification: '', years_experience: '', joining_date: '', emergency_contact_name: '', emergency_contact_phone: '',
};

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [profileForm, setProfileForm] = useState<ProfileForm>(emptyForm);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const hasPersonalProfile = user?.role === 'STUDENT' || user?.role === 'FACULTY';
  const isStudent = user?.role === 'STUDENT';
  const details = isStudent ? profile?.student_details : profile?.faculty_details;

  useEffect(() => {
    let active = true;
    authApi.getCurrentUser().then((data) => {
      if (!active) return;
      setProfile(data);
      const values = isStudent ? data.student_details?.profile : data.faculty_details?.profile;
      setProfileForm(Object.fromEntries(Object.keys(emptyForm).map((key) => [key, values?.[key] == null ? '' : String(values[key])])));
    }).catch((err) => {
      console.error('Failed to load personal profile', err);
      if (active) setProfileMsg({ type: 'error', text: 'Could not load profile details.' });
    }).finally(() => { if (active) setProfileLoading(false); });
    return () => { active = false; };
  }, [isStudent]);

  const handleProfileSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileMsg(null);
    setProfileSubmitting(true);
    const fields = isStudent
      ? ['phone', 'personal_email', 'gender', 'address', 'guardian_name', 'guardian_phone', 'blood_group']
      : ['phone', 'personal_email', 'gender', 'address', 'date_of_birth', 'highest_qualification', 'years_experience', 'joining_date', 'emergency_contact_name', 'emergency_contact_phone'];
    const payload: Record<string, unknown> = {};
    for (const field of fields) {
      const value = profileForm[field]?.trim() || null;
      payload[field] = field === 'years_experience' && value !== null ? Number(value) : value;
    }
    try {
      const updated = await authApi.updateProfile(payload);
      setProfile(updated);
      const values = isStudent ? updated.student_details?.profile : updated.faculty_details?.profile;
      setProfileForm(Object.fromEntries(Object.keys(emptyForm).map((key) => [key, values?.[key] == null ? '' : String(values[key])] )));
      setProfileMsg({ type: 'success', text: 'Profile details saved.' });
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err.response?.data?.detail || 'Could not save profile details.' });
    } finally {
      setProfileSubmitting(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (newPassword !== confirmPassword) {
      setMsg({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }
    setSubmitting(true);
    try {
      await authApi.changePassword({ old_password: oldPassword, new_password: newPassword });
      setMsg({ type: 'success', text: 'Password successfully updated.' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setMsg({ type: 'error', text: err.response?.data?.detail || 'Failed to change password.' });
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100';
  const labelClass = 'mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600';
  const setField = (field: string, value: string) => setProfileForm((current) => ({ ...current, [field]: value }));
  const messageBox = (value: typeof msg) => value && <div className={`mb-4 flex items-center gap-2 rounded-lg border p-3 text-sm ${value.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
    {value.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}{value.text}
  </div>;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Profile</h1>
        <p className="text-sm text-slate-500">Personal information and account security</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-600 text-xl font-extrabold text-white shadow-sm">{(user?.full_name || user?.username || 'U').charAt(0).toUpperCase()}</div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-slate-900">{details?.name || user?.full_name || user?.username}</h2><Badge variant="primary">{user?.role}</Badge></div>
            <p className="truncate text-sm text-slate-500">{user?.email}</p>
            <p className="mt-1 text-xs text-slate-500">{isStudent ? `${details?.roll_no || ''} · ${details?.department || ''}` : user?.role === 'FACULTY' ? `${details?.designation || ''} · ${details?.department || ''}` : `Username: @${user?.username}`}</p>
          </div>
        </div>
        {isStudent && <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">Date of birth: {details?.dob || 'Not set'}{details?.academic_year ? ` · Year ${details.academic_year} · ${details.branch} · Division ${details.division_name}` : ''}</div>}
        {user?.role === 'FACULTY' && <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">Faculty ID: FAC-{user.faculty_id}{details?.academic_roles?.length ? ` · ${details.academic_roles.join(', ')}` : ''}</div>}
      </section>

      {hasPersonalProfile && <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2"><UserCircle className="h-5 w-5 text-sky-600" /><h2 className="font-bold text-slate-900">{isStudent ? 'Student details' : 'Faculty details'}</h2></div>
        {messageBox(profileMsg)}
        {profileLoading ? <div className="py-8 text-center text-sm text-slate-500">Loading profile…</div> : <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className={labelClass}>Phone</label><input className={inputClass} type="tel" maxLength={24} value={profileForm.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="e.g. +91 98765 43210" /></div>
            <div><label className={labelClass}>Personal email</label><input className={inputClass} type="email" maxLength={254} value={profileForm.personal_email} onChange={(e) => setField('personal_email', e.target.value)} placeholder="name@example.com" /></div>
            <div><label className={labelClass}>Gender</label><select className={inputClass} value={profileForm.gender} onChange={(e) => setField('gender', e.target.value)}><option value="">Prefer not to say</option><option>Female</option><option>Male</option><option>Non-binary</option><option>Other</option></select></div>
            {isStudent ? <div><label className={labelClass}>Blood group</label><select className={inputClass} value={profileForm.blood_group} onChange={(e) => setField('blood_group', e.target.value)}><option value="">Select blood group</option>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((group) => <option key={group}>{group}</option>)}</select></div> : <div><label className={labelClass}>Date of birth</label><input className={inputClass} type="date" value={profileForm.date_of_birth} onChange={(e) => setField('date_of_birth', e.target.value)} /></div>}
            <div className="sm:col-span-2"><label className={labelClass}>Address</label><textarea className={inputClass} rows={2} maxLength={500} value={profileForm.address} onChange={(e) => setField('address', e.target.value)} placeholder="Current mailing address" /></div>
            {isStudent ? <>
              <div><label className={labelClass}>Parent / guardian name</label><input className={inputClass} maxLength={120} value={profileForm.guardian_name} onChange={(e) => setField('guardian_name', e.target.value)} /></div>
              <div><label className={labelClass}>Parent / guardian phone</label><input className={inputClass} type="tel" maxLength={24} value={profileForm.guardian_phone} onChange={(e) => setField('guardian_phone', e.target.value)} /></div>
            </> : <>
              <div><label className={labelClass}>Highest qualification</label><input className={inputClass} maxLength={150} value={profileForm.highest_qualification} onChange={(e) => setField('highest_qualification', e.target.value)} placeholder="e.g. PhD in Computer Engineering" /></div>
              <div><label className={labelClass}>Teaching experience (years)</label><input className={inputClass} type="number" min="0" max="70" value={profileForm.years_experience} onChange={(e) => setField('years_experience', e.target.value)} /></div>
              <div><label className={labelClass}>Joining date</label><input className={inputClass} type="date" value={profileForm.joining_date} onChange={(e) => setField('joining_date', e.target.value)} /></div>
              <div><label className={labelClass}>Emergency contact name</label><input className={inputClass} maxLength={120} value={profileForm.emergency_contact_name} onChange={(e) => setField('emergency_contact_name', e.target.value)} /></div>
              <div><label className={labelClass}>Emergency contact phone</label><input className={inputClass} type="tel" maxLength={24} value={profileForm.emergency_contact_phone} onChange={(e) => setField('emergency_contact_phone', e.target.value)} /></div>
            </>}
          </div>
          <div className="flex justify-end border-t border-slate-100 pt-4"><Button type="submit" isLoading={profileSubmitting}>Save profile</Button></div>
        </form>}
      </section>}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2"><KeyRound className="h-5 w-5 text-sky-600" /><h2 className="font-bold text-slate-900">Change account password</h2></div>
        {messageBox(msg)}
        <form onSubmit={handlePasswordChange} className="grid max-w-3xl gap-4 sm:grid-cols-2">
          <div><label className={labelClass}>Current password *</label><input type="password" required autoComplete="current-password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className={inputClass} /></div>
          <div />
          <div><label className={labelClass}>New password *</label><input type="password" required minLength={8} autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Confirm new password *</label><input type="password" required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass} /></div>
          <div className="sm:col-span-2"><Button type="submit" isLoading={submitting}>Update password</Button></div>
        </form>
      </section>
    </div>
  );
};
