import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  GraduationCap,
  UserCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatDateID, formatLongDateID, formatTimeID, getMonthStartISO, getTodayISO } from '../../lib/date';
import {
  EMPLOYEE_STATUS_LABELS,
  ROLE_LABELS,
  type EmployeeAttendance,
} from '../../types';

interface DashboardStats {
  totalEmployees: number;
  totalStudents: number;
  employeesPresentToday: number;
  studentsPresentToday: number;
  myMonthPresentCount: number;
}

export default function DashboardPage() {
  const { supabase, profile, user } = useAuth();
  const role = profile?.role || 'tenaga_kependidikan';

  const [todayRecord, setTodayRecord] = useState<EmployeeAttendance | null>(null);
  const [recentHistory, setRecentHistory] = useState<EmployeeAttendance[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    totalStudents: 0,
    employeesPresentToday: 0,
    studentsPresentToday: 0,
    myMonthPresentCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase || !user) return;
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      const today = getTodayISO();
      const monthStart = getMonthStartISO();

      const [myTodayRes, myRecentRes, myMonthRes] = await Promise.all([
        supabase!
          .from('employee_attendance')
          .select('*')
          .eq('user_id', user!.id)
          .eq('date', today)
          .maybeSingle(),
        supabase!
          .from('employee_attendance')
          .select('*')
          .eq('user_id', user!.id)
          .order('date', { ascending: false })
          .limit(5),
        supabase!
          .from('employee_attendance')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user!.id)
          .gte('date', monthStart)
          .in('status', ['hadir', 'terlambat']),
      ]);

      let totalEmployees = 0;
      let totalStudents = 0;
      let employeesPresentToday = 0;
      let studentsPresentToday = 0;

      if (role === 'admin' || role === 'guru') {
        const [stuCountRes, stuPresentRes] = await Promise.all([
          supabase!.from('students').select('id', { count: 'exact', head: true }),
          supabase!
            .from('student_attendance')
            .select('id', { count: 'exact', head: true })
            .eq('date', today)
            .eq('status', 'hadir'),
        ]);
        totalStudents = stuCountRes.count ?? 0;
        studentsPresentToday = stuPresentRes.count ?? 0;
      }

      if (role === 'admin') {
        const [empCountRes, empPresentRes] = await Promise.all([
          supabase!.from('profiles').select('id', { count: 'exact', head: true }),
          supabase!
            .from('employee_attendance')
            .select('id', { count: 'exact', head: true })
            .eq('date', today)
            .in('status', ['hadir', 'terlambat']),
        ]);
        totalEmployees = empCountRes.count ?? 0;
        employeesPresentToday = empPresentRes.count ?? 0;
      }

      if (!active) return;

      setTodayRecord((myTodayRes.data as EmployeeAttendance) || null);
      setRecentHistory((myRecentRes.data as EmployeeAttendance[]) || []);
      setStats({
        totalEmployees,
        totalStudents,
        employeesPresentToday,
        studentsPresentToday,
        myMonthPresentCount: myMonthRes.count ?? 0,
      });
      setLoading(false);
    }

    loadDashboard();
    return () => {
      active = false;
    };
  }, [supabase, user, role]);

  return (
    <div className="space-y-6">
      {/* Header Summary Banner */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold text-red-600">{ROLE_LABELS[role]}</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">
            Selamat Datang, {profile?.full_name || user?.email}
          </h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            <span>{formatLongDateID(new Date())}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/app/absensi-karyawan"
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 whitespace-nowrap shrink-0"
          >
            <UserCheck className="h-4 w-4" />
            <span>{todayRecord ? 'Lihat Absensi Saya' : 'Absen Masuk Sekarang'}</span>
          </Link>
          {(role === 'admin' || role === 'guru') && (
            <Link
              to="/app/absensi-siswa"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900 whitespace-nowrap shrink-0"
            >
              <ClipboardCheck className="h-4 w-4" />
              <span>Absensi Siswa</span>
            </Link>
          )}
        </div>
      </div>

      {/* Role-specific KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Status Absensi Anda Hari Ini</span>
            <Clock className="h-4 w-4 text-red-600" />
          </div>
          {loading ? (
            <div className="mt-3 h-7 w-28 animate-pulse rounded bg-slate-100" />
          ) : todayRecord ? (
            <>
              <p className="mt-2 text-xl font-extrabold text-emerald-700">
                {EMPLOYEE_STATUS_LABELS[todayRecord.status]}
              </p>
              <p className="mt-1 font-mono text-xs text-slate-500 tabular-nums">
                Masuk: {formatTimeID(todayRecord.check_in)} · Pulang:{' '}
                {formatTimeID(todayRecord.check_out)}
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 text-xl font-extrabold text-amber-600">Belum Absen</p>
              <p className="mt-1 text-xs text-slate-500">Silakan isi absensi karyawan hari ini</p>
            </>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Kehadiran Anda Bulan Ini</span>
            <CheckCircle2 className="h-4 w-4 text-red-600" />
          </div>
          {loading ? (
            <div className="mt-3 h-7 w-16 animate-pulse rounded bg-slate-100" />
          ) : (
            <>
              <p className="mt-2 text-2xl font-extrabold text-slate-900 tabular-nums">
                {stats.myMonthPresentCount} Hari
              </p>
              <p className="mt-1 text-xs text-slate-500">Status Hadir & Terlambat bulan berjalan</p>
            </>
          )}
        </div>

        {(role === 'admin' || role === 'guru') && (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Siswa Hadir Hari Ini</span>
              <GraduationCap className="h-4 w-4 text-red-600" />
            </div>
            {loading ? (
              <div className="mt-3 h-7 w-24 animate-pulse rounded bg-slate-100" />
            ) : (
              <>
                <p className="mt-2 text-2xl font-extrabold text-slate-900 tabular-nums">
                  {stats.studentsPresentToday}{' '}
                  <span className="text-sm font-medium text-slate-400">
                    / {stats.totalStudents}
                  </span>
                </p>
                <p className="mt-1 text-xs text-slate-500">Total siswa terdaftar di sekolah</p>
              </>
            )}
          </div>
        )}

        {role === 'admin' && (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Karyawan Hadir Hari Ini</span>
              <Users className="h-4 w-4 text-red-600" />
            </div>
            {loading ? (
              <div className="mt-3 h-7 w-24 animate-pulse rounded bg-slate-100" />
            ) : (
              <>
                <p className="mt-2 text-2xl font-extrabold text-slate-900 tabular-nums">
                  {stats.employeesPresentToday}{' '}
                  <span className="text-sm font-medium text-slate-400">
                    / {stats.totalEmployees}
                  </span>
                </p>
                <p className="mt-1 text-xs text-slate-500">Admin, Guru & Tenaga Kependidikan</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions & Personal History */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white lg:col-span-7">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h3 className="text-base font-bold text-slate-900">Riwayat Absensi Terakhir Anda</h3>
            <Link
              to="/app/absensi-karyawan"
              className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700"
            >
              Semua Riwayat
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-slate-100" />
              ))}
            </div>
          ) : recentHistory.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-medium text-slate-600">
                Belum ada catatan absensi pribadi.
              </p>
              <Link
                to="/app/absensi-karyawan"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
              >
                Catat Absensi Pertama
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <tr>
                    <th className="px-6 py-3">Tanggal</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Masuk</th>
                    <th className="px-6 py-3">Pulang</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      <td className="px-6 py-3 font-medium text-slate-900 tabular-nums">
                        {formatDateID(item.date)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-semibold ${
                            item.status === 'hadir'
                              ? 'text-emerald-700'
                              : item.status === 'terlambat'
                                ? 'text-amber-700'
                                : 'text-red-700'
                          }`}
                        >
                          {EMPLOYEE_STATUS_LABELS[item.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 tabular-nums">
                        {formatTimeID(item.check_in)}
                      </td>
                      <td className="px-6 py-3 font-mono text-xs text-slate-600 tabular-nums">
                        {formatTimeID(item.check_out)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Role Guide Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5">
          <h3 className="text-base font-bold text-slate-900">Akses Menu Peran Anda</h3>
          <p className="mt-1 text-sm text-slate-600">
            Navigasi di sebelah kiri menyesuaikan hak akses role{' '}
            <span className="font-semibold text-red-600">{ROLE_LABELS[role]}</span>.
          </p>

          <div className="mt-5 space-y-3">
            <Link
              to="/app/absensi-karyawan"
              className="flex items-center justify-between rounded-lg border border-slate-200 p-3.5 transition-colors hover:border-red-300 hover:bg-red-50/40"
            >
              <div>
                <p className="text-sm font-bold text-slate-900">Absensi Karyawan Mandiri</p>
                <p className="text-xs text-slate-500">Check-in masuk dan check-out pulang harian</p>
              </div>
              <ArrowRight className="h-4 w-4 text-red-600" />
            </Link>

            {(role === 'admin' || role === 'guru') && (
              <>
                <Link
                  to="/app/absensi-siswa"
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-3.5 transition-colors hover:border-red-300 hover:bg-red-50/40"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900">Input Absensi Siswa</p>
                    <p className="text-xs text-slate-500">Catat kehadiran siswa per kelas</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-red-600" />
                </Link>

                <Link
                  to="/app/rekap/siswa"
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-3.5 transition-colors hover:border-red-300 hover:bg-red-50/40"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900">Rekap Absensi Siswa</p>
                    <p className="text-xs text-slate-500">Filter tanggal, kelas & unduh laporan</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-red-600" />
                </Link>
              </>
            )}

            {role === 'admin' && (
              <>
                <Link
                  to="/app/data-siswa"
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-3.5 transition-colors hover:border-red-300 hover:bg-red-50/40"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900">Kelola Data Siswa</p>
                    <p className="text-xs text-slate-500">Tambah & kelola NIS, nama, dan kelas</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-red-600" />
                </Link>

                <Link
                  to="/app/user-management"
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-3.5 transition-colors hover:border-red-300 hover:bg-red-50/40"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900">User Management</p>
                    <p className="text-xs text-slate-500">
                      Sinkron penuh dengan Supabase Authentication
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-red-600" />
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
