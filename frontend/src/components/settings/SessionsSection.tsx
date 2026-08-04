"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchSessions, revokeOtherSessions, revokeSession, type JwtSession } from "@/lib/api";
import { Button, ConfirmDialog, ErrorState, SkeletonList } from "@/components/ui";
import { useLang } from "@/contexts/LanguageContext";
import styles from "@/app/settings/SettingsPage.module.css";
import { errorMessage, InlineMessage, type SettingsText as Text } from "./settingsShared";

/** いま確認を求めている操作。1 つのダイアログを使い回すので、種類で見分ける。 */
type Confirmation = { kind: "session"; id: string } | { kind: "others" } | null;

export function SessionsSection({ text, reloadToken, onCurrentRevoked }: { text: Text; reloadToken: number; onCurrentRevoked: () => void }) {
  const { lang } = useLang();
  const [sessions, setSessions] = useState<JwtSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    fetchSessions()
      .then(setSessions)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let active = true;
    fetchSessions()
      .then((items) => {
        if (active) setSessions(items);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadToken]);

  const confirm = async () => {
    const target = confirmation;
    if (!target) return;
    setConfirmation(null);
    setBusy(true);
    setMessage(null);
    try {
      if (target.kind === "session") {
        const current = sessions.find((session) => session.id === target.id)?.current;
        await revokeSession(target.id);
        if (current) {
          onCurrentRevoked();
          return;
        }
      } else if (target.kind === "others") {
        await revokeOtherSessions();
      }
      setMessage({ type: "success", text: text.sessionRevoked });
      load();
    } catch (caught) {
      setMessage({ type: "error", text: errorMessage(caught, text.actionFailed) });
    } finally {
      setBusy(false);
    }
  };

  const date = (value: string) => new Intl.DateTimeFormat(lang === "ja" ? "ja-JP" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

  return (
    <section id="sessions" className={styles.section} aria-labelledby="sessions-heading" aria-busy={busy || loading}>
      <h2 id="sessions-heading">{text.sessions}</h2>
      <p className={styles.description}>{text.sessionsDesc}</p>
      {loading ? <SkeletonList count={2} /> : error ? (
        <ErrorState title={text.loadFailed} message={text.loadFailedDesc} retryLabel={text.retry} onRetry={load} />
      ) : sessions.length === 0 ? (
        <p className={styles.notice}>{text.noSessions}</p>
      ) : (
        <ul className={styles.sessionList}>
          {sessions.map((session) => (
            <li key={session.id} className={styles.session}>
              <div>
                <p className={styles.sessionTitle}>{session.current ? text.currentSession : text.otherSession}</p>
                <p className={styles.sessionMeta}>{text.issued}: {date(session.created_at)}<br />{text.expires}: {date(session.expires_at)}</p>
              </div>
              <Button variant="ghost" disabled={busy} onClick={() => setConfirmation({ kind: "session", id: session.id })}>{text.revoke}</Button>
            </li>
          ))}
        </ul>
      )}
      <div className={`${styles.actions} mt-4`}>
        <Button variant="ghost" disabled={busy || sessions.filter((session) => !session.current).length === 0} onClick={() => setConfirmation({ kind: "others" })}>{text.revokeOthers}</Button>
      </div>
      <InlineMessage message={message} />
      <ConfirmDialog
        open={confirmation?.kind === "session" || confirmation?.kind === "others"}
        title={confirmation?.kind === "others" ? text.revokeOthersTitle : text.revokeTitle}
        description={confirmation?.kind === "others" ? text.revokeOthersDesc : text.revokeDesc}
        confirmText={text.revoke}
        cancelText={text.cancel}
        destructive
        onConfirm={confirm}
        onCancel={() => setConfirmation(null)}
      />
    </section>
  );
}
