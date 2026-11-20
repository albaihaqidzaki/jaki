import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock, LogIn, LogOut as LogOutIcon, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatDateID, formatLongDateID, formatTimeID, getTodayISO } from '../../lib/date';
import {
  EMPLOYEE_STATUS_LABELS,
  ROLE_LABELS,
  type EmployeeAttendance,
  type EmployeeAttendanceStatus,
} from '../../types';

export default function EmployeeAttendancePage() {
  const { supabase, user, profile } = useAuth();
  const [now, setNow] = useState(() => new Date());
  const [todayRecord, setTodayRecord] = useState<EmployeeAttendance | null>(null);
  const [history, setHistory] = useState<EmployeeAttendance[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedStatus, setSelectedStatus] = useState<EmployeeAttendanceStatus>('hadir');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchAttendance = useCallback(async () => {
    if (!supabase || !user) return;
    setLoading(true);
    const today = getTodayISO();

    const [todayRes, historyRes] = await Promise.all([
      supabase
        .from('employee_attendance')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle(),
      supabase
        .from('employee_attendance')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(30),
    ]);

    setTodayRecord((todayRes.data as EmployeeAttendance) || null);
    setHistory((historyRes.data as EmployeeAttendance[]) || []);
    setLoading(false);
  }, [supabase, user]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !user) return;

    setSubmitting(true);
    setFeedback(null);

    const today = getTodayISO();
    const nowIso = new Date().toISOString();
    const isWorking = selectedStatus === 'hadir' || selectedStatus === 'terlambat';

    const { error } = await supabase.from('employee_attendance').upsert(
      {
        user_id: user.id,
        date: today,
        check_in: isWorking ? nowIso : null,
        status: selectedStatus,
        notes: notes.trim() || null,
      },
      { onConflict: 'user_id,date' }
    );

    if (error) {
      setFeedback({ type: 'error', message: error.message });
    } else {
      setFeedback({
        type: 'success',
        message: isWorking
          ? 'Absensi masuk berhasil dicatat.'
          : `Status ${EMPLOYEE_STATUS_LABELS[selectedStatus]} hari ini berhasil dicatat.`,
      });
      setNotes('');
      await fetchAttendance();
    }
    setSubmitting(false);
  };

  const handleCheckOut = async () => {
    if (!supabase || !todayRecord) return;
    setSubmitting(true);
    setFeedback(null);

    const { error } = await supabase
      .from('employee_attendance')
      .update({
        check_out: new Date().toISOString(),
        notes: notes.trim() ? `${todayRecord.notes ? todayRecord.notes + ' · ' : ''}${notes.trim()}` : todayRecord.notes,
      })
      .eq('id', todayRecord.id);

    if (error) {
      setFeedback({ type: 'error', message: error.message });
    } else {
      setFeedback({ type: 'success', message: 'Absensi pulang berhasil dicatat.' });
      setNotes('');
      await fetchAttendance();
    }
    setSubmitting(false);
  };

  const timeString = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now);

  const canCheckOut =
    todayRecord &&
    (todayRecord.status === 'hadir' || todayRecord.status === 'terlambat') &&
    !todayRecord.check_out;

  return (
    <div className="space-y-6">
      {/* Live Self-Service Check-In / Check-Out Panel */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5">
          <p className="text-xs font-bold text-red-600">Absensi Mandiri Karyawan</p>
          <h2 className="mt-1 text-xl font-extrabold text-slate-900">
            {profile?.full_name || user?.email}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {profile?.role ? ROLE_LABELS[profile.role] : 'Karyawan'}
            {profile?.nip ? ` · NIP ${profile.nip}` : ''}
          </p>

          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-5 text-center">
            <p className="text-xs font-medium text-slate-500">{formatLongDateID(now)}</p>
            <p className="mt-2 font-mono text-4xl font-bold tracking-tight text-slate-900 tabular-nums">
              {timeString}
            </p>
            <p className="mt-1 text-xs text-slate-500">Waktu Lokal Perangkat</p>
          </div>

          {todayRecord && (
            <div className="mt-5 space-y-2 border-t border-slate-200 pt-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Status Hari Ini</span>
                <span className="font-bold text-slate-900">
                  {EMPLOYEE_STATUS_LABELS[todayRecord.status]}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Jam Masuk</span>
                <span className="font-mono text-xs font-semibold text-slate-800 tabular-nums">
                  {formatTimeID(todayRecord.check_in)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Jam Pulang</span>
                <span className="font-mono text-xs font-semibold text-slate-800 tabular-nums">
                  {formatTimeID(todayRecord.check_out)}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
          <h3 className="text-base font-bold text-slate-900">Formulir Presensi Hari Ini</h3>
          <p className="mt-1 text-sm text-slate-600">
            Seluruh role (Admin, Guru, Tenaga Kependidikan) mencatat kehadiran harian secara
            mandiri di halaman ini.
          </p>

          {feedback && (
            <div
              role="alert"
              className={`mt-4 flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm ${
                feedback.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-red-200 bg-red-50 text-red-800'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {loading ? (
            <div className="mt-6 h-40 animate-pulse rounded-lg bg-slate-100" />
          ) : !todayRecord ? (
            <form onSubmit={handleCheckIn} className="mt-5 space-y-5">
              <div>
                <span className="block text-xs font-semibold text-slate-700">
                  Pilih Status Kehadiran
                </span>
                <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {(['hadir', 'terlambat', 'izin', 'sakit'] as EmployeeAttendanceStatus[]).map(
                    (st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setSelectedStatus(st)}
                        className={`rounded-lg border px-3 py-2.5 text-xs font-semibold transition-colors ${
                          selectedStatus === st
                            ? 'border-red-600 bg-red-600 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-red-300'
                        }`}
                      >
                        {EMPLOYEE_STATUS_LABELS[st]}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="emp-notes" className="block text-xs font-semibold text-slate-700">
                  Keterangan / Catatan (Opsional)
                </label>
                <textarea
                  id="emp-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Hadir tepat waktu di ruang guru / Izin dinas luar..."
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/15"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                <LogIn className="h-4 w-4" />
                <span>{submitting ? 'Menyimpan...' : 'Catat Absensi Masuk'}</span>
              </button>
            </form>
          ) : canCheckOut ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                Anda sudah tercatat masuk pukul{' '}
                <span className="font-mono font-bold tabular-nums">
                  {formatTimeID(todayRecord.check_in)}
                </span>
                . Jangan lupa catat jam pulang saat selesai bertugas.
              </div>

              <div>
                <label
                  htmlFor="checkout-notes"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Catatan Tambahan Pulang (Opsional)
                </label>
                <input
                  id="checkout-notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan aktivitas hari ini..."
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/15"
                />
              </div>

              <button
                type="button"
                onClick={handleCheckOut}
                disabled={submitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
              >
                <LogOutIcon className="h-4 w-4" />
                <span>{submitting ? 'Menyimpan...' : 'Catat Absensi Pulang (Check-Out)'}</span>
              </button>
            </div>
          ) : (
            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
              <Clock className="mx-auto h-7 w-7 text-emerald-600" />
              <p className="mt-2 text-sm font-bold text-slate-900">
                Presensi Hari Ini Sudah Lengkap
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Status tercatat: <span className="font-semibold">{EMPLOYEE_STATUS_LABELS[todayRecord.status]}</span>
                {todayRecord.check_out ? ` · Pulang ${formatTimeID(todayRecord.check_out)}` : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Personal Attendance History Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-base font-bold text-slate-900">Riwayat Absensi Karyawan Pribadi</h3>
        </div>

        {loading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Belum ada data riwayat absensi karyawan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-6 py-3">Tanggal</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Jam Masuk</th>
                  <th className="px-4 py-3">Jam Pulang</th>
                  <th className="px-6 py-3">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-3 font-medium text-slate-900 tabular-nums">
                      {formatDateID(row.date)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold ${
                          row.status === 'hadir'
                            ? 'text-emerald-700'
                            : row.status === 'terlambat'
                              ? 'text-amber-700'
                              : 'text-red-700'
                        }`}
                      >
                        {EMPLOYEE_STATUS_LABELS[row.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 tabular-nums">
                      {formatTimeID(row.check_in)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 tabular-nums">
                      {formatTimeID(row.check_out)}
                    </td>
                    <td className="px-6 py-3 text-xs text-slate-600">{row.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
