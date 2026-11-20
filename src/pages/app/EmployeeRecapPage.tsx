import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  downloadCSV,
  formatDateID,
  formatTimeID,
  getMonthStartISO,
  getTodayISO,
} from '../../lib/date';
import {
  EMPLOYEE_STATUS_LABELS,
  ROLE_LABELS,
  type EmployeeAttendance,
  type UserRole,
} from '../../types';

export default function EmployeeRecapPage() {
  const { supabase } = useAuth();

  const [startDate, setStartDate] = useState(getMonthStartISO());
  const [endDate, setEndDate] = useState(getTodayISO());
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const [records, setRecords] = useState<EmployeeAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadRecap = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase
      .from('employee_attendance')
      .select('*, profiles:user_id(id, full_name, email, nip, role, position)')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) {
      setErrorMsg(error.message);
    } else {
      setRecords((data as EmployeeAttendance[]) || []);
    }
    setLoading(false);
  }, [supabase, startDate, endDate]);

  useEffect(() => {
    loadRecap();
  }, [loadRecap]);

  const filtered = useMemo(() => {
    return records.filter((row) => {
      if (roleFilter !== 'all' && row.profiles?.role !== roleFilter) return false;
      if (statusFilter !== 'all' && row.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (row.profiles?.full_name || '').toLowerCase().includes(q) ||
        (row.profiles?.nip || '').toLowerCase().includes(q) ||
        (row.profiles?.email || '').toLowerCase().includes(q)
      );
    });
  }, [records, roleFilter, statusFilter, search]);

  const summary = useMemo(() => {
    return filtered.reduce(
      (acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      },
      { hadir: 0, terlambat: 0, izin: 0, sakit: 0 } as Record<string, number>
    );
  }, [filtered]);

  const handleExport = () => {
    downloadCSV(
      `rekap-absensi-karyawan-${startDate}-${endDate}.csv`,
      ['Tanggal', 'Nama Karyawan', 'NIP', 'Role', 'Status', 'Jam Masuk', 'Jam Pulang', 'Keterangan'],
      filtered.map((r) => [
        r.date,
        r.profiles?.full_name || '-',
        r.profiles?.nip || '-',
        r.profiles?.role ? ROLE_LABELS[r.profiles.role] : '-',
        EMPLOYEE_STATUS_LABELS[r.status],
        formatTimeID(r.check_in),
        formatTimeID(r.check_out),
        r.notes || '',
      ])
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold text-red-600">Laporan Kepegawaian</p>
            <h2 className="mt-1 text-xl font-extrabold text-slate-900">Rekap Absensi Karyawan</h2>
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

        {/* Filter Controls */}
        <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label htmlFor="emp-start" className="block text-xs font-semibold text-slate-600">
              Dari Tanggal
            </label>
            <input
              id="emp-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs text-slate-900 outline-none focus:border-red-600"
            />
          </div>

          <div>
            <label htmlFor="emp-end" className="block text-xs font-semibold text-slate-600">
              Sampai Tanggal
            </label>
            <input
              id="emp-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs text-slate-900 outline-none focus:border-red-600"
            />
          </div>

          <div>
            <label htmlFor="emp-role" className="block text-xs font-semibold text-slate-600">
              Filter Role
            </label>
            <select
              id="emp-role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as 'all' | UserRole)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-red-600"
            >
              <option value="all">Semua Role</option>
              <option value="admin">Admin</option>
              <option value="guru">Guru</option>
              <option value="tenaga_kependidikan">Tenaga Kependidikan</option>
            </select>
          </div>

          <div>
            <label htmlFor="emp-status" className="block text-xs font-semibold text-slate-600">
              Status
            </label>
            <select
              id="emp-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-red-600"
            >
              <option value="all">Semua Status</option>
              <option value="hadir">Hadir</option>
              <option value="terlambat">Terlambat</option>
              <option value="izin">Izin</option>
              <option value="sakit">Sakit</option>
            </select>
          </div>

          <div>
            <label htmlFor="emp-search" className="block text-xs font-semibold text-slate-600">
              Cari Karyawan
            </label>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                id="emp-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nama / NIP..."
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
          <p className="text-xs font-medium text-slate-500">Terlambat</p>
          <p className="mt-1 text-2xl font-extrabold text-amber-700 tabular-nums">
            {summary.terlambat}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Izin</p>
          <p className="mt-1 text-2xl font-extrabold text-blue-700 tabular-nums">
            {summary.izin}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Sakit</p>
          <p className="mt-1 text-2xl font-extrabold text-red-700 tabular-nums">
            {summary.sakit}
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
            Tidak ada data absensi karyawan pada rentang tanggal ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-6 py-3">Tanggal</th>
                  <th className="px-4 py-3">Nama Karyawan</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Masuk</th>
                  <th className="px-4 py-3">Pulang</th>
                  <th className="px-6 py-3">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-3 font-medium text-slate-900 tabular-nums">
                      {formatDateID(row.date)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">
                        {row.profiles?.full_name || '-'}
                      </p>
                      <p className="font-mono text-xs text-slate-500">
                        {row.profiles?.nip || row.profiles?.email}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-600">
                      {row.profiles?.role ? ROLE_LABELS[row.profiles.role] : '-'}
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
