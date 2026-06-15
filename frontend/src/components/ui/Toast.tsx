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

export type ToastType = "info" | "success" | "error";

type Toast = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  show: (message: string, options?: { type?: ToastType; duration?: number }) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Provider 外で呼ばれた場合は no-op で返す（テスト容易化）
    return { show: () => {} };
  }
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback<ToastContextValue["show"]>(
    (message, options) => {
      const id = ++idRef.current;
      const type = options?.type ?? "info";
      const duration = options?.duration ?? 3500;
      setToasts((prev) => [...prev, { id, message, type }]);
      window.setTimeout(() => remove(id), duration);
    },
    [remove]
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <ToastStack toasts={toasts} onClose={remove} />
    </ToastContext.Provider>
  );
}

function ToastStack({ toasts, onClose }: { toasts: Toast[]; onClose: (id: number) => void }) {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        zIndex: 1000,
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onClose={() => onClose(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const accent =
    toast.type === "success"
      ? "var(--accent)"
      : toast.type === "error"
      ? "#ef4444"
      : "var(--text-muted)";
  return (
    <div
      role={toast.type === "error" ? "alert" : "status"}
      onClick={onClose}
      style={{
        minWidth: 220,
        // 狭幅画面でも左右 16px の余白を保ち、画面外へはみ出さない
        maxWidth: "min(360px, calc(100vw - 32px))",
        background: "rgba(20, 12, 50, 0.95)",
        border: `1px solid var(--border)`,
        borderLeft: `3px solid ${accent}`,
        color: "var(--text)",
        padding: "10px 14px",
        borderRadius: 8,
        fontSize: 13,
        boxShadow: "0 6px 24px rgba(0, 0, 0, 0.45)",
        cursor: "pointer",
        pointerEvents: "auto",
      }}
    >
      {toast.message}
    </div>
  );
}

// Toast の自動消失で setTimeout を貼るだけのため、明示的に unmount を保証する hook (現状は未使用、将来用)
export function useToastCleanupOnUnmount() {
  useEffect(() => {
    return () => {};
  }, []);
}
