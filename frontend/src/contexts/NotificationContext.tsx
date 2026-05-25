"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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

  // user が変わるたびに refresh / polling を再構築
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      if (pollingIdRef.current) {
        window.clearInterval(pollingIdRef.current);
        pollingIdRef.current = null;
      }
      return;
    }
    refresh();
    pollingIdRef.current = window.setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      if (pollingIdRef.current) {
        window.clearInterval(pollingIdRef.current);
        pollingIdRef.current = null;
      }
    };
  }, [user, refresh]);

  const decrementUnread = useCallback(() => {
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const clearUnread = useCallback(() => {
    setUnreadCount(0);
  }, []);

  return (
    <NotificationContext.Provider value={{ unreadCount, refresh, decrementUnread, clearUnread }}>
      {children}
    </NotificationContext.Provider>
  );
}
