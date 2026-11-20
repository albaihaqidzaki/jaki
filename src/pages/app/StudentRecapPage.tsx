import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Download, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { downloadCSV, formatDateID, getMonthStartISO, getTodayISO } from '../../lib/date';
import { STUDENT_STATUS_LABELS, type StudentAttendance } from '../../types';

export default function StudentRecapPage() {
  const { supabase } = useAuth();
  const { kelas: kelasParam } = useParams<{ kelas?: string }>();
  const navigate = useNavigate();

  const decodedKelas = kelasParam ? decodeURIComponent(kelasParam) : 'all';

  const [startDate, setStartDate] = useState(getMonthStartISO());
  const [endDate, setEndDate] = useState(getTodayISO());
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [records, setRecords] = useState<StudentAttendance[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from('students')
      .select('kelas')
      .then(({ data }) => {
        if (data) {
          const unique = Array.from(new Set(data.map((d) => d.kelas as string))).sort();
          setClasses(unique);
        }
      });
  }, [supabase]);

  const loadRecap = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase
      .from('student_attendance')
      .select('*, students:student_id(id, nis, name, kelas), recorder:recorded_by(id, full_name)')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setRecords((data as StudentAttendance[]) || []);
    }
    setLoading(false);
  }, [supabase, startDate, endDate]);

  useEffect(() => {
    loadRecap();
  }, [loadRecap]);

  const filtered = useMemo(() => {
    return records.filter((row) => {
      if (decodedKelas !== 'all' && row.students?.kelas !== decodedKelas) return false;
      if (statusFilter !== 'all' && row.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (row.students?.name || '').toLowerCase().includes(q) ||
        (row.students?.nis || '').toLowerCase().includes(q) ||
        (row.students?.kelas || '').toLowerCase().includes(q)
      );
    });
  }, [records, decodedKelas, statusFilter, search]);

  const summary = useMemo(() => {
    return filtered.reduce(
      (acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      },
      { hadir: 0, sakit: 0, izin: 0, alpa: 0 } as Record<string, number>
    );
  }, [filtered]);

  const handleExport = () => {
    downloadCSV(
      `rekap-absensi-siswa-${startDate}-${endDate}.csv`,
      ['Tanggal', 'NIS', 'Nama Siswa', 'Kelas', 'Status', 'Dicatat Oleh', 'Keterangan'],
      filtered.map((r) => [
        r.date,
        r.students?.nis || '-',
        r.students?.name || '-',
        r.students?.kelas || '-',
        STUDENT_STATUS_LABELS[r.status],
        r.recorder?.full_name || '-',
        r.notes || '',
      ])
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold text-red-600">Laporan Kehadiran Peserta Didik</p>
            <h2 className="mt-1 text-xl font-extrabold text-slate-900">
              Rekap Absensi Siswa {decodedKelas !== 'all' ? `· ${decodedKelas}` : ''}
            </h2>
          </div>

          <button
            type="button"
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Download className="h-4 w-4" />
            <span>Ekspor CSV</span>
          </button>
        </div>

        <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label htmlFor="stu-start" className="block text-xs font-semibold text-slate-600">
              Dari Tanggal
            </label>
            <input
              id="stu-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs text-slate-900 outline-none focus:border-red-600"
            />
          </div>

          <div>
            <label htmlFor="stu-end" className="block text-xs font-semibold text-slate-600">
              Sampai Tanggal
            </label>
            <input
              id="stu-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs text-slate-900 outline-none focus:border-red-600"
            />
          </div>

          <div>
            <label htmlFor="stu-kelas" className="block text-xs font-semibold text-slate-600">
              Filter Kelas
            </label>
            <select
              id="stu-kelas"
              value={decodedKelas}
              onChange={(e) => {
                const val = e.target.value;
                navigate(
                  val === 'all' ? '/app/rekap/siswa' : `/app/rekap/siswa/${encodeURIComponent(val)}`
                );
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-red-600"
            >
              <option value="all">Semua Kelas</option>
              {classes.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="stu-status" className="block text-xs font-semibold text-slate-600">
              Status
            </label>
            <select
              id="stu-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-red-600"
            >
              <option value="all">Semua Status</option>
              <option value="hadir">Hadir</option>
              <option value="sakit">Sakit</option>
              <option value="izin">Izin</option>
              <option value="alpa">Alpa</option>
            </select>
          </div>

          <div>
            <label htmlFor="stu-search" className="block text-xs font-semibold text-slate-600">
              Cari Siswa
            </label>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                id="stu-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nama / NIS..."
                className="w-full rounded-lg border border-slate-300 py-2 pl-8 pr-3 text-xs text-slate-900 outline-none focus:border-red-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Hadir</p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-700 tabular-nums">
            {summary.hadir}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Sakit</p>
          <p className="mt-1 text-2xl font-extrabold text-amber-700 tabular-nums">
            {summary.sakit}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Izin</p>
          <p className="mt-1 text-2xl font-extrabold text-blue-700 tabular-nums">
            {summary.izin}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Alpa</p>
          <p className="mt-1 text-2xl font-extrabold text-red-700 tabular-nums">
            {summary.alpa}
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {errorMsg}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Tidak ada data absensi siswa pada filter yang dipilih.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-6 py-3">Tanggal</th>
                  <th className="px-4 py-3">NIS</th>
                  <th className="px-4 py-3">Nama Siswa</th>
                  <th className="px-4 py-3">Kelas</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Dicatat Oleh</th>
                  <th className="px-6 py-3">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-3 font-medium text-slate-900 tabular-nums">
                      {formatDateID(row.date)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 tabular-nums">
                      {row.students?.nis || '-'}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {row.students?.name || '-'}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-700">
                      {row.students?.kelas || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold ${
                          row.status === 'hadir'
                            ? 'text-emerald-700'
                            : row.status === 'sakit'
                              ? 'text-amber-700'
                              : row.status === 'izin'
                                ? 'text-blue-700'
                                : 'text-red-700'
                        }`}
                      >
                        {STUDENT_STATUS_LABELS[row.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {row.recorder?.full_name || '-'}
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
