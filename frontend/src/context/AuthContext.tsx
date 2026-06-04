"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { api } from "@/lib/api";

interface User {
  id: number;
  email: string;
  full_name: string;
  plan: string;
  study_streak: number;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, fullName: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const saveToken = (token: string) => {
    localStorage.setItem("auraiq_token", token);
    document.cookie = `auraiq_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
  };

  const clearToken = () => {
    localStorage.removeItem("auraiq_token");
    document.cookie = "auraiq_token=; path=/; max-age=0";
  };

  const fetchMe = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.getSession();
    if (error || !data?.session?.access_token) {
      clearToken();
      setLoading(false);
      return;
    }

    saveToken(data.session.access_token);

    try {
      const me = await api.auth.me();
      setUser(me);
    } catch {
      clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.access_token) {
        clearToken();
        setUser(null);
        return;
      }
      saveToken(session.access_token);
    });

    return () => authListener.subscription.unsubscribe();
  }, [fetchMe]);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data?.session?.access_token) {
      throw new Error(error?.message ?? "Login failed. Please try again.");
    }

    saveToken(data.session.access_token);
    const me = await api.auth.me();
    setUser(me);
    router.push("/dashboard");
  };

  const register = async (email: string, fullName: string, password: string) => {
    const { data, error } = await supabase.auth.signUp(
      { email, password },
      { data: { full_name: fullName } }
    );
    if (error) {
      throw new Error(error.message);
    }

    if (data?.session?.access_token) {
      saveToken(data.session.access_token);
      const me = await api.auth.me();
      setUser(me);
      router.push("/dashboard");
      return;
    }

    router.push("/login?registered=1");
  };

  const logout = async () => {
    await supabase.auth.signOut();
    clearToken();
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
