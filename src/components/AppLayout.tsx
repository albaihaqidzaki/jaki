import { useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ChevronDown,
  ClipboardCheck,
  Database,
  FileSpreadsheet,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../types';
import { SqlSchemaModal } from './SqlSchemaModal';

export default function AppLayout() {
  const { user, profile, loading, schemaError, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [rekapExpanded, setRekapExpanded] = useState(true);
  const [schemaModalOpen, setSchemaModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
          <p className="mt-3 text-sm font-medium text-slate-600">Memuat portal absensi...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const role = profile?.role || 'tenaga_kependidikan';

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const getBreadcrumb = () => {
    const p = location.pathname;
    if (p.includes('/app/absensi-karyawan')) return 'Absensi Karyawan';
    if (p.includes('/app/absensi-siswa')) return 'Absensi Siswa';
    if (p.includes('/app/rekap/karyawan')) return 'Rekap Absensi / Absensi Karyawan';
    if (p.includes('/app/rekap/siswa')) return 'Rekap Absensi / Absensi Siswa';
    if (p.includes('/app/data-siswa')) return 'Data Siswa';
    if (p.includes('/app/user-management')) return 'User Management';
    return 'Dashboard';
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap ${
      isActive
        ? 'bg-red-600 text-white'
        : 'text-slate-700 hover:bg-red-50 hover:text-red-700'
    }`;

  const subNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 rounded-lg py-2 pl-10 pr-3.5 text-sm font-medium transition-colors whitespace-nowrap ${
      isActive
        ? 'bg-red-50 text-red-700 font-semibold'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white">
      {/* Brand Header in Left Sidebar */}
      <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
        <Link to="/" className="text-base font-extrabold tracking-tight text-slate-900">
          SMK <span className="text-red-600">Prima Unggul</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Tutup menu"
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Sidebar Navigation Links */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3.5 py-5" aria-label="Menu Utama">
        <NavLink
          to="/app/dashboard"
          className={navLinkClass}
          onClick={() => setMobileMenuOpen(false)}
        >
          <LayoutDashboard className="h-4 w-4 shrink-0" />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/app/absensi-karyawan"
          className={navLinkClass}
          onClick={() => setMobileMenuOpen(false)}
        >
          <UserCheck className="h-4 w-4 shrink-0" />
          <span>Absensi Karyawan</span>
        </NavLink>

        {(role === 'admin' || role === 'guru') && (
          <NavLink
            to="/app/absensi-siswa"
            className={navLinkClass}
            onClick={() => setMobileMenuOpen(false)}
          >
            <ClipboardCheck className="h-4 w-4 shrink-0" />
            <span>Absensi Siswa</span>
          </NavLink>
        )}

        {(role === 'admin' || role === 'guru') && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setRekapExpanded((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <span className="flex items-center gap-3">
                <FileSpreadsheet className="h-4 w-4 shrink-0" />
                <span>Rekap Absensi</span>
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-transform duration-150 ${
                  rekapExpanded ? 'rotate-180' : ''
                }`}
              />
            </button>

            {rekapExpanded && (
              <div className="mt-1 space-y-1">
                {role === 'admin' && (
                  <NavLink
                    to="/app/rekap/karyawan"
                    className={subNavLinkClass}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>Absensi Karyawan</span>
                  </NavLink>
                )}
                <NavLink
                  to="/app/rekap/siswa"
                  className={subNavLinkClass}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span>Absensi Siswa</span>
                </NavLink>
              </div>
            )}
          </div>
        )}

        {role === 'admin' && (
          <>
            <NavLink
              to="/app/data-siswa"
              className={navLinkClass}
              onClick={() => setMobileMenuOpen(false)}
            >
              <GraduationCap className="h-4 w-4 shrink-0" />
              <span>Data Siswa</span>
            </NavLink>

            <NavLink
              to="/app/user-management"
              className={navLinkClass}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Users className="h-4 w-4 shrink-0" />
              <span>User Management</span>
            </NavLink>
          </>
        )}
      </nav>

      {/* Sidebar Bottom User Identity */}
      <div className="border-t border-slate-200 p-4">
        <div className="rounded-lg bg-slate-50 px-3.5 py-3">
          <p className="truncate text-sm font-bold text-slate-900">
            {profile?.full_name || user.email}
          </p>
          <p className="mt-0.5 text-xs font-medium text-red-600">{ROLE_LABELS[role]}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Desktop Left Sidebar (260px) */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/50"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-64 border-r border-slate-200 bg-white shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header Bar: Breadcrumb on Left, Logout Button on Top Right */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka menu navigasi"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="hidden text-slate-400 sm:inline">SMK Prima Unggul</span>
              <span className="hidden text-slate-300 sm:inline">/</span>
              <h1 className="truncate font-bold text-slate-900">{getBreadcrumb()}</h1>
            </div>
          </div>

          {/* Top Right: User summary & Logout Button */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-bold text-slate-900">
                {profile?.full_name || user.email}
              </p>
              <p className="text-[11px] font-medium text-slate-500">{ROLE_LABELS[role]}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-600 hover:text-white whitespace-nowrap shrink-0"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Schema Setup Notice if tables don't exist yet */}
        {schemaError && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 sm:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-sm text-amber-900">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>{schemaError}</span>
              </div>
              <button
                type="button"
                onClick={() => setSchemaModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 whitespace-nowrap shrink-0"
              >
                <Database className="h-3.5 w-3.5" />
                Lihat & Salin SQL
              </button>
            </div>
          </div>
        )}

        {/* Active Page Viewport */}
        <main className="flex-1 p-4 sm:p-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>

      <SqlSchemaModal open={schemaModalOpen} onClose={() => setSchemaModalOpen(false)} />
    </div>
  );
}
