"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const saveToken = (token: string) => {
    localStorage.setItem("auraiq_token", token);
    // Write a cookie so Next.js middleware can check auth server-side
    document.cookie = `auraiq_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
  };

  const clearToken = () => {
    localStorage.removeItem("auraiq_token");
    document.cookie = "auraiq_token=; path=/; max-age=0";
  };

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem("auraiq_token");
    if (!token) { setLoading(false); return; }
    try {
      const me = await api.auth.me();
      setUser(me);
    } catch {
      clearToken();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const login = async (email: string, password: string) => {
    const { access_token } = await api.auth.login(email, password);
    saveToken(access_token);
    const me = await api.auth.me();
    setUser(me);
    router.push("/dashboard");
  };

  const register = async (email: string, fullName: string, password: string) => {
    // Registration now requires OTP verification — handled directly in the register page
    await api.auth.register(email, fullName, password);
    router.push(`/verify-otp?email=${encodeURIComponent(email)}&purpose=verify_email`);
  };

  const logout = () => {
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
