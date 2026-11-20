import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Database, Eye, EyeOff, Lock, Mail, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SqlSchemaModal } from '../components/SqlSchemaModal';

const HERO_CAMPUS_IMG = '/src/assets/images/hero_smk_campus_1795137603104.jpg';

export default function LoginPage() {
  const { user, config, loading, signIn, registerFirstAdmin } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'register_first'>('login');
  const [hasUsers, setHasUsers] = useState<boolean | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [nip, setNip] = useState('');
  const [position, setPosition] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [schemaModalOpen, setSchemaModalOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/bootstrap-status')
      .then((r) => r.json())
      .then((data) => {
        if (data.canCheck) {
          setHasUsers(data.hasUsers);
          if (data.hasUsers === false) {
            setMode('register_first');
          }
        }
      })
      .catch(() => {
        // Ignore
      });
  }, []);

  if (!loading && user) {
    return <Navigate to="/app/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setSubmitting(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email.trim(), password);
        if (error) {
          setErrorMsg(error);
        } else {
          navigate('/app/dashboard', { replace: true });
        }
      } else {
        if (password.length < 6) {
          setErrorMsg('Kata sandi minimal 6 karakter.');
          setSubmitting(false);
          return;
        }
        const { error } = await registerFirstAdmin({
          email: email.trim(),
          password,
          full_name: fullName.trim(),
          nip: nip.trim() || undefined,
          position: position.trim() || 'Administrator Sistem',
        });
        if (error) {
          setErrorMsg(error);
        } else {
          setInfoMsg('Akun Admin pertama berhasil dibuat dan masuk ke sistem.');
          navigate('/app/dashboard', { replace: true });
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-12">
      {/* Left Visual Column */}
      <div className="relative hidden overflow-hidden bg-slate-950 lg:col-span-6 lg:block">
        <img
          src={HERO_CAMPUS_IMG}
          alt="Kampus SMK Prima Unggul"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover opacity-75"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/55 to-red-950/35" />
        <div className="absolute inset-0 flex flex-col justify-between p-12 text-white">
          <Link to="/" className="text-xl font-extrabold tracking-tight text-white">
            SMK <span className="text-red-500">Prima Unggul</span>
          </Link>

          <div className="max-w-lg">
            <p className="text-xs font-bold tracking-wide text-red-400">
              Sistem Informasi Presensi Sekolah
            </p>
            <h1 className="mt-2 text-3xl font-extrabold leading-tight [text-wrap:balance]">
              Portal Absensi Siswa & Karyawan Terintegrasi Supabase
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-300">
              Mendukung presensi mandiri seluruh karyawan (Admin, Guru, dan Tenaga Kependidikan)
              serta pencatatan kehadiran siswa untuk program keahlian TKJ, DKV, AK, BC, MPLB, dan
              BD.
            </p>
          </div>
        </div>
      </div>

      {/* Right Auth Form Column */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:col-span-6 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-red-600"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Beranda
            </Link>

            <button
              type="button"
              onClick={() => setSchemaModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-red-600"
            >
              <Database className="h-3.5 w-3.5" />
              Skema SQL
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
              {mode === 'login' ? 'Masuk ke Portal Absensi' : 'Registrasi Admin Pertama'}
            </h2>
            <p className="mt-1.5 text-sm text-slate-600">
              {mode === 'login'
                ? 'Gunakan akun Supabase Authentication Anda untuk mengakses aplikasi.'
                : 'Akun pertama yang dibuat di Supabase Authentication otomatis ditetapkan sebagai Admin.'}
            </p>
          </div>

          {/* Toggle between Login and First Admin registration when allowed */}
          {hasUsers === false || hasUsers === null ? (
            <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                }}
                className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                  mode === 'login'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Masuk Akun
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register_first');
                  setErrorMsg(null);
                }}
                className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                  mode === 'register_first'
                    ? 'bg-white text-red-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Daftar User Pertama
              </button>
            </div>
          ) : null}

          {!loading && config && !config.configured && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                <div>
                  <p className="font-bold">Konfigurasi Supabase Belum Ditemukan</p>
                  <p className="mt-1 text-xs leading-relaxed text-red-800">
                    Tambahkan <code className="font-mono font-semibold">VITE_SUPABASE_URL</code>,{' '}
                    <code className="font-mono font-semibold">VITE_SUPABASE_ANON_KEY</code>, dan{' '}
                    <code className="font-mono font-semibold">SUPABASE_SERVICE_ROLE_KEY</code> pada
                    Secrets / environment aplikasi, lalu jalankan{' '}
                    <button
                      type="button"
                      onClick={() => setSchemaModalOpen(true)}
                      className="font-semibold underline hover:text-red-950"
                    >
                      skema SQL Supabase
                    </button>
                    .
                  </p>
                </div>
              </div>
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{infoMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register_first' && (
              <>
                <div>
                  <label htmlFor="full_name" className="block text-xs font-semibold text-slate-700">
                    Nama Lengkap
                  </label>
                  <input
                    id="full_name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Contoh: Budi Santoso, S.Kom"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-600/15"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="nip" className="block text-xs font-semibold text-slate-700">
                      NIP / NUPTK (Opsional)
                    </label>
                    <input
                      id="nip"
                      type="text"
                      value={nip}
                      onChange={(e) => setNip(e.target.value)}
                      placeholder="19870412..."
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 font-mono text-sm text-slate-900 outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-600/15"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="position"
                      className="block text-xs font-semibold text-slate-700"
                    >
                      Jabatan
                    </label>
                    <input
                      id="position"
                      type="text"
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      placeholder="Administrator Utama"
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-600/15"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700">
                Alamat Email
              </label>
              <div className="relative mt-1.5">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@smkprimaunggul.sch.id"
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3.5 text-sm text-slate-900 outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-600/15"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700">
                Kata Sandi
              </label>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-10 text-sm text-slate-900 outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-600/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !config?.configured}
              className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? 'Memproses...'
                : mode === 'login'
                  ? 'Masuk ke Aplikasi'
                  : 'Buat Akun Admin Pertama'}
            </button>
          </form>

          <p className="mt-6 text-xs leading-relaxed text-slate-500">
            Akun Guru dan Tenaga Kependidikan baru ditambahkan oleh Admin melalui menu{' '}
            <span className="font-semibold text-slate-700">User Management</span> dan langsung
            tersinkronisasi ke Supabase Authentication.
          </p>
        </div>
      </div>

      <SqlSchemaModal open={schemaModalOpen} onClose={() => setSchemaModalOpen(false)} />
    </div>
  );
}
