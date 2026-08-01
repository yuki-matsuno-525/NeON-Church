"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Translations } from "@/lib/i18n";

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export type AutosaveController = {
  status: SaveStatus;
  isDirty: boolean;
  /** Save the newest value immediately. Returns false when the request failed. */
  saveNow: () => Promise<boolean>;
  retry: () => Promise<boolean>;
};

/**
 * Debounced autosave with an explicit flush operation.
 *
 * A consumer must call `saveNow` before an in-app navigation. The hook also warns
 * before a browser-level exit while data is dirty and starts one last best-effort
 * save on `pagehide`/unmount. Failed data stays dirty so it can be retried.
 */
export function useAutosave<T>({
  value,
  onSave,
  delay = 1200,
  enabled = true,
}: {
  value: T;
  onSave: (value: T) => Promise<void>;
  delay?: number;
  enabled?: boolean;
}): AutosaveController {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [isDirty, setIsDirty] = useState(false);
  const firstEnabledRun = useRef(true);
  const mounted = useRef(true);
  const dirtyRef = useRef(false);
  const valueRef = useRef(value);
  const onSaveRef = useRef(onSave);
  const versionRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef<Promise<boolean> | null>(null);
  const saveNowRef = useRef<() => Promise<boolean>>(async () => true);

  const clearTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const saveNow = useCallback(async (): Promise<boolean> => {
    clearTimer();
    if (!enabled || !dirtyRef.current) return true;

    if (inFlightRef.current) {
      const priorSucceeded = await inFlightRef.current;
      if (!priorSucceeded && dirtyRef.current) return false;
      return dirtyRef.current ? saveNowRef.current() : true;
    }

    const savingVersion = versionRef.current;
    const savingValue = valueRef.current;
    if (mounted.current) setStatus("saving");

    const request = onSaveRef.current(savingValue)
      .then(() => {
        if (savingVersion === versionRef.current) {
          dirtyRef.current = false;
          if (mounted.current) {
            setIsDirty(false);
            setStatus("saved");
          }
        } else if (mounted.current) {
          setStatus("dirty");
        }
        return true;
      })
      .catch(() => {
        if (mounted.current) setStatus("error");
        return false;
      })
      .finally(() => {
        inFlightRef.current = null;
      });

    inFlightRef.current = request;
    return request;
  }, [clearTimer, enabled]);

  useEffect(() => {
    valueRef.current = value;
    onSaveRef.current = onSave;
    saveNowRef.current = saveNow;
  }, [value, onSave, saveNow]);

  useEffect(() => {
    if (!enabled) {
      clearTimer();
      return;
    }
    if (firstEnabledRun.current) {
      firstEnabledRun.current = false;
      return;
    }

    versionRef.current += 1;
    dirtyRef.current = true;
    setIsDirty(true);
    setStatus("dirty");
    clearTimer();
    timerRef.current = setTimeout(() => void saveNowRef.current(), delay);

    return clearTimer;
  }, [value, delay, enabled, clearTimer]);

  useEffect(() => {
    const warnBeforeExit = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const flushOnPageHide = () => {
      if (dirtyRef.current) void saveNowRef.current();
    };
    window.addEventListener("beforeunload", warnBeforeExit);
    window.addEventListener("pagehide", flushOnPageHide);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeExit);
      window.removeEventListener("pagehide", flushOnPageHide);
    };
  }, []);

  useEffect(() => {
    const saveBeforeLinkNavigation = (event: MouseEvent) => {
      if (!dirtyRef.current || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.dataset.autosaveBypass === "true" || anchor.target || anchor.download) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin || destination.href === window.location.href || destination.hash && destination.pathname === window.location.pathname && destination.search === window.location.search) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      void saveNowRef.current().then((saved) => {
        if (!saved) return;
        anchor.dataset.autosaveBypass = "true";
        anchor.click();
        delete anchor.dataset.autosaveBypass;
      });
    };

    document.addEventListener("click", saveBeforeLinkNavigation, true);
    return () => document.removeEventListener("click", saveBeforeLinkNavigation, true);
  }, []);

  useEffect(() => () => {
    mounted.current = false;
    clearTimer();
    if (dirtyRef.current) void saveNowRef.current();
  }, [clearTimer]);

  return { status, isDirty, saveNow, retry: saveNow };
}

export function saveStatusLabel(status: SaveStatus, t: Translations): string {
  if (status === "saving") return t.saving;
  if (status === "saved") return t.autosaveSaved;
  if (status === "error") return t.autosaveError;
  return "";
}
