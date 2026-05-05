"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { type User, fetchMe, logout as apiLogout } from "@/lib/api";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  setUser: () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // csrftoken Cookie を取得してから認証状態を確認する
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ""}/api/csrf/`, { credentials: "include" })
      .catch(() => {})
      .finally(() => {
        fetchMe()
          .then(setUser)
          .catch(() => setUser(null))
          .finally(() => setLoading(false));
      });
  }, []);

  const logout = async () => {
    try {
      await apiLogout();
    } catch {
      // ignore logout errors
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
