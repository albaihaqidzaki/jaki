import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { KELAS_OPTIONS, type SchoolClass, type Student } from '../../types';
import { SqlSchemaModal } from '../../components/SqlSchemaModal';

export default function StudentsDataPage() {
  const { supabase } = useAuth();
  const { kelas: kelasParam } = useParams<{ kelas?: string }>();
  const navigate = useNavigate();

  const activeKelasFilter = kelasParam ? decodeURIComponent(kelasParam) : 'all';

  const [students, setStudents] = useState<Student[]>([]);
  const [schoolClasses, setSchoolClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [schemaModalOpen, setSchemaModalOpen] = useState(false);

  // Add / Edit Modal State
  const [formOpen, setFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [nis, setNis] = useState('');
  const [name, setName] = useState('');
  const [kelas, setKelas] = useState(KELAS_OPTIONS[0]);
  const [customKelas, setCustomKelas] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete Confirmation Modal
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadStudents = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);

    // Fetch relational classes -> jurusan and students -> classes -> jurusan
    const [classesRes, studentsRes] = await Promise.all([
      supabase
        .from('classes')
        .select('id, name, tingkat, jurusan_id, jurusan:jurusan_id(id, code, name, bidang_keahlian)')
        .order('name', { ascending: true }),
      supabase
        .from('students')
        .select('*, classes:class_id(id, name, tingkat, jurusan:jurusan_id(id, code, name, bidang_keahlian))')
        .order('kelas', { ascending: true })
        .order('name', { ascending: true }),
    ]);

    if (!classesRes.error && classesRes.data) {
      setSchoolClasses(classesRes.data as unknown as SchoolClass[]);
    }

    if (studentsRes.error) {
      // Fallback query if relational classes/jurusan tables aren't migrated yet
      const fallback = await supabase
        .from('students')
        .select('*')
        .order('kelas', { ascending: true })
        .order('name', { ascending: true });

      if (fallback.error) {
        setFeedback({ type: 'error', message: fallback.error.message });
      } else {
        setStudents((fallback.data as Student[]) || []);
      }
    } else {
      setStudents((studentsRes.data as unknown as Student[]) || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const availableClassNames = useMemo(() => {
    if (schoolClasses.length > 0) {
      return schoolClasses.map((c) => c.name);
    }
    return KELAS_OPTIONS;
  }, [schoolClasses]);

  const classList = useMemo(() => {
    const existing = students.map((s) => s.kelas);
    return Array.from(new Set(existing)).sort();
  }, [students]);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      if (activeKelasFilter !== 'all' && s.kelas !== activeKelasFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.nis.toLowerCase().includes(q) ||
        s.kelas.toLowerCase().includes(q) ||
        (s.classes?.jurusan?.code || '').toLowerCase().includes(q)
      );
    });
  }, [students, activeKelasFilter, search]);

  const openAddModal = () => {
    setEditingStudent(null);
    setNis('');
    setName('');
    setKelas(
      activeKelasFilter !== 'all' && availableClassNames.includes(activeKelasFilter)
        ? activeKelasFilter
        : availableClassNames[0] || KELAS_OPTIONS[0]
    );
    setCustomKelas('');
    setFormOpen(true);
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setNis(student.nis);
    setName(student.name);
    if (availableClassNames.includes(student.kelas)) {
      setKelas(student.kelas);
      setCustomKelas('');
    } else {
      setKelas('__custom__');
      setCustomKelas(student.kelas);
    }
    setFormOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    const finalKelas = kelas === '__custom__' ? customKelas.trim() : kelas;
    if (!nis.trim() || !name.trim() || !finalKelas) {
      setFeedback({ type: 'error', message: 'NIS, nama siswa, dan kelas wajib diisi.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    const matchedClass = schoolClasses.find(
      (c) => c.name.toLowerCase() === finalKelas.toLowerCase()
    );

    const payload = {
      nis: nis.trim(),
      name: name.trim(),
      kelas: finalKelas,
      class_id: matchedClass?.id || null,
    };

    if (editingStudent) {
      const { error } = await supabase
        .from('students')
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingStudent.id);

      if (error) {
        setFeedback({ type: 'error', message: error.message });
      } else {
        setFeedback({ type: 'success', message: `Data siswa ${name.trim()} berhasil diperbarui.` });
        setFormOpen(false);
        await loadStudents();
      }
    } else {
      const { error } = await supabase.from('students').insert(payload);

      if (error) {
        setFeedback({ type: 'error', message: error.message });
      } else {
        setFeedback({ type: 'success', message: `Siswa ${name.trim()} berhasil ditambahkan.` });
        setFormOpen(false);
        await loadStudents();
      }
    }

    setSubmitting(false);
  };

  const handleDeleteStudent = async () => {
    if (!supabase || !deletingStudent) return;
    setDeleting(true);
    const { error } = await supabase.from('students').delete().eq('id', deletingStudent.id);
    if (error) {
      setFeedback({ type: 'error', message: error.message });
    } else {
      setFeedback({
        type: 'success',
        message: `Data siswa ${deletingStudent.name} berhasil dihapus.`,
      });
      setDeletingStudent(null);
      await loadStudents();
    }
    setDeleting(false);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold text-red-600">Master Data Sekolah</p>
            <h2 className="mt-1 text-xl font-extrabold text-slate-900">
              Data Siswa {activeKelasFilter !== 'all' ? `· ${activeKelasFilter}` : ''}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Terhubung ke tabel relasional <span className="font-mono">students → classes → jurusan</span> di Supabase.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setSchemaModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
            >
              <Database className="h-4 w-4 text-red-600" />
              <span>Relasi Database</span>
            </button>
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Siswa</span>
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

        <div className="mt-5 flex flex-col justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={activeKelasFilter}
              onChange={(e) => {
                const val = e.target.value;
                navigate(
                  val === 'all' ? '/app/data-siswa' : `/app/data-siswa/${encodeURIComponent(val)}`
                );
              }}
              aria-label="Filter berdasarkan kelas"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-red-600"
            >
              <option value="all">Semua Kelas ({students.length})</option>
              {classList.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari NIS, nama, kelas, atau jurusan..."
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-xs text-slate-900 outline-none focus:border-red-600"
            />
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-bold text-slate-900">Belum Ada Data Siswa</p>
            <p className="mt-1 text-xs text-slate-500">
              Tambahkan data siswa (NIS, Nama, Kelas) untuk memulai absensi kelas.
            </p>
            <button
              type="button"
              onClick={openAddModal}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Siswa Pertama</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-6 py-3 w-12">No</th>
                  <th className="px-4 py-3">NIS</th>
                  <th className="px-4 py-3">Nama Siswa</th>
                  <th className="px-4 py-3">Kelas</th>
                  <th className="px-4 py-3">Jurusan</th>
                  <th className="px-6 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((student, idx) => (
                  <tr key={student.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-3 font-mono text-xs text-slate-400 tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-800 tabular-nums">
                      {student.nis}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{student.name}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-800">
                      {student.kelas}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {student.classes?.jurusan
                        ? `${student.classes.jurusan.code} · ${student.classes.jurusan.name}`
                        : '-'}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(student)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingStudent(student)}
                          className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Student Modal */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-base font-bold text-slate-900">
                {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-4 p-6">
              <div>
                <label htmlFor="stu-nis" className="block text-xs font-semibold text-slate-700">
                  NIS (Nomor Induk Siswa)
                </label>
                <input
                  id="stu-nis"
                  type="text"
                  required
                  value={nis}
                  onChange={(e) => setNis(e.target.value)}
                  placeholder="Contoh: 20261001"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 font-mono text-sm text-slate-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/15"
                />
              </div>

              <div>
                <label htmlFor="stu-name" className="block text-xs font-semibold text-slate-700">
                  Nama Lengkap Siswa
                </label>
                <input
                  id="stu-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Ahmad Fauzan"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/15"
                />
              </div>

              <div>
                <label htmlFor="stu-class" className="block text-xs font-semibold text-slate-700">
                  Kelas (Relasi ke Tabel Classes & Jurusan)
                </label>
                <select
                  id="stu-class"
                  value={kelas}
                  onChange={(e) => setKelas(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/15"
                >
                  {availableClassNames.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                  <option value="__custom__">+ Tulis Nama Kelas Lainnya</option>
                </select>
              </div>

              {kelas === '__custom__' && (
                <div>
                  <label
                    htmlFor="stu-custom-class"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Nama Kelas Kustom
                  </label>
                  <input
                    id="stu-custom-class"
                    type="text"
                    required
                    value={customKelas}
                    onChange={(e) => setCustomKelas(e.target.value)}
                    placeholder="Contoh: X TKJ 3"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/15"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : editingStudent ? 'Simpan Perubahan' : 'Simpan Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Hapus Data Siswa?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Data siswa <span className="font-bold text-slate-900">{deletingStudent.name}</span> (
              <span className="font-mono">{deletingStudent.nis}</span>) beserta riwayat absensinya
              akan dihapus permanen.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingStudent(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteStudent}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      <SqlSchemaModal open={schemaModalOpen} onClose={() => setSchemaModalOpen(false)} />
    </div>
  );
}
