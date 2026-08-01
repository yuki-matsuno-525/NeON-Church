"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
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
    // csrftoken Cookie の取得と認証状態の確認を同時に投げる。
    // csrftoken は書き込み（POST など）にしか要らないので、読み取りの /auth/me を
    // 待たせる理由がない。以前は直列だったため全ページで最初の表示が1往復ぶん遅れていた。
    fetch("/api/csrf/", { credentials: "include" }).catch(() => {});
    fetchMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // ignore logout errors
    }
    setUser(null);
  }, []);

  // 毎回新しいオブジェクトを渡すと、useAuth を使う全画面が無関係な再描画に巻き込まれる。
  const value = useMemo(
    () => ({ user, loading, setUser, logout }),
    [user, loading, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
