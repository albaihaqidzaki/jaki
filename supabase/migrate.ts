import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error(
      'Error: SUPABASE_DB_URL atau DATABASE_URL belum diatur. Salin Connection String dari Supabase Dashboard > Settings > Database.'
    );
    process.exit(1);
  }

  const sqlPath = path.resolve(__dirname, 'schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('Menghubungkan ke database PostgreSQL Supabase...');
    await client.connect();
    console.log('Menjalankan migrasi relasional (supabase/schema.sql)...');
    await client.query(sql);
    console.log('Migrasi berhasil! Seluruh tabel, relasi, trigger, dan RLS aktif di Supabase.');
  } catch (err) {
    console.error('Migrasi gagal:', err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
