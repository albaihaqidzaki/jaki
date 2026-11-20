import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Client as PgClient } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function getSupabaseEnv() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return { supabaseUrl, supabaseAnonKey, serviceRoleKey };
}

function getAdminClient(): SupabaseClient | null {
  const { supabaseUrl, serviceRoleKey } = getSupabaseEnv();
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getAnonClient(): SupabaseClient | null {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

interface AuthedRequest extends Request {
  authUser?: {
    id: string;
    email?: string;
    role?: string;
  };
}

async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token autentikasi tidak ditemukan.' });
    return;
  }
  const token = authHeader.slice(7);
  const client = getAdminClient() || getAnonClient();
  if (!client) {
    res.status(503).json({ error: 'Konfigurasi Supabase belum lengkap pada server.' });
    return;
  }

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: 'Sesi tidak valid atau sudah kedaluwarsa.' });
    return;
  }

  req.authUser = {
    id: data.user.id,
    email: data.user.email,
  };
  next();
}

async function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  await requireAuth(req, res, async () => {
    const adminClient = getAdminClient();
    if (!adminClient) {
      res.status(503).json({
        error: 'SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di server untuk manajemen user.',
      });
      return;
    }

    const { data: profile, error } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', req.authUser!.id)
      .maybeSingle();

    if (error) {
      res.status(500).json({ error: `Gagal memverifikasi role admin: ${error.message}` });
      return;
    }

    if (!profile || profile.role !== 'admin') {
      res.status(403).json({ error: 'Akses ditolak. Hanya Admin yang dapat mengelola data user.' });
      return;
    }

    req.authUser!.role = profile.role;
    next();
  });
}

