import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { SupabaseRuntimeConfig } from '../types';

let cachedClient: SupabaseClient | null = null;
let cachedConfig: SupabaseRuntimeConfig | null = null;

export async function getSupabaseRuntimeConfig(): Promise<SupabaseRuntimeConfig> {
  if (cachedConfig) return cachedConfig;

  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const serverConfig = (await res.json()) as SupabaseRuntimeConfig;
      const supabaseUrl = envUrl || serverConfig.supabaseUrl || '';
      const supabaseAnonKey = envAnonKey || serverConfig.supabaseAnonKey || '';
      cachedConfig = {
        supabaseUrl,
        supabaseAnonKey,
        configured: Boolean(supabaseUrl && supabaseAnonKey),
        hasServiceRole: serverConfig.hasServiceRole,
      };
      return cachedConfig;
    }
  } catch {
    // Fallback to Vite env if /api/config is unreachable
  }

  cachedConfig = {
    supabaseUrl: envUrl,
    supabaseAnonKey: envAnonKey,
    configured: Boolean(envUrl && envAnonKey),
    hasServiceRole: false,
  };
  return cachedConfig;
}

export async function initSupabaseClient(): Promise<{
  client: SupabaseClient | null;
  config: SupabaseRuntimeConfig;
}> {
  const config = await getSupabaseRuntimeConfig();
  if (!config.configured) {
    return { client: null, config };
  }

  if (!cachedClient) {
    cachedClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return { client: cachedClient, config };
}

export function getSupabaseClientSync(): SupabaseClient | null {
  return cachedClient;
}
