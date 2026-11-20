import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { initSupabaseClient } from '../lib/supabase';
import type { SupabaseRuntimeConfig, UserProfile } from '../types';

interface AuthContextValue {
  supabase: SupabaseClient | null;
  config: SupabaseRuntimeConfig | null;
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  schemaError: string | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (params: {
    email: string;
    password: string;
    full_name: string;
    nip?: string;
    position?: string;
  }) => Promise<{ error: string | null; needsEmailConfirmation?: boolean }>;
  registerFirstAdmin: (params: {
    email: string;
    password: string;
    full_name: string;
    nip?: string;
    position?: string;
  }) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [config, setConfig] = useState<SupabaseRuntimeConfig | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  const loadProfile = useCallback(
    async (client: SupabaseClient, currentSession: Session | null) => {
      if (!currentSession?.user) {
        setProfile(null);
        setSchemaError(null);
        return;
      }

      const authUser = currentSession.user;

      // 1. Try direct query to public.profiles
      const { data: profData, error: profError } = await client
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profError) {
        // Likely schema.sql has not been executed yet
        if (profError.code === '42P01' || profError.message.includes('does not exist')) {
          setSchemaError(
            'Tabel public.profiles belum ditemukan di Supabase. Jalankan file supabase/schema.sql pada SQL Editor Supabase Anda.'
          );
        } else {
          setSchemaError(profError.message);
        }
      } else {
        setSchemaError(null);
      }

      if (profData) {
        setProfile(profData as UserProfile);
        return;
      }

      // 2. Fallback: sync via backend API (which ensures first user becomes admin)
      try {
        const res = await fetch('/api/auth/sync-profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentSession.access_token}`,
          },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.profile) {
            setProfile(json.profile as UserProfile);
            setSchemaError(null);
            return;
          }
        }
      } catch {
        // Ignore network error and fall through to client upsert
      }

      // 3. Client-side check if profiles is empty (first user = admin)
      const { count } = await client.from('profiles').select('*', { count: 'exact', head: true });
      const isFirst = (count ?? 0) === 0;
      const meta = authUser.user_metadata || {};
      const fallbackRole = isFirst
        ? 'admin'
        : meta.role === 'admin' || meta.role === 'guru' || meta.role === 'tenaga_kependidikan'
          ? meta.role
          : 'tenaga_kependidikan';

      const { data: inserted } = await client
        .from('profiles')
        .upsert({
          id: authUser.id,
          email: authUser.email || '',
          full_name: meta.full_name || authUser.email?.split('@')[0] || 'Pengguna',
          nip: meta.nip || null,
          position: meta.position || null,
          role: fallbackRole,
        })
        .select()
        .maybeSingle();

      if (inserted) {
        setProfile(inserted as UserProfile);
      } else {
        // Last resort UI profile if table isn't created yet
        setProfile({
          id: authUser.id,
          email: authUser.email || '',
          full_name: meta.full_name || authUser.email?.split('@')[0] || 'Pengguna',
          nip: meta.nip || null,
          position: meta.position || null,
          role: fallbackRole,
          created_at: new Date().toISOString(),
        });
      }
    },
    []
  );

  useEffect(() => {
    let active = true;
    let subscription: { unsubscribe: () => void } | null = null;

    initSupabaseClient().then(async ({ client, config: runtimeConfig }) => {
      if (!active) return;
      setConfig(runtimeConfig);
      setSupabase(client);

      if (!client) {
        setLoading(false);
        return;
      }

      const { data } = await client.auth.getSession();
      if (!active) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      await loadProfile(client, data.session);
      if (active) setLoading(false);

      const { data: authListener } = client.auth.onAuthStateChange(async (_event, newSession) => {
        if (!active) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        await loadProfile(client, newSession);
      });

      subscription = authListener.subscription;
    });

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = async (email: string, password: string) => {
    if (!supabase) return { error: 'Supabase belum dikonfigurasi.' };
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    if (data.session) {
      await loadProfile(supabase, data.session);
    }
    return { error: null };
  };

  const signUp = async (params: {
    email: string;
    password: string;
    full_name: string;
    nip?: string;
    position?: string;
  }) => {
    if (!supabase) return { error: 'Supabase belum dikonfigurasi.' };
    const { data, error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          full_name: params.full_name,
          nip: params.nip || null,
          position: params.position || null,
        },
      },
    });
    if (error) return { error: error.message };
    if (data.session) {
      await loadProfile(supabase, data.session);
      return { error: null, needsEmailConfirmation: false };
    }
    return { error: null, needsEmailConfirmation: true };
  };

  const registerFirstAdmin = async (params: {
    email: string;
    password: string;
    full_name: string;
    nip?: string;
    position?: string;
  }) => {
    if (!supabase) return { error: 'Supabase belum dikonfigurasi.' };

    // Try server endpoint with service role first (auto-confirms and enforces first-user = admin)
    if (config?.hasServiceRole) {
      const res = await fetch('/api/auth/register-first', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const json = await res.json();
      if (!res.ok) {
        return { error: json.error || 'Gagal mendaftarkan admin pertama.' };
      }
      // Immediately sign in
      return signIn(params.email, params.password);
    }

    // Fallback to standard Supabase signUp (trigger handle_new_user assigns admin if first user)
    return signUp(params);
  };

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (supabase && session) {
      await loadProfile(supabase, session);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        supabase,
        config,
        session,
        user,
        profile,
        loading,
        schemaError,
        signIn,
        signUp,
        registerFirstAdmin,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider.');
  }
  return ctx;
}
