import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "../supabase.js";

const AuthContext = createContext(null);
const ACTIVE_EMAIL_KEY = "plate.active-email";
const ADMIN_EMAIL = "sashankuday@gmail.com";

function normaliseEmail(email) {
  return email.trim().toLowerCase();
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function getProfile(userId) {
  const { data, error } = await supabase.from("profiles").select("id, email, dietary_requirements, blocked_ingredients, can_edit").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    async function restore() {
      if (!isSupabaseConfigured) {
        if (live) setLoading(false);
        return;
      }
      try {
        const { data } = await supabase.auth.getSession();
        const authUser = data.session?.user;
        const activeEmail = localStorage.getItem(ACTIVE_EMAIL_KEY);
        if (authUser && activeEmail) {
          const profile = await getProfile(authUser.id);
          if (profile?.email === activeEmail && live) setUser(profile);
        }
      } catch {
        if (live) setUser(null);
      } finally {
        if (live) setLoading(false);
      }
    }
    restore();
    return () => { live = false; };
  }, []);

  const signIn = useCallback(async (rawEmail) => {
    if (!isSupabaseConfigured) throw new Error("Connect Plate to Supabase before signing in.");
    const email = normaliseEmail(rawEmail);
    if (!validEmail(email)) throw new Error("Enter a complete email address.");

    setLoading(true);
    try {
      let { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        const anonymous = await supabase.auth.signInAnonymously();
        if (anonymous.error) {
          throw new Error("Email accounts need Anonymous Sign-Ins enabled in Supabase Authentication settings.");
        }
        sessionData = { session: anonymous.data.session };
      }

      const authUser = sessionData.session.user;
      const existing = await getProfile(authUser.id);
      if (existing && existing.email !== email) {
        throw new Error(`This browser is already linked to ${existing.email}. Magic-link account switching is intentionally deferred.`);
      }

      if (!existing) {
        const created = await supabase.from("profiles").insert({ id: authUser.id, email }).select("id, email, dietary_requirements, blocked_ingredients, can_edit").single();
        if (created.error) {
          if (created.error.code === "23505") {
            throw new Error("That email belongs to a session on another browser. Cross-device sign-in will be available when magic links are enabled.");
          }
          throw created.error;
        }
        setUser(created.data);
      } else {
        setUser(existing);
      }
      localStorage.setItem(ACTIVE_EMAIL_KEY, email);
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(ACTIVE_EMAIL_KEY);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (changes) => {
    if (!user) throw new Error("Sign in before updating your account.");
    const { data, error } = await supabase
      .from("profiles")
      .update(changes)
      .eq("id", user.id)
      .select("id, email, dietary_requirements, blocked_ingredients, can_edit")
      .single();
    if (error) throw error;
    setUser(data);
    return data;
  }, [user]);

  const value = useMemo(() => ({
    user,
    loading,
    isConfigured: isSupabaseConfigured,
    canEdit: Boolean(user?.can_edit),
    isAdmin: user?.email === ADMIN_EMAIL,
    signIn,
    signOut,
    updateProfile,
  }), [user, loading, signIn, signOut, updateProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}
