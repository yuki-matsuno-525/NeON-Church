"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui";
import { useT } from "@/lib/i18n";

/**
 * 認証切れをアプリ全体に反映する1か所の受け皿。
 *
 * apiClient は「認証済みリクエストが 401 かつ refresh も失敗」したときだけ
 * window の "auth:session-expired" イベントを発火する。ここでそれを受け取り、
 * ログイン表示を解除（setUser(null)）し、「再ログインしてください」を通知する。
 * ログイン中でなければ何もしない（多重通知の防止）。
 */
export function SessionExpiredHandler() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const t = useT();

  useEffect(() => {
    const listener = () => {
      if (!user) return; // 既にログアウト状態なら二重に処理しない
      setUser(null);
      toast.show(t.sessionExpired, { type: "error" });
    };
    window.addEventListener("auth:session-expired", listener);
    return () => window.removeEventListener("auth:session-expired", listener);
  }, [user, setUser, toast, t]);

  return null;
}
