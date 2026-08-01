"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { requestPasswordReset, type ApiError } from "@/lib/api";
import { useLang } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui";
import styles from "./AuthRecovery.module.css";

const copy = {
  ja: {
    title: "パスワードを再設定",
    lead: "登録したメールアドレスを入力してください。該当するアカウントがある場合、再設定用リンクを送信します。",
    email: "メールアドレス",
    submit: "再設定リンクを送信",
    sending: "送信中...",
    sent: "アカウントが存在する場合、パスワード再設定用メールを送信しました。受信箱と迷惑メールフォルダをご確認ください。",
    failed: "送信できませんでした。通信状態を確認して、もう一度お試しください。",
    back: "ログイン画面へ戻る",
  },
  en: {
    title: "Reset your password",
    lead: "Enter your registered email address. If an account exists, we will send a password reset link.",
    email: "Email address",
    submit: "Send reset link",
    sending: "Sending...",
    sent: "If an account exists, a password reset email has been sent. Check your inbox and spam folder.",
    failed: "We could not send the request. Check your connection and try again.",
    back: "Back to sign in",
  },
} as const;

export default function ForgotPasswordPage() {
  const { lang } = useLang();
  const text = copy[lang];
  const emailId = useId();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await requestPasswordReset(email);
      setMessage({ type: "success", text: text.sent });
    } catch (error) {
      const apiError = error as ApiError;
      setMessage({ type: "error", text: apiError.status === 400 ? apiError.message : text.failed });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.shell}>
      <section className={styles.card} aria-labelledby="password-reset-request-title">
        <h1 id="password-reset-request-title">{text.title}</h1>
        <p className={styles.lead}>{text.lead}</p>
        <form className={styles.form} onSubmit={submit} aria-busy={busy}>
          <div className={styles.field}>
            <label htmlFor={emailId}>{text.email}</label>
            <input id={emailId} className={styles.input} type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required disabled={busy} />
          </div>
          <Button type="submit" loading={busy} style={{ width: "100%" }}>{busy ? text.sending : text.submit}</Button>
          {message && <p role={message.type === "error" ? "alert" : "status"} aria-live="polite" className={`${styles.message} ${message.type === "error" ? styles.error : ""}`}>{message.text}</p>}
        </form>
        <Link className={styles.back} href="/login">{text.back}</Link>
      </section>
    </div>
  );
}
