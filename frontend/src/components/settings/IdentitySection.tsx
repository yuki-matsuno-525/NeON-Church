"use client";

import { useId, useState } from "react";
import { updateAccountIdentity, type AccountSettings } from "@/lib/api";
import { PasswordField } from "@/components/auth/PasswordField";
import { Button } from "@/components/ui";
import styles from "@/app/settings/SettingsPage.module.css";
import { errorMessage, InlineMessage, type SettingsText as Text } from "./settingsShared";

export function IdentitySection({ settings, text, onUpdated }: { settings: AccountSettings; text: Text; onUpdated: (value: AccountSettings) => void }) {
  const passwordId = useId();
  const [username, setUsername] = useState(settings.username);
  const [email, setEmail] = useState(settings.email);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const updated = await updateAccountIdentity({ username, email, current_password: password });
      onUpdated(updated);
      setPassword("");
      setMessage({ type: "success", text: text.identitySaved });
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error, text.actionFailed) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="identity" className={styles.section} aria-labelledby="identity-heading">
      <h2 id="identity-heading">{text.identity}</h2>
      <p className={styles.description}>{text.identityDesc}</p>
      {!settings.has_usable_password ? (
        <p className={styles.notice}>{text.oauthIdentity}</p>
      ) : (
        <form className={styles.form} onSubmit={submit} aria-busy={busy}>
          <fieldset className={`${styles.form} m-0 border-0 p-0`} disabled={busy}>
            <label className={styles.field}>
              <span>{text.username}</span>
              <input className={styles.input} value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" maxLength={150} required />
            </label>
            <label className={styles.field}>
              <span>{text.email}</span>
              <input className={styles.input} type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" maxLength={254} required />
            </label>
            <div className={styles.field}>
              <label htmlFor={passwordId}>{text.currentPassword}</label>
              <PasswordField id={passwordId} value={password} onChange={setPassword} autoComplete="current-password" required inputClassName="form-control" />
            </div>
            <div className={styles.actions}><Button type="submit" loading={busy}>{text.saveIdentity}</Button></div>
          </fieldset>
          <InlineMessage message={message} />
        </form>
      )}
    </section>
  );
}
