import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, CheckCheck, CheckCircle2, Save, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getTodayISO } from '../../lib/date';
import {
  STUDENT_STATUS_LABELS,
  type Student,
  type StudentAttendanceStatus,
} from '../../types';

interface DraftEntry {
  status: StudentAttendanceStatus;
  notes: string;
}

export default function StudentAttendancePage() {
  const { supabase, user, profile } = useAuth();
  const { kelas: kelasParam } = useParams<{ kelas?: string }>();
  const navigate = useNavigate();

  const decodedKelas = kelasParam ? decodeURIComponent(kelasParam) : '';

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedDate, setSelectedDate] = useState(getTodayISO());
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState<Record<string, DraftEntry>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Load all students to build class list dynamically
  useEffect(() => {
    if (!supabase) return;
    let active = true;

    async function loadStudents() {
      setLoading(true);
      const { data, error } = await supabase!
        .from('students')
        .select('*')
        .order('kelas', { ascending: true })
        .order('name', { ascending: true });

      if (!active) return;
      if (error) {
        setFeedback({ type: 'error', message: error.message });
      } else {
        const list = (data as Student[]) || [];
        setStudents(list);

        if (!decodedKelas && list.length > 0) {
          const firstClass = list[0].kelas;
          navigate(`/app/absensi-siswa/${encodeURIComponent(firstClass)}`, { replace: true });
        }
      }
      setLoading(false);
    }

    loadStudents();
    return () => {
      active = false;
    };
  }, [supabase, decodedKelas, navigate]);

  const classList = useMemo(() => {
    return Array.from(new Set(students.map((s) => s.kelas))).sort();
  }, [students]);

  const activeKelas = decodedKelas || classList[0] || '';

  const classStudents = useMemo(() => {
    return students.filter((s) => {
      if (activeKelas && s.kelas !== activeKelas) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.nis.toLowerCase().includes(q);
    });
  }, [students, activeKelas, search]);

  // Load existing attendance records for activeKelas & selectedDate
  const loadAttendanceForDate = useCallback(async () => {
    if (!supabase || classStudents.length === 0) {
      setDrafts({});
      return;
    }

    const studentIds = classStudents.map((s) => s.id);
    const { data, error } = await supabase
      .from('student_attendance')
      .select('student_id, status, notes')
      .eq('date', selectedDate)
      .in('student_id', studentIds);

    if (error) {
      setFeedback({ type: 'error', message: error.message });
      return;
    }

    const existingMap = new Map(
      (data || []).map((row) => [
        row.student_id as string,
        { status: row.status as StudentAttendanceStatus, notes: (row.notes as string) || '' },
      ])
    );

    const nextDrafts: Record<string, DraftEntry> = {};
    for (const s of classStudents) {
      nextDrafts[s.id] = existingMap.get(s.id) || { status: 'hadir', notes: '' };
    }
    setDrafts(nextDrafts);
  }, [supabase, classStudents, selectedDate]);

  useEffect(() => {
    loadAttendanceForDate();
  }, [loadAttendanceForDate]);

  const updateStudentDraft = (studentId: string, patch: Partial<DraftEntry>) => {
    setDrafts((prev) => ({
      ...prev,
      [studentId]: {
        status: prev[studentId]?.status || 'hadir',
        notes: prev[studentId]?.notes || '',
        ...patch,
      },
    }));
  };

  const markAllPresent = () => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const s of classStudents) {
        next[s.id] = { status: 'hadir', notes: prev[s.id]?.notes || '' };
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!supabase || !user || classStudents.length === 0) return;
    setSaving(true);
    setFeedback(null);

    const payload = classStudents.map((s) => ({
      student_id: s.id,
      recorded_by: user.id,
      date: selectedDate,
      status: drafts[s.id]?.status || 'hadir',
      notes: drafts[s.id]?.notes?.trim() || null,
    }));

    const { error } = await supabase
      .from('student_attendance')
      .upsert(payload, { onConflict: 'student_id,date' });

    if (error) {
      setFeedback({ type: 'error', message: error.message });
    } else {
      setFeedback({
        type: 'success',
        message: `Absensi ${classStudents.length} siswa kelas ${activeKelas} tanggal ${selectedDate} berhasil disimpan.`,
      });
    }
    setSaving(false);
  };

  const summary = useMemo(() => {
    const counts = { hadir: 0, sakit: 0, izin: 0, alpa: 0 };
    for (const s of classStudents) {
      const st = drafts[s.id]?.status || 'hadir';
      counts[st] += 1;
    }
    return counts;
  }, [classStudents, drafts]);

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-bold text-red-600">Pencatatan Kehadiran Siswa</p>
            <h2 className="mt-1 text-xl font-extrabold text-slate-900">
              Absensi Siswa {activeKelas ? `· Kelas ${activeKelas}` : ''}
            </h2>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="att-date" className="block text-xs font-semibold text-slate-600">
                Tanggal Absensi
              </label>
              <input
                id="att-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="mt-1 rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs text-slate-900 outline-none focus:border-red-600"
              />
            </div>

            <div>
              <label htmlFor="att-kelas" className="block text-xs font-semibold text-slate-600">
                Pilih Kelas
              </label>
              <select
                id="att-kelas"
                value={activeKelas}
                onChange={(e) =>
                  navigate(`/app/absensi-siswa/${encodeURIComponent(e.target.value)}`)
                }
                className="mt-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-red-600"
              >
                {classList.length === 0 && <option value="">Belum ada kelas</option>}
                {classList.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={markAllPresent}
              disabled={classStudents.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
            >
              <CheckCheck className="h-4 w-4 text-emerald-600" />
              <span>Hadir Semua</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || classStudents.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50 whitespace-nowrap"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Absensi'}</span>
            </button>
          </div>
        </div>

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

        {/* Quick Class Navigation Tabs & Search */}
        <div className="mt-5 flex flex-col justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-500">Ringkasan:</span>
            <span className="font-semibold text-emerald-700 tabular-nums">
              Hadir {summary.hadir}
            </span>
            <span className="text-slate-300">·</span>
            <span className="font-semibold text-amber-700 tabular-nums">Sakit {summary.sakit}</span>
            <span className="text-slate-300">·</span>
            <span className="font-semibold text-blue-700 tabular-nums">Izin {summary.izin}</span>
            <span className="text-slate-300">·</span>
            <span className="font-semibold text-red-700 tabular-nums">Alpa {summary.alpa}</span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau NIS siswa..."
              className="w-full rounded-lg border border-slate-300 py-1.5 pl-9 pr-3 text-xs text-slate-900 outline-none focus:border-red-600"
            />
          </div>
        </div>
      </div>

      {/* Students Attendance List Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-11 animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        ) : students.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-bold text-slate-900">Data Siswa Belum Tersedia</p>
            <p className="mt-1 text-xs text-slate-500">
              {profile?.role === 'admin'
                ? 'Silakan tambahkan data siswa terlebih dahulu melalui menu Data Siswa.'
                : 'Hubungi Admin sekolah untuk menambahkan daftar siswa pada kelas Anda.'}
            </p>
            {profile?.role === 'admin' && (
              <Link
                to="/app/data-siswa"
                className="mt-4 inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
              >
                Buka Data Siswa
              </Link>
            )}
          </div>
        ) : classStudents.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Tidak ada siswa yang sesuai dengan filter pencarian.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-6 py-3 w-12">No</th>
                  <th className="px-4 py-3">NIS</th>
                  <th className="px-4 py-3">Nama Siswa</th>
                  <th className="px-4 py-3">Status Kehadiran</th>
                  <th className="px-6 py-3">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classStudents.map((student, idx) => {
                  const entry = drafts[student.id] || { status: 'hadir', notes: '' };
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/70">
                      <td className="px-6 py-3 font-mono text-xs text-slate-400 tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700 tabular-nums">
                        {student.nis}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{student.name}</td>
                      <td className="px-4 py-3">
                        <div className="inline-flex rounded-lg bg-slate-100 p-1">
                          {(['hadir', 'sakit', 'izin', 'alpa'] as StudentAttendanceStatus[]).map(
                            (st) => {
                              const active = entry.status === st;
                              const activeColor =
                                st === 'hadir'
                                  ? 'bg-emerald-600 text-white'
                                  : st === 'sakit'
                                    ? 'bg-amber-600 text-white'
                                    : st === 'izin'
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-red-600 text-white';

                              return (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => updateStudentDraft(student.id, { status: st })}
                                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                                    active
                                      ? activeColor
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  {STUDENT_STATUS_LABELS[st]}
                                </button>
                              );
                            }
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          value={entry.notes}
                          onChange={(e) =>
                            updateStudentDraft(student.id, { notes: e.target.value })
                          }
                          placeholder="Keterangan opsional..."
                          className="w-full min-w-[160px] rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-red-600"
                        />
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
}
