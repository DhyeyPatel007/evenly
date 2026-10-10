import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';

export interface Profile {
  id: string;
  display_name: string;
}

interface AuthCtx {
  ready: boolean;
  session: Session | null;
  userId: string | null;
  profile: Profile | null;
  /** Returns an error message, or null on success. */
  signUp(email: string, password: string, name: string): Promise<string | null>;
  signIn(email: string, password: string): Promise<string | null>;
  signOut(): Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

async function ensureProfile(userId: string, fallbackName: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('id', userId)
    .maybeSingle();
  if (data) return data as Profile;
  const { data: ins, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, display_name: fallbackName || 'Member' }, { onConflict: 'id' })
    .select('id, display_name')
    .maybeSingle();
  if (error || !ins) return null;
  return ins as Profile;
}

function metaName(s: Session): string {
  const meta = s.user.user_metadata as { display_name?: string } | null;
  return meta?.display_name ?? s.user.email?.split('@')[0] ?? 'Member';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let live = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!live) return;
      setSession(data.session);
      if (data.session) setProfile(await ensureProfile(data.session.user.id, metaName(data.session)));
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      if (!live) return;
      setSession(s);
      setProfile(s ? await ensureProfile(s.user.id, metaName(s)) : null);
    });
    return () => {
      live = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, name: string): Promise<string | null> => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { display_name: name.trim() } },
    });
    if (error) return error.message;
    if (!data.session) {
      // Project still requires email confirmation — account exists, no session yet.
      await supabase.auth.signOut();
      return 'Account created. Check your email for the confirmation link, then sign in.';
    }
    return null;
  };

  const signIn = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    return error ? error.message : null;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Ctx.Provider
      value={{ ready, session, userId: session?.user.id ?? null, profile, signUp, signIn, signOut }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
