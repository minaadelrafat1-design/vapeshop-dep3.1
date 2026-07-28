import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Customer, Profile, UserRole } from '@/types';
import {
  fetchProfile, setSessionExpiry, isSessionExpired, clearSessionExpiry,
  getRememberPreference, recordFailedLogin, clearFailedLogins, isAccountLocked,
  logActivity, LOCK_THRESHOLD, checkServerLockout, recordServerLoginAttempt,
  recordServerLoginHistory, validatePasswordServer,
} from '@/lib/auth';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  customer: Customer | null;
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string, remember?: boolean) => Promise<{ error: string | null; profile: Profile | null }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshCustomer: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  verifyEmail: () => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const role: UserRole | null = profile?.role ?? null;

  const loadProfile = async (uid: string): Promise<Profile | null> => {
    const p = await fetchProfile(uid);
    setProfile(p);
    return p;
  };

  const loadCustomer = async (uid: string) => {
    const { data } = await supabase.from('customers').select('*').eq('user_id', uid).maybeSingle();
    setCustomer(data as Customer | null);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        Promise.all([
          loadProfile(data.session.user.id),
          loadCustomer(data.session.user.id),
        ]).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        (async () => {
          await Promise.all([
            loadProfile(newSession.user.id),
            loadCustomer(newSession.user.id),
          ]);
        })();
      } else {
        setProfile(null);
        setCustomer(null);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Session timeout watchdog
  useEffect(() => {
    const check = () => {
      if (session && isSessionExpired()) {
        (async () => { await supabase.auth.signOut(); })();
        clearSessionExpiry();
        setSession(null);
        setProfile(null);
        setCustomer(null);
      }
    };
    check();
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, [session]);

  const signUp = async (email: string, password: string, name?: string) => {
    const policyError = await validatePasswordServer(password, email);
    if (policyError) return { error: policyError };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name ?? '' } },
    });
    if (error) return { error: error.message };
    if (data.user) {
      const [first, ...rest] = (name ?? '').split(' ');
      const { error: custError } = await supabase.from('customers').insert({
        user_id: data.user.id,
        first_name: first ?? null,
        last_name: rest.join(' ') || null,
      });
      if (custError) {
        // RLS may block this if email confirmation is required — not fatal,
        // the customer row will be created on first sign-in
        console.warn('Could not create customer row during signup:', custError.message);
      }
    }
    return { error: null };
  };

  const signIn = async (email: string, password: string, remember = false): Promise<{ error: string | null; profile: Profile | null }> => {
    // Server-side lockout check (authoritative)
    const serverLocked = await checkServerLockout(email);
    if (serverLocked || isAccountLocked(email)) {
      return { error: `Too many failed attempts. Account locked after ${LOCK_THRESHOLD} tries. Try again in 15 minutes or reset your password.`, profile: null };
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      recordFailedLogin(email);
      await recordServerLoginAttempt(email, false, undefined, error.message);
      return { error: error.message, profile: null };
    }
    clearFailedLogins(email);
    setSessionExpiry(remember || getRememberPreference());
    let loadedProfile: Profile | null = null;
    if (data.user) {
      loadedProfile = await loadProfile(data.user.id);
      if (loadedProfile?.role === 'customer') {
        await loadCustomer(data.user.id);
        const { data: existingCust } = await supabase.from('customers').select('id').eq('user_id', data.user.id).maybeSingle();
        if (!existingCust) {
          const [first, ...rest] = (data.user.user_metadata?.full_name ?? '').split(' ');
          await supabase.from('customers').insert({
            user_id: data.user.id,
            first_name: first || null,
            last_name: rest.join(' ') || null,
          });
        }
      }
      await Promise.all([
        logActivity('login', 'user', data.user.id),
        recordServerLoginAttempt(email, true, data.user.id),
        recordServerLoginHistory(data.user.id, email, true),
      ]);
    }
    return { error: null, profile: loadedProfile };
  };

  const signOut = async () => {
    if (session?.user) await logActivity('logout', 'user', session.user.id);
    await supabase.auth.signOut();
    clearSessionExpiry();
    setProfile(null);
    setCustomer(null);
  };

  const refreshCustomer = async () => {
    if (session?.user) await loadCustomer(session.user.id);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/signin`,
    });
    return { error: error?.message ?? null };
  };

  const verifyEmail = async () => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: session?.user?.email ?? '',
    });
    return { error: error?.message ?? null };
  };

  return (
    <AuthContext.Provider
      value={{
        session, user: session?.user ?? null, customer, profile, role, loading,
        signIn, signUp, signOut, refreshCustomer, resetPassword, verifyEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
