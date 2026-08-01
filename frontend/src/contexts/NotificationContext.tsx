"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { fetchUnreadCount } from "@/lib/api";
import { useAuth } from "./AuthContext";

const POLL_INTERVAL_MS = 30_000;

type NotificationContextValue = {
  unreadCount: number;
  /** サーバから未読件数を再取得する */
  refresh: () => Promise<void>;
  /** 楽観更新で未読数を 1 減らす（個別既読化と同時に呼ぶ） */
  decrementUnread: () => void;
  /** 楽観更新で未読数を 0 にする（全既読化と同時に呼ぶ） */
  clearUnread: () => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    return {
      unreadCount: 0,
      refresh: async () => {},
      decrementUnread: () => {},
      clearUnread: () => {},
    };
  }
  return ctx;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const pollingIdRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const n = await fetchUnreadCount();
      setUnreadCount(n);
    } catch {
      // ignore: ネットワーク断や 401 リフレッシュ失敗時はそのまま
    }
  }, []);

  // user が変わるたびに refresh / polling を再構築。
  // タブが裏に回っている間は止める。見ていない画面のために30秒ごとに通信し、そのたび
  // アプリ全体を描き直すのは無駄なので、表に戻ったときにまとめて取り直す。
  useEffect(() => {
    const stopPolling = () => {
      if (pollingIdRef.current) {
        window.clearInterval(pollingIdRef.current);
        pollingIdRef.current = null;
      }
    };

    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnreadCount(0);
      stopPolling();
      return;
    }

    const startPolling = () => {
      stopPolling();
      pollingIdRef.current = window.setInterval(refresh, POLL_INTERVAL_MS);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refresh();
        startPolling();
      } else {
        stopPolling();
      }
    };

    refresh();
    if (document.visibilityState === "visible") startPolling();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      stopPolling();
    };
  }, [user, refresh]);

  const decrementUnread = useCallback(() => {
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const clearUnread = useCallback(() => {
    setUnreadCount(0);
  }, []);

  // 毎回新しいオブジェクトを渡すと、未読数が変わるたびアプリ全体が描き直しになる。
  const value = useMemo(
    () => ({ unreadCount, refresh, decrementUnread, clearUnread }),
    [unreadCount, refresh, decrementUnread, clearUnread]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
