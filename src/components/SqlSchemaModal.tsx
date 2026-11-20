import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Database, GitBranch, Play, RefreshCw, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import bundledSchemaSql from '../../supabase/schema.sql?raw';

interface TableStatus {
  name: string;
  exists: boolean;
  count: number | null;
  error?: string;
}

interface SqlSchemaModalProps {
  open: boolean;
  onClose: () => void;
}

const RELATIONS = [
  {
    from: 'auth.users (id)',
    to: 'public.profiles (id)',
    type: '1 : 1 · ON DELETE CASCADE',
    note: 'User pertama otomatis menjadi Admin',
  },
  {
    from: 'public.jurusan (id)',
    to: 'public.classes (jurusan_id)',
    type: '1 : N · ON DELETE RESTRICT',
    note: 'TKJ, DKV, BC, AK, MPLB, BD',
  },
  {
    from: 'public.profiles (id)',
    to: 'public.classes (wali_kelas_id)',
    type: '1 : N · ON DELETE SET NULL',
    note: 'Relasi opsional wali kelas',
  },
  {
    from: 'public.classes (id)',
    to: 'public.students (class_id)',
    type: '1 : N · ON DELETE SET NULL',
    note: 'Sinkron otomatis via trigger kelas',
  },
  {
    from: 'public.profiles (id)',
    to: 'public.employee_attendance (user_id)',
    type: '1 : N · ON DELETE CASCADE',
    note: 'Unique (user_id, date)',
  },
  {
    from: 'public.students (id)',
    to: 'public.student_attendance (student_id)',
    type: '1 : N · ON DELETE CASCADE',
    note: 'Unique (student_id, date)',
  },
  {
    from: 'public.profiles (id)',
    to: 'public.student_attendance (recorded_by)',
    type: '1 : N · ON DELETE SET NULL',
    note: 'Guru / Admin pencatat absensi',
  },
];

export function SqlSchemaModal({ open, onClose }: SqlSchemaModalProps) {
  const { session } = useAuth();
  const [sql, setSql] = useState<string>(bundledSchemaSql);
  const [loadingSql, setLoadingSql] = useState(false);
  const [tables, setTables] = useState<TableStatus[]>([]);
  const [hasDbUrl, setHasDbUrl] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrateMsg, setMigrateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<'relations' | 'sql'>('relations');

  const fetchDetails = useCallback(async () => {
    setLoadingSql(true);
    try {
      const [schemaRes, statusRes] = await Promise.all([
        fetch('/api/db/schema'),
        fetch('/api/db/status'),
      ]);
      if (schemaRes.ok) {
        const sJson = await schemaRes.json();
        if (sJson.sql) setSql(sJson.sql);
      }
      if (statusRes.ok) {
        const stJson = await statusRes.json();
        setTables(stJson.tables || []);
        setHasDbUrl(Boolean(stJson.hasDbUrl));
      }
    } finally {
      setLoadingSql(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchDetails();
      setMigrateMsg(null);
    }
  }, [open, fetchDetails]);

  if (!open) return null;

  const handleCopy = async () => {
    if (!sql) return;
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMigrate = async () => {
    setMigrating(true);
    setMigrateMsg(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }
      const res = await fetch('/api/db/migrate', { method: 'POST', headers });
      const json = await res.json();
      if (!res.ok) {
        setMigrateMsg({ type: 'error', text: json.error || 'Migrasi gagal.' });
      } else {
        setMigrateMsg({ type: 'success', text: json.message });
        await fetchDetails();
      }
    } catch {
      setMigrateMsg({ type: 'error', text: 'Gagal terhubung ke server migrasi.' });
    }
    setMigrating(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sql-modal-title"
    >
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Database className="h-5 w-5 text-red-600" />
            <div>
              <h2 id="sql-modal-title" className="text-base font-bold text-slate-900">
                Database Relasional Supabase
              </h2>
              <p className="text-xs text-slate-500">
                Skema tabel berelasi Foreign Key, Views, Trigger, dan Row Level Security
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasDbUrl && (
              <button
                type="button"
                onClick={handleMigrate}
                disabled={migrating}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
              >
                <Play className="h-3.5 w-3.5" />
                <span>{migrating ? 'Memigrasi...' : 'Jalankan Migrasi ke Supabase'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleCopy}
              disabled={!sql}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50 whitespace-nowrap"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Tersalin' : 'Salin SQL'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup modal"
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Sub-navigation tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-2.5">
          <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-1">
            <button
              type="button"
              onClick={() => setTab('relations')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                tab === 'relations'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Relasi Tabel & Status
            </button>
            <button
              type="button"
              onClick={() => setTab('sql')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                tab === 'sql'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Script SQL (supabase/schema.sql)
            </button>
          </div>

          <button
            type="button"
            onClick={fetchDetails}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-red-600"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Segarkan Status</span>
          </button>
        </div>

        {migrateMsg && (
          <div
            className={`border-b px-6 py-3 text-xs font-medium ${
              migrateMsg.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {migrateMsg.text}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'relations' ? (
            <div className="space-y-6 p-6">
              {/* Live Table Status Grid */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Status Tabel di Supabase
                </h3>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {tables.map((t) => (
                    <div
                      key={t.name}
                      className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5"
                    >
                      <p className="font-mono text-xs font-bold text-slate-900">
                        public.{t.name}
                      </p>
                      <div className="mt-1.5 flex items-center justify-between text-xs">
                        <span
                          className={`font-semibold ${
                            t.exists ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {t.exists ? 'Terhubung' : 'Belum Dibuat'}
                        </span>
                        {t.exists && t.count !== null && (
                          <span className="font-mono text-slate-500 tabular-nums">
                            {t.count} baris
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Foreign Key Relation Table */}
              <div>
                <div className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-red-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Peta Relasi Foreign Key PostgreSQL
                  </h3>
                </div>
                <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                      <tr>
                        <th className="px-4 py-2.5">Tabel Induk (Primary)</th>
                        <th className="px-4 py-2.5">Tabel Anak (Foreign Key)</th>
                        <th className="px-4 py-2.5">Kardinalitas & Constraint</th>
                        <th className="px-4 py-2.5">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {RELATIONS.map((rel) => (
                        <tr key={`${rel.from}-${rel.to}`} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 font-mono font-semibold text-slate-900">
                            {rel.from}
                          </td>
                          <td className="px-4 py-2.5 font-mono font-semibold text-red-700">
                            {rel.to}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-slate-600">{rel.type}</td>
                          <td className="px-4 py-2.5 text-slate-600">{rel.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-950 p-5 text-xs leading-relaxed text-slate-200">
              {loadingSql ? (
                <p className="text-slate-400">Memuat skema SQL...</p>
              ) : (
                <pre className="font-mono whitespace-pre-wrap">{sql}</pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
