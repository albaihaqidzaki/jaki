import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Cpu,
  GraduationCap,
  MapPin,
  Phone,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const HERO_CAMPUS_IMG = '/src/assets/images/hero_smk_campus_1795137603104.jpg';
const TECH_LAB_IMG = '/src/assets/images/jurusan_tech_lab_1795137603173.jpg';
const BROADCAST_IMG = '/src/assets/images/jurusan_broadcast_studio_1795137603094.jpg';

const JURUSAN_CLUSTERS = [
  {
    number: '01',
    bidang: 'Teknologi Informasi & Desain Kreatif',
    summary:
      'Mempersiapkan teknisi jaringan berstandar industri serta desainer visual yang menguasai produksi media digital modern.',
    programs: [
      {
        code: 'TKJ',
        name: 'Teknik Komputer dan Jaringan',
        focus: 'Infrastruktur server, routing fiber optik, keamanan jaringan, dan administrasi sistem cloud.',
      },
      {
        code: 'DKV',
        name: 'Desain Komunikasi Visual',
        focus: 'Identitas merek, ilustrasi digital, desain antarmuka, serta produksi grafis cetak dan interaktif.',
      },
    ],
  },
  {
    number: '02',
    bidang: 'Broadcasting & Produksi Media',
    summary:
      'Menyiapkan kreator konten, kamerawan, dan produser siaran dengan laboratorium studio audio-visual terintegrasi.',
    programs: [
      {
        code: 'BC',
        name: 'Broadcasting dan Perfilman',
        focus: 'Sinematografi, tata kamera dan pencahayaan, penyutradaraan, penyiaran langsung, dan pascaproduksi.',
      },
    ],
  },
  {
    number: '03',
    bidang: 'Bisnis, Keuangan & Manajemen Perkantoran',
    summary:
      'Membentuk tenaga profesional yang teliti dalam pelaporan keuangan, tata kelola perkantoran modern, dan pemasaran digital.',
    programs: [
      {
        code: 'AK',
        name: 'Akuntansi',
        focus: 'Pembukuan perusahaan jasa & dagang, perpajakan, audit dasar, dan perangkat lunak akuntansi.',
      },
      {
        code: 'MPLB',
        name: 'Manajemen Perkantoran dan Layanan Bisnis',
        focus: 'Korespondensi bisnis, kearsipan digital, pelayanan prima, dan administrasi eksekutif.',
      },
      {
        code: 'BD',
        name: 'Bisnis Digital',
        focus: 'Strategi e-commerce, analitik pemasaran digital, pengelolaan toko daring, dan kewirausahaan.',
      },
    ],
  },
];

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-6 py-4">
          <Link
            to="/"
            className="text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            SMK <span className="text-red-600">Prima Unggul</span>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a
              href="#profil"
              className="transition-colors hover:text-red-600 whitespace-nowrap shrink-0"
            >
              Profil Sekolah
            </a>
            <a
              href="#jurusan"
              className="transition-colors hover:text-red-600 whitespace-nowrap shrink-0"
            >
              Program Keahlian
            </a>
            <a
              href="#sistem-absensi"
              className="transition-colors hover:text-red-600 whitespace-nowrap shrink-0"
            >
              Sistem Absensi
            </a>
            <a
              href="#kontak"
              className="transition-colors hover:text-red-600 whitespace-nowrap shrink-0"
            >
              Kontak
            </a>
          </nav>

          <div className="shrink-0">
            <Link
              to={user ? '/app/dashboard' : '/login'}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 whitespace-nowrap shrink-0"
            >
              {user ? 'Buka Aplikasi' : 'Masuk Portal'}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="border-b border-slate-200 bg-slate-50/70">
        <div className="mx-auto max-w-7xl px-6 py-14 lg:py-20">
          <div className="grid items-stretch gap-10 lg:grid-cols-12">
            <div className="flex flex-col justify-center lg:col-span-6">
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                <span className="text-red-600">Sekolah Menengah Kejuruan Terakreditasi A</span>
                <span aria-hidden="true">·</span>
                <span>3 Bidang Jurusan</span>
                <span aria-hidden="true">·</span>
                <span>6 Konsentrasi Keahlian</span>
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl [text-wrap:balance]">
                Mencetak Lulusan Vokasi yang Terampil, Disiplin, dan Siap Kerja.
              </h1>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600">
                SMK Prima Unggul memadukan pembelajaran berbasis proyek industri pada enam program
                keahlian—TKJ, DKV, AK, BC, MPLB, dan BD—dengan tata kelola presensi digital
                terpadu bagi siswa, guru, dan tenaga kependidikan.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  to={user ? '/app/dashboard' : '/login'}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 whitespace-nowrap shrink-0"
                >
                  {user ? 'Masuk ke Dashboard' : 'Masuk Aplikasi Absensi'}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#jurusan"
                  className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-900 whitespace-nowrap shrink-0"
                >
                  Jelajahi Jurusan
                </a>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="relative h-72 overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:h-96 lg:h-full lg:min-h-[420px]">
                <img
                  src={HERO_CAMPUS_IMG}
                  alt="Gedung Kampus SMK Prima Unggul"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <p className="text-xs font-medium text-red-200">Kampus Terpadu SMK Prima Unggul</p>
                  <p className="mt-1 text-base font-semibold">
                    Laboratorium Praktik Berstandar Industri & Sistem Presensi Terintegrasi
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Full-width 4-column school proof strip below hero split */}
          <div className="mt-12 grid grid-cols-2 gap-4 border-t border-slate-200 pt-10 lg:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">Bidang & Program</p>
              <p className="mt-1.5 text-2xl font-extrabold text-slate-900 tabular-nums">
                3 Jurusan / 6 Prodi
              </p>
              <p className="mt-1 text-xs text-slate-600">TKJ, DKV, AK, BC, MPLB, dan BD</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">Status Akreditasi</p>
              <p className="mt-1.5 text-2xl font-extrabold text-red-600 tabular-nums">Unggul (A)</p>
              <p className="mt-1 text-xs text-slate-600">Kurikulum Merdeka Berbasis Industri</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">Mitra Dunia Usaha</p>
              <p className="mt-1.5 text-2xl font-extrabold text-slate-900 tabular-nums">45+ Mitra</p>
              <p className="mt-1 text-xs text-slate-600">Penyaluran PKL & Rekrutmen Alumni</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <p className="text-xs font-medium text-slate-500">Tingkat Kedisiplinan</p>
              <p className="mt-1.5 text-2xl font-extrabold text-slate-900 tabular-nums">97,4%</p>
              <p className="mt-1 text-xs text-slate-600">Monitoring Kehadiran Harian Real-Time</p>
            </div>
          </div>
        </div>
      </section>

      {/* Profil SMK Prima Unggul */}
      <section id="profil" className="py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="text-xs font-bold tracking-wide text-red-600">Profil Institusi</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 [text-wrap:balance]">
                Tentang SMK Prima Unggul
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                SMK Prima Unggul adalah lembaga pendidikan kejuruan yang berfokus pada pembentukan
                karakter disiplin, penguasaan teknologi terapan, dan kesiapan karier profesional.
                Setiap peserta didik dibimbing oleh tenaga pendidik bersertifikat dengan fasilitas
                laboratorium praktik modern.
              </p>
              <div className="mt-8 space-y-4 border-t border-slate-200 pt-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Pembelajaran Praktik 70%</h3>
                    <p className="text-sm text-slate-600">
                      Porsi praktik laboratorium dan studio lebih besar guna membangun portofolio
                      nyata sejak kelas X.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Budaya Kerja & Kedisiplinan Digital
                    </h3>
                    <p className="text-sm text-slate-600">
                      Seluruh guru, tenaga kependidikan, dan siswa tercatat kehadirannya melalui
                      sistem absensi terpusat.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Asymmetric Bento Visual Grid */}
            <div className="grid gap-6 sm:grid-cols-2 lg:col-span-7">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
                  <img
                    src={TECH_LAB_IMG}
                    alt="Laboratorium Komputer TKJ dan Studio DKV SMK Prima Unggul"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-5">
                  <p className="text-xs font-semibold text-red-600">Fasilitas Teknologi</p>
                  <h3 className="mt-1 text-base font-bold text-slate-900">
                    Lab Jaringan Server & Studio Desain
                  </h3>
                  <p className="mt-1.5 text-sm text-slate-600">
                    Dilengkapi rak server mikrotik, workstation dual-monitor, dan perangkat lunak
                    standar industri.
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
                  <img
                    src={BROADCAST_IMG}
                    alt="Studio Broadcasting dan Perfilman SMK Prima Unggul"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-5">
                  <p className="text-xs font-semibold text-red-600">Fasilitas Media</p>
                  <h3 className="mt-1 text-base font-bold text-slate-900">
                    Studio Siaran & Produksi Video
                  </h3>
                  <p className="mt-1.5 text-sm text-slate-600">
                    Studio kedap suara dengan kamera sinema, pencahayaan profesional, dan meja
                    kendali penyiaran.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Jurusan Section: 3 Rumpun Jurusan / 6 Konsentrasi Keahlian */}
      <section id="jurusan" className="border-y border-slate-200 bg-slate-50 py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-bold tracking-wide text-red-600">Kompetensi Keahlian</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 [text-wrap:balance]">
              3 Bidang Jurusan & 6 Program Keahlian Unggulan
            </h2>
            <p className="mt-3 text-base text-slate-600">
              SMK Prima Unggul menyelenggarakan tiga rumpun jurusan utama yang mencakup konsentrasi
              keahlian TKJ, DKV, BC, AK, MPLB, dan BD.
            </p>
          </div>

          <div className="mt-12 space-y-8">
            {JURUSAN_CLUSTERS.map((cluster) => (
              <div
                key={cluster.number}
                className="rounded-xl border border-slate-200 bg-white p-6 lg:p-8"
              >
                <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-6 md:flex-row md:items-end">
                  <div>
                    <p className="text-xs font-bold text-red-600">
                      {cluster.number}. Bidang Keahlian
                    </p>
                    <h3 className="mt-1 text-xl font-bold text-slate-900">{cluster.bidang}</h3>
                  </div>
                  <p className="max-w-xl text-sm text-slate-600">{cluster.summary}</p>
                </div>

                <div
                  className={`mt-6 grid gap-6 ${
                    cluster.programs.length === 1
                      ? 'md:grid-cols-1'
                      : cluster.programs.length === 2
                        ? 'md:grid-cols-2'
                        : 'md:grid-cols-3'
                  }`}
                >
                  {cluster.programs.map((prog) => (
                    <div
                      key={prog.code}
                      className="rounded-lg border border-slate-200 bg-slate-50/70 p-5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-sm font-bold text-red-600">
                          {prog.code}
                        </span>
                        <span className="text-xs font-medium text-slate-500">Program 3 Tahun</span>
                      </div>
                      <h4 className="mt-2 text-base font-bold text-slate-900">{prog.name}</h4>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">{prog.focus}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sistem Absensi Terpadu */}
      <section id="sistem-absensi" className="py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="text-xs font-bold tracking-wide text-red-600">Digitalisasi Sekolah</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 [text-wrap:balance]">
                Satu Portal Presensi untuk Seluruh Civitas Sekolah
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                Terintegrasi langsung dengan Supabase Authentication dan basis data real-time.
                Setiap peran mendapatkan akses menu yang sesuai dengan tugas dan tanggung jawabnya.
              </p>
              <div className="mt-8">
                <Link
                  to={user ? '/app/dashboard' : '/login'}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                >
                  {user ? 'Buka Dashboard Absensi' : 'Login ke Sistem Absensi'}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:col-span-7">
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <ShieldCheck className="h-6 w-6 text-red-600" />
                <h3 className="mt-4 text-base font-bold text-slate-900">Admin Sekolah</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Mengelola akun pengguna tersinkron penuh ke Supabase Auth, mengelola data induk
                  siswa (NIS, nama, kelas), absen mandiri, serta memantau rekap karyawan & siswa.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <GraduationCap className="h-6 w-6 text-red-600" />
                <h3 className="mt-4 text-base font-bold text-slate-900">Guru Pengajar</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Melakukan absensi karyawan mandiri, mencatat kehadiran siswa per kelas secara
                  cepat, dan meninjau rekapitulasi absensi siswa.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <Users className="h-6 w-6 text-red-600" />
                <h3 className="mt-4 text-base font-bold text-slate-900">Tenaga Kependidikan</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Akses ringkas untuk mencatat jam masuk dan jam pulang harian secara mandiri
                  beserta riwayat presensi pribadi.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <ClipboardCheck className="h-6 w-6 text-red-600" />
                <h3 className="mt-4 text-base font-bold text-slate-900">Rekap & Ekspor CSV</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Penyaringan data berdasarkan rentang tanggal, kelas, maupun status kehadiran dengan
                  dukungan ekspor laporan siap cetak.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer id="kontak" className="border-t border-slate-200 bg-slate-950 text-slate-300">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <p className="text-lg font-extrabold text-white">
                SMK <span className="text-red-500">Prima Unggul</span>
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                Sekolah Menengah Kejuruan dengan fokus kompetensi TKJ, DKV, AK, BC, MPLB, dan BD
                yang mengedepankan kedisiplinan serta keahlian industri.
              </p>
            </div>
            <div>
              <p className="text-sm font-bold text-white">Alamat & Kontak</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-400">
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <span>Jl. Pendidikan Vokasi No. 18, Jakarta Selatan</span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-red-500" />
                  <span className="tabular-nums">(021) 789-4510</span>
                </li>
                <li className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 shrink-0 text-red-500" />
                  <span>info@smkprimaunggul.sch.id</span>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-bold text-white">Navigasi Portal</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-400">
                <li>
                  <a href="#profil" className="hover:text-white">
                    Profil Sekolah
                  </a>
                </li>
                <li>
                  <a href="#jurusan" className="hover:text-white">
                    Program Keahlian (TKJ, DKV, AK, BC, MPLB, BD)
                  </a>
                </li>
                <li>
                  <Link to="/login" className="text-red-400 hover:text-red-300">
                    Halaman Login Sistem Absensi
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-slate-800 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center">
            <p>© {new Date().getFullYear()} SMK Prima Unggul. Seluruh hak cipta dilindungi.</p>
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5" /> TKJ · DKV
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Camera className="h-3.5 w-3.5" /> BC
              </span>
              <span>AK · MPLB · BD</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