async function createServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/config', (_req, res) => {
    const { supabaseUrl, supabaseAnonKey, serviceRoleKey } = getSupabaseEnv();
    const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || '';
    res.json({
      supabaseUrl,
      supabaseAnonKey,
      configured: Boolean(supabaseUrl && supabaseAnonKey),
      hasServiceRole: Boolean(supabaseUrl && serviceRoleKey),
      hasDbUrl: Boolean(dbUrl),
    });
  });

  app.get('/api/db/schema', (_req, res) => {
    try {
      const schemaPath = path.resolve(__dirname, 'supabase', 'schema.sql');
      const sql = fs.readFileSync(schemaPath, 'utf8');
      res.json({ sql });
    } catch {
      res.status(500).json({ error: 'Gagal membaca file supabase/schema.sql.' });
    }
  });

  app.get('/api/db/status', async (_req, res) => {
    const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || '';
    const adminClient = getAdminClient() || getAnonClient();
    const tableNames = [
      'profiles',
      'jurusan',
      'classes',
      'students',
      'employee_attendance',
      'student_attendance',
    ];

    if (!adminClient) {
      res.json({
        configured: false,
        hasDbUrl: Boolean(dbUrl),
        tables: tableNames.map((name) => ({ name, exists: false, count: null })),
      });
      return;
    }

    const tables = await Promise.all(
      tableNames.map(async (name) => {
        const { count, error } = await adminClient
          .from(name)
          .select('*', { count: 'exact', head: true });
        if (error) {
          return { name, exists: false, count: null, error: error.message };
        }
        return { name, exists: true, count: count ?? 0 };
      })
    );

    res.json({
      configured: true,
      hasDbUrl: Boolean(dbUrl),
      tables,
    });
  });

  app.post('/api/db/migrate', async (req: AuthedRequest, res: Response) => {
    const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || '';
    if (!dbUrl) {
      res.status(400).json({
        error:
          'SUPABASE_DB_URL atau DATABASE_URL belum dikonfigurasi di server. Salin SQL dan jalankan di Supabase SQL Editor.',
      });
      return;
    }

    // Allow migration during initial bootstrap (no profiles yet) or when authenticated as admin
    const adminClient = getAdminClient();
    if (adminClient) {
      const { count } = await adminClient
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      if ((count ?? 0) > 0) {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
          res.status(401).json({ error: 'Autentikasi Admin diperlukan untuk menjalankan migrasi.' });
          return;
        }
        const token = authHeader.slice(7);
        const { data: userData } = await adminClient.auth.getUser(token);
        if (!userData.user) {
          res.status(401).json({ error: 'Token tidak valid.' });
          return;
        }
        const { data: prof } = await adminClient
          .from('profiles')
          .select('role')
          .eq('id', userData.user.id)
          .maybeSingle();
        if (!prof || prof.role !== 'admin') {
          res.status(403).json({ error: 'Hanya Admin yang dapat menjalankan migrasi database.' });
          return;
        }
      }
    }

    const schemaPath = path.resolve(__dirname, 'supabase', 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    const pgClient = new PgClient({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
    });

    try {
      await pgClient.connect();
      await pgClient.query(sql);
      res.json({
        migrated: true,
        message: 'Database relasional, foreign key, trigger, views, dan RLS berhasil diterapkan ke Supabase.',
      });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Gagal menjalankan migrasi SQL ke Supabase.',
      });
    } finally {
      await pgClient.end();
    }
  });

  // Check whether any user exists yet so the first registrant becomes Admin
  app.get('/api/auth/bootstrap-status', async (_req, res) => {
    const adminClient = getAdminClient();
    if (!adminClient) {
      res.json({ canCheck: false, hasUsers: null });
      return;
    }

    try {
      const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1 });
      if (error) {
        res.json({ canCheck: false, hasUsers: null });
        return;
      }
      res.json({
        canCheck: true,
        hasUsers: (data?.users?.length ?? 0) > 0,
      });
    } catch {
      res.json({ canCheck: false, hasUsers: null });
    }
  });

  // Register the very first user directly with Admin role + auto-confirm
  app.post('/api/auth/register-first', async (req, res) => {
    const adminClient = getAdminClient();
    if (!adminClient) {
      res.status(503).json({
        error: 'SUPABASE_SERVICE_ROLE_KEY belum diatur. Gunakan tab Masuk atau daftar lewat Supabase Auth.',
      });
      return;
    }

    const { email, password, full_name, nip, position } = req.body || {};
    if (!email || !password || !full_name) {
      res.status(400).json({ error: 'Nama lengkap, email, dan kata sandi wajib diisi.' });
      return;
    }

    try {
      const { data: existingList, error: listError } = await adminClient.auth.admin.listUsers({
        page: 1,
        perPage: 1,
      });
      if (listError) {
        res.status(500).json({ error: listError.message });
        return;
      }
      if ((existingList?.users?.length ?? 0) > 0) {
        res.status(403).json({
          error: 'Akun Admin pertama sudah terdaftar. Silakan masuk atau hubungi Admin untuk membuat akun baru.',
        });
        return;
      }

      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email: String(email).trim(),
        password: String(password),
        email_confirm: true,
        user_metadata: {
          full_name: String(full_name).trim(),
          nip: nip ? String(nip).trim() : null,
          position: position ? String(position).trim() : 'Administrator Sistem',
          role: 'admin',
        },
      });

      if (createError || !created.user) {
        res.status(400).json({ error: createError?.message || 'Gagal membuat user pertama.' });
        return;
      }

      const { error: upsertError } = await adminClient.from('profiles').upsert({
        id: created.user.id,
        email: created.user.email,
        full_name: String(full_name).trim(),
        nip: nip ? String(nip).trim() : null,
        position: position ? String(position).trim() : 'Administrator Sistem',
        role: 'admin',
      });

      if (upsertError) {
        res.status(500).json({
          error: `User Auth dibuat, tetapi tabel profiles gagal disinkronkan (${upsertError.message}). Pastikan schema.sql sudah dijalankan di Supabase.`,
        });
        return;
      }

      res.status(201).json({
        user: {
          id: created.user.id,
          email: created.user.email,
          role: 'admin',
        },
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Terjadi kesalahan server.' });
    }
  });

  // Sync current authenticated user's profile (ensures first user becomes admin)
  app.post('/api/auth/sync-profile', requireAuth, async (req: AuthedRequest, res: Response) => {
    const adminClient = getAdminClient();
    const userId = req.authUser!.id;
    const email = req.authUser!.email || '';

    if (!adminClient) {
      res.status(503).json({ error: 'Service role belum tersedia.' });
      return;
    }

    try {
      const { data: existingProfile, error: fetchError } = await adminClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (fetchError) {
        res.status(500).json({ error: fetchError.message });
        return;
      }

      if (existingProfile) {
        res.json({ profile: existingProfile });
        return;
      }

      const { count } = await adminClient
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { data: authData } = await adminClient.auth.admin.getUserById(userId);
      const meta = authData?.user?.user_metadata || {};
      const isFirst = (count ?? 0) === 0;
      const requestedRole = meta.role;
      const role = isFirst
        ? 'admin'
        : requestedRole === 'admin' || requestedRole === 'guru' || requestedRole === 'tenaga_kependidikan'
          ? requestedRole
          : 'tenaga_kependidikan';

      const { data: inserted, error: insertError } = await adminClient
        .from('profiles')
        .insert({
          id: userId,
          email,
          full_name: meta.full_name || email.split('@')[0] || 'Pengguna',
          nip: meta.nip || null,
          position: meta.position || (isFirst ? 'Administrator Sistem' : null),
          role,
        })
        .select()
        .single();

      if (insertError) {
        res.status(500).json({ error: insertError.message });
        return;
      }

      res.json({ profile: inserted });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal menyinkronkan profil.' });
    }
  });

  // ADMIN: List all users synced between Supabase Auth & profiles
  app.get('/api/admin/users', requireAdmin, async (_req: AuthedRequest, res: Response) => {
    const adminClient = getAdminClient()!;
    try {
      const [{ data: authList, error: authError }, { data: profiles, error: profError }] =
        await Promise.all([
          adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
          adminClient.from('profiles').select('*').order('created_at', { ascending: true }),
        ]);

      if (authError) {
        res.status(500).json({ error: authError.message });
        return;
      }
      if (profError) {
        res.status(500).json({ error: profError.message });
        return;
      }

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
      const merged = (authList?.users || []).map((u) => {
        const p = profileMap.get(u.id);
        return {
          id: u.id,
          email: p?.email || u.email || '',
          full_name:
            p?.full_name ||
            (u.user_metadata?.full_name as string) ||
            u.email?.split('@')[0] ||
            'Tanpa Nama',
          nip: p?.nip || (u.user_metadata?.nip as string) || null,
          role: p?.role || (u.user_metadata?.role as string) || 'tenaga_kependidikan',
          position: p?.position || (u.user_metadata?.position as string) || null,
          created_at: p?.created_at || u.created_at,
          last_sign_in_at: u.last_sign_in_at || null,
        };
      });

      res.json({ users: merged });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memuat daftar user.' });
    }
  });

  // ADMIN: Create user fully synced with Supabase Authentication
  app.post('/api/admin/users', requireAdmin, async (req: AuthedRequest, res: Response) => {
    const adminClient = getAdminClient()!;
    const { email, password, full_name, nip, role, position } = req.body || {};

    if (!email || !password || !full_name || !role) {
      res.status(400).json({ error: 'Nama lengkap, email, kata sandi, dan role wajib diisi.' });
      return;
    }

    if (!['admin', 'guru', 'tenaga_kependidikan'].includes(role)) {
      res.status(400).json({ error: 'Role tidak valid.' });
      return;
    }

    try {
      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email: String(email).trim(),
        password: String(password),
        email_confirm: true,
        user_metadata: {
          full_name: String(full_name).trim(),
          nip: nip ? String(nip).trim() : null,
          position: position ? String(position).trim() : null,
          role,
        },
      });

      if (createError || !created.user) {
        res.status(400).json({ error: createError?.message || 'Gagal menambah user ke Supabase Auth.' });
        return;
      }

      const { data: profile, error: profError } = await adminClient
        .from('profiles')
        .upsert({
          id: created.user.id,
          email: created.user.email,
          full_name: String(full_name).trim(),
          nip: nip ? String(nip).trim() : null,
          position: position ? String(position).trim() : null,
          role,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (profError) {
        res.status(500).json({ error: profError.message });
        return;
      }

      res.status(201).json({ user: profile });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal menambah user.' });
    }
  });

  // ADMIN: Edit user in both Supabase Authentication and profiles
  app.patch('/api/admin/users/:id', requireAdmin, async (req: AuthedRequest, res: Response) => {
    const adminClient = getAdminClient()!;
    const targetId = String(req.params.id);
    const { email, password, full_name, nip, role, position } = req.body || {};

    if (!email || !full_name || !role) {
      res.status(400).json({ error: 'Nama lengkap, email, dan role wajib diisi.' });
      return;
    }

    if (!['admin', 'guru', 'tenaga_kependidikan'].includes(role)) {
      res.status(400).json({ error: 'Role tidak valid.' });
      return;
    }

    try {
      const updateAuthPayload: {
        email: string;
        password?: string;
        email_confirm: boolean;
        user_metadata: Record<string, string | null>;
      } = {
        email: String(email).trim(),
        email_confirm: true,
        user_metadata: {
          full_name: String(full_name).trim(),
          nip: nip ? String(nip).trim() : null,
          position: position ? String(position).trim() : null,
          role,
        },
      };

      if (password && String(password).trim().length > 0) {
        updateAuthPayload.password = String(password);
      }

      const { error: authUpdateErr } = await adminClient.auth.admin.updateUserById(
        targetId,
        updateAuthPayload,
      );

      if (authUpdateErr) {
        res.status(400).json({ error: authUpdateErr.message });
        return;
      }

      const { data: updatedProfile, error: profError } = await adminClient
        .from('profiles')
        .upsert({
          id: targetId,
          email: String(email).trim(),
          full_name: String(full_name).trim(),
          nip: nip ? String(nip).trim() : null,
          position: position ? String(position).trim() : null,
          role,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (profError) {
        res.status(500).json({ error: profError.message });
        return;
      }

      res.json({ user: updatedProfile });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memperbarui user.' });
    }
  });

  // ADMIN: Hard delete user from Supabase Authentication (and cascade profile)
  app.delete('/api/admin/users/:id', requireAdmin, async (req: AuthedRequest, res: Response) => {
    const adminClient = getAdminClient()!;
    const targetId = String(req.params.id);

    if (targetId === req.authUser!.id) {
      res.status(400).json({ error: 'Tidak dapat menghapus akun yang sedang digunakan untuk login.' });
      return;
    }

    try {
      // Hard delete (shouldSoftDelete = false) from Supabase Authentication
      const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(targetId, false);
      if (deleteAuthError) {
        res.status(400).json({ error: deleteAuthError.message });
        return;
      }

      // Ensure profile record is also removed cleanly
      await adminClient.from('profiles').delete().eq('id', targetId);

      res.json({ deleted: true, id: targetId });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal menghapus user.' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server SMK Prima Unggul berjalan di http://localhost:${PORT}`);
  });
}

createServer();
