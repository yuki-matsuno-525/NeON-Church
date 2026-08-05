"use client";

import { useId, useState } from "react";
import { deleteAccount, type AccountSettings } from "@/lib/api";
import { PasswordField } from "@/components/auth/PasswordField";
import { Button, ConfirmDialog } from "@/components/ui";
import styles from "@/app/settings/SettingsPage.module.css";
import { errorMessage, InlineMessage, type SettingsText as Text } from "./settingsShared";

export function DangerSection({ settings, text, onDeleted }: { settings: AccountSettings; text: Text; onDeleted: () => void }) {
  const passwordId = useId();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [confirmation, setConfirmation] = useState(false);

  const remove = async () => {
    setConfirmation(false);
    setBusy(true);
    setMessage(null);
    try {
      await deleteAccount(username, settings.has_usable_password ? password : undefined);
      onDeleted();
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error, text.actionFailed) });
      setBusy(false);
    }
  };

  return (
    <section id="danger" className={`${styles.section} ${styles.danger}`} aria-labelledby="danger-heading">
      <h2 id="danger-heading">{text.danger}</h2>
      <p className={styles.description}>{text.dangerDesc}</p>
      <form className={styles.form} aria-busy={busy} onSubmit={(event) => { event.preventDefault(); setConfirmation(true); }}>
        <fieldset className={`${styles.form} m-0 border-0 p-0`} disabled={busy}>
          <label className={styles.field}>
            <span>{text.confirmUsername}</span>
            <input className={styles.input} value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="off" required />
          </label>
          {settings.has_usable_password && (
            <div className={styles.field}>
              <label htmlFor={passwordId}>{text.currentPassword}</label>
              <PasswordField id={passwordId} value={password} onChange={setPassword} autoComplete="current-password" required inputClassName="form-control" />
            </div>
          )}
          <div className={styles.actions}><Button type="submit" variant="destructive" loading={busy}>{text.deleteAccount}</Button></div>
        </fieldset>
        <InlineMessage message={message} />
      </form>
      <ConfirmDialog open={confirmation} title={text.deleteTitle} description={text.deleteDesc} confirmText={text.deleteConfirm} cancelText={text.cancel} destructive onConfirm={remove} onCancel={() => setConfirmation(false)} />
    </section>
  );
}
