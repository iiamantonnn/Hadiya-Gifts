import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "./api";
import type { User } from "./types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  login: (email: string, password: string, rememberMe: boolean) => Promise<User>;
  logout: () => Promise<void>;
  setUser: (u: User | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function bootstrap() {
    try {
      const me = await api.get<User>("/auth/me");
      setUser(me);
    } catch {
      // Access token may just be expired - try a silent refresh once before
      // giving up (this is what makes "remember me" actually persistent).
      try {
        const refreshed = await api.post<User>("/auth/refresh");
        setUser(refreshed);
      } catch {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(email: string, password: string, rememberMe: boolean) {
    const loggedIn = await api.post<User>("/auth/login", { email, password, remember_me: rememberMe });
    setUser(loggedIn);
    return loggedIn;
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
    }
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser: bootstrap, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
