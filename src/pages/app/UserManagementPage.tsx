import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatDateID } from '../../lib/date';
import { ROLE_LABELS, type UserProfile, type UserRole } from '../../types';

export default function UserManagementPage() {
  const { session, user: currentUser, config, refreshProfile } = useAuth();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Add / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('guru');
  const [nip, setNip] = useState('');
  const [position, setPosition] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Hard Delete Modal
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadUsers = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);

    try {
      const res = await fetch('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const json = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: json.error || 'Gagal memuat daftar user.' });
      } else {
        setUsers(json.users || []);
      }
    } catch {
      setFeedback({ type: 'error', message: 'Gagal terhubung ke server manajemen user.' });
    }
    setLoading(false);
  }, [session?.access_token]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.nip || '').toLowerCase().includes(q) ||
        (u.position || '').toLowerCase().includes(q)
      );
    });
  }, [users, roleFilter, search]);

  const openAddModal = () => {
    setEditingUser(null);
    setFullName('');
    setEmail('');
    setPassword('');
    setRole('guru');
    setNip('');
    setPosition('');
    setModalOpen(true);
  };

  const openEditModal = (u: UserProfile) => {
    setEditingUser(u);
    setFullName(u.full_name);
    setEmail(u.email);
    setPassword('');
    setRole(u.role);
    setNip(u.nip || '');
    setPosition(u.position || '');
    setModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token) return;

    if (!editingUser && password.length < 6) {
      setFeedback({ type: 'error', message: 'Kata sandi user baru minimal 6 karakter.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const endpoint = editingUser ? `/api/admin/users/${editingUser.id}` : '/api/admin/users';
      const method = editingUser ? 'PATCH' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          password: password.trim() || undefined,
          role,
          nip: nip.trim() || null,
          position: position.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: json.error || 'Gagal menyimpan data user.' });
      } else {
        setFeedback({
          type: 'success',
          message: editingUser
            ? `Data user ${fullName.trim()} berhasil diperbarui dan disinkronkan ke Supabase Auth.`
            : `User ${fullName.trim()} berhasil ditambahkan ke aplikasi dan Supabase Auth.`,
        });
        setModalOpen(false);
        await loadUsers();
        if (editingUser?.id === currentUser?.id) {
          await refreshProfile();
        }
      }
    } catch {
      setFeedback({ type: 'error', message: 'Terjadi kesalahan jaringan saat menyimpan user.' });
    }
    setSubmitting(false);
  };

  const handleHardDelete = async () => {
    if (!session?.access_token || !deletingUser) return;
    setDeleting(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/users/${deletingUser.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const json = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: json.error || 'Gagal menghapus user.' });
      } else {
        setFeedback({
          type: 'success',
          message: `User ${deletingUser.full_name} berhasil di-hard delete dari aplikasi dan Supabase Authentication.`,
        });
        setDeletingUser(null);
        await loadUsers();
      }
    } catch {
      setFeedback({ type: 'error', message: 'Terjadi kesalahan jaringan saat menghapus user.' });
    }
    setDeleting(false);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold text-red-600">Sinkronisasi Supabase Authentication</p>
            <h2 className="mt-1 text-xl font-extrabold text-slate-900">User Management</h2>
            <p className="mt-1 text-xs text-slate-500">
              Tambah, edit, dan hapus permanen (hard delete sampai ke Supabase Auth) akun Admin,
              Guru, dan Tenaga Kependidikan.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            disabled={config ? !config.hasServiceRole : false}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah User</span>
          </button>
        </div>

        {config && !config.hasServiceRole && (
          <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>
              <code className="font-mono font-semibold">SUPABASE_SERVICE_ROLE_KEY</code> belum
              terpasang di environment server. Tambahkan variabel tersebut agar operasi tambah,
              edit, dan hard delete user ke Supabase Auth aktif.
            </span>
          </div>
        )}

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
          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
            {(
              [
                ['all', 'Semua'],
                ['admin', 'Admin'],
                ['guru', 'Guru'],
                ['tenaga_kependidikan', 'Tenaga Kependidikan'],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setRoleFilter(val)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  roleFilter === val
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, email, atau NIP..."
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-xs text-slate-900 outline-none focus:border-red-600"
            />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-11 animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Tidak ada data user yang sesuai.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-6 py-3">Nama & Email</th>
                  <th className="px-4 py-3">NIP</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Jabatan</th>
                  <th className="px-4 py-3">Terdaftar</th>
                  <th className="px-6 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70">
                      <td className="px-6 py-3">
                        <p className="font-semibold text-slate-900">
                          {u.full_name}
                          {isSelf ? (
                            <span className="ml-2 text-xs font-medium text-red-600">(Anda)</span>
                          ) : null}
                        </p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600 tabular-nums">
                        {u.nip || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-bold ${
                            u.role === 'admin'
                              ? 'text-red-700'
                              : u.role === 'guru'
                                ? 'text-slate-900'
                                : 'text-slate-600'
                          }`}
                        >
                          {ROLE_LABELS[u.role]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{u.position || '-'}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 tabular-nums">
                        {formatDateID(u.created_at)}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => setDeletingUser(u)}
                            title={
                              isSelf
                                ? 'Tidak dapat menghapus akun sendiri'
                                : 'Hard delete dari Supabase Auth'
                            }
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit User Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-base font-bold text-slate-900">
                {editingUser ? 'Edit User & Sinkron Supabase Auth' : 'Tambah User Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="usr-name" className="block text-xs font-semibold text-slate-700">
                    Nama Lengkap
                  </label>
                  <input
                    id="usr-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Contoh: Siti Rahmawati, S.Pd"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/15"
                  />
                </div>

                <div>
                  <label htmlFor="usr-email" className="block text-xs font-semibold text-slate-700">
                    Email Login
                  </label>
                  <input
                    id="usr-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="guru@smkprimaunggul.sch.id"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/15"
                  />
                </div>

                <div>
                  <label htmlFor="usr-role" className="block text-xs font-semibold text-slate-700">
                    Role Pengguna
                  </label>
                  <select
                    id="usr-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/15"
                  >
                    <option value="admin">Admin</option>
                    <option value="guru">Guru</option>
                    <option value="tenaga_kependidikan">Tenaga Kependidikan</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="usr-nip" className="block text-xs font-semibold text-slate-700">
                    NIP / NUPTK (Opsional)
                  </label>
                  <input
                    id="usr-nip"
                    type="text"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    placeholder="19850615..."
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 font-mono text-sm text-slate-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/15"
                  />
                </div>

                <div>
                  <label htmlFor="usr-pos" className="block text-xs font-semibold text-slate-700">
                    Jabatan / Mapel (Opsional)
                  </label>
                  <input
                    id="usr-pos"
                    type="text"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="Guru Produktif TKJ / Staf TU"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/15"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="usr-pass" className="block text-xs font-semibold text-slate-700">
                    {editingUser ? 'Kata Sandi Baru (Kosongkan jika tidak diubah)' : 'Kata Sandi'}
                  </label>
                  <input
                    id="usr-pass"
                    type="password"
                    required={!editingUser}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/15"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {submitting
                    ? 'Menyinkronkan...'
                    : editingUser
                      ? 'Simpan Perubahan'
                      : 'Buat & Sinkronkan User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hard Delete Confirmation Modal */}
      {deletingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">
              Hard Delete User Permanen?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Akun <span className="font-bold text-slate-900">{deletingUser.full_name}</span> (
              <span className="font-mono text-xs">{deletingUser.email}</span>) akan dihapus secara
              permanen (<strong>hard delete</strong>) dari database aplikasi maupun dari{' '}
              <strong>Supabase Authentication</strong>. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleHardDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Menghapus...' : 'Ya, Hard Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
