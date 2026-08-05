"use client";

import { useId, useState } from "react";
import { changePassword, type AccountSettings } from "@/lib/api";
import { PasswordField } from "@/components/auth/PasswordField";
import { Button } from "@/components/ui";
import styles from "@/app/settings/SettingsPage.module.css";
import { errorMessage, InlineMessage, type SettingsText as Text } from "./settingsShared";

export function PasswordSection({ settings, text, onChanged }: { settings: AccountSettings; text: Text; onChanged: () => void }) {
  const currentId = useId();
  const newId = useId();
  const confirmId = useId();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: text.passwordMismatch });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onChanged();
      setMessage({ type: "success", text: text.passwordChanged });
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error, text.actionFailed) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="password" className={styles.section} aria-labelledby="password-heading">
      <h2 id="password-heading">{text.password}</h2>
      <p className={styles.description}>{text.passwordDesc}</p>
      {!settings.has_usable_password ? (
        <p className={styles.notice}>{text.oauthPassword}</p>
      ) : (
        <form className={styles.form} onSubmit={submit} aria-busy={busy}>
          <fieldset className={`${styles.form} m-0 border-0 p-0`} disabled={busy}>
            <PasswordInput id={currentId} label={text.currentPassword} value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />
            <PasswordInput id={newId} label={text.newPassword} value={newPassword} onChange={setNewPassword} autoComplete="new-password" hint={text.passwordHint} />
            <PasswordInput id={confirmId} label={text.confirmPassword} value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
            <div className={styles.actions}><Button type="submit" loading={busy}>{text.changePassword}</Button></div>
          </fieldset>
          <InlineMessage message={message} />
        </form>
      )}
    </section>
  );
}

function PasswordInput({ id, label, value, onChange, autoComplete, hint }: { id: string; label: string; value: string; onChange: (value: string) => void; autoComplete: "current-password" | "new-password"; hint?: string }) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <PasswordField id={id} value={value} onChange={onChange} autoComplete={autoComplete} required minLength={autoComplete === "new-password" ? 8 : undefined} inputClassName="form-control" />
      {hint && <span className="text-xs text-faint">{hint}</span>}
    </div>
  );
}
