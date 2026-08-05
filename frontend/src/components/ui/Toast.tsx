"use client";

import {
  createContext,
  useCallback,
  useContext,
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
      className="toast-stack"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onClose={() => onClose(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  return (
    <div
      role={toast.type === "error" ? "alert" : "status"}
      onClick={onClose}
      className={`toast-item${toast.type === "success" || toast.type === "error" ? ` toast-item-${toast.type}` : ""}`}
    >
      {toast.message}
    </div>
  );
}
