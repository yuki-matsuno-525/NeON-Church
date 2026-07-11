"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { LoginRequiredModal } from "@/components/ui/LoginRequiredModal";
import { useT } from "@/lib/i18n";

/**
 * 認証切れをアプリ全体に反映する1か所の受け皿。
 *
 * apiClient は「認証済みリクエストが 401 かつ refresh も失敗」したときだけ
 * window の "auth:session-expired" イベントを発火する。ここでそれを受け取り、
 * ログイン表示を解除（setUser(null)）し、中央モーダルで「セッションが切れました。
 * もう一度ログインしてください」を出す（見落とされにくく、ログイン導線付き）。
 * ログイン中でなければ何もしない（多重表示の防止）。
 */
export function SessionExpiredHandler() {
  const { user, setUser } = useAuth();
  const t = useT();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const listener = () => {
      if (!user) return; // 既にログアウト状態なら二重に処理しない
      setUser(null);
      setOpen(true);
    };
    window.addEventListener("auth:session-expired", listener);
    return () => window.removeEventListener("auth:session-expired", listener);
  }, [user, setUser]);

  if (!open) return null;
  return (
    <LoginRequiredModal
      onClose={() => setOpen(false)}
      title={t.sessionExpiredTitle}
      description={t.sessionExpiredDesc}
    />
  );
}
