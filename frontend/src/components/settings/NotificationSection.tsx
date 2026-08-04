"use client";

import { useState } from "react";
import { updateNotificationPreferences, type AccountSettings } from "@/lib/api";
import { Button, Toggle } from "@/components/ui";
import styles from "@/app/settings/SettingsPage.module.css";
import { errorMessage, InlineMessage, type SettingsText as Text } from "./settingsShared";

export function NotificationSection({ settings, text, onUpdated }: { settings: AccountSettings; text: Text; onUpdated: (value: AccountSettings) => void }) {
  const [emailEnabled, setEmailEnabled] = useState(settings.email_notifications_enabled);
  const [inAppEnabled, setInAppEnabled] = useState(settings.in_app_notifications_enabled);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const result = await updateNotificationPreferences({ email_notifications_enabled: emailEnabled, in_app_notifications_enabled: inAppEnabled });
      onUpdated({ ...settings, ...result });
      setMessage({ type: "success", text: text.notificationsSaved });
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error, text.actionFailed) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="notifications" className={styles.section} aria-labelledby="notifications-heading">
      <h2 id="notifications-heading">{text.notifications}</h2>
      <p className={styles.description}>{text.notificationsDesc}</p>
      <form className={styles.form} onSubmit={submit} aria-busy={busy}>
        <Toggle checked={emailEnabled} onChange={setEmailEnabled} label={text.emailNotifications} description={text.emailNotificationsDesc} disabled={busy} />
        <Toggle checked={inAppEnabled} onChange={setInAppEnabled} label={text.inAppNotifications} description={text.inAppNotificationsDesc} disabled={busy} />
        <div className={styles.actions}><Button type="submit" loading={busy}>{text.saveNotifications}</Button></div>
        <InlineMessage message={message} />
      </form>
    </section>
  );
}
