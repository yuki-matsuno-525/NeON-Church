"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useLang } from "@/contexts/LanguageContext";
import { FeedbackCategory, sendFeedback } from "@/lib/apiClient";

const REPO_URL = "https://github.com/yuki-matsuno-525/NeON-Church";
const CONTACT_EMAIL = "yuki.matsuno525@gmail.com";

const copy = {
  ja: {
    title: "フィードバック",
    intro: "ご意見、不具合報告、機能のご要望をこちらから送信できます。ログインや GitHub アカウントは不要です。",
    formTitle: "運営に送る",
    category: "種類",
    categories: {
      feedback: "ご意見・ご感想",
      bug: "不具合",
      feature: "機能の要望",
      privacy: "プライバシーに関する連絡",
      other: "その他",
    },
    email: "返信先メールアドレス（任意）",
    emailHint: "返信が必要な場合にのみ使用します。",
    page: "該当ページのURL（任意）",
    message: "内容",
    messageHint: "10〜4,000文字。個人情報やパスワードは入力しないでください。",
    submit: "送信する",
    sending: "送信中…",
    sent: "送信しました。ご協力ありがとうございます。",
    failed: "送信できませんでした。時間をおいて再試行するか、メールをご利用ください。",
    fallback: "別の連絡方法",
    emailCta: "メールで送る",
    issuesCta: "GitHub Issues を開く（新しいタブ）",
    reportTitle: "投稿内容の通報",
    reportBody: "コミュニティガイドラインに反する投稿は、各コメントの「通報」メニューをご利用ください。",
    back: "← トップへ戻る",
  },
  en: {
    title: "Feedback",
    intro: "Send feedback, bug reports, or feature requests here. No sign-in or GitHub account is required.",
    formTitle: "Send to the team",
    category: "Category",
    categories: {
      feedback: "General feedback",
      bug: "Bug report",
      feature: "Feature request",
      privacy: "Privacy request",
      other: "Other",
    },
    email: "Reply-to email (optional)",
    emailHint: "Used only when a response is needed.",
    page: "Relevant page URL (optional)",
    message: "Message",
    messageHint: "10–4,000 characters. Do not include passwords or sensitive personal data.",
    submit: "Send feedback",
    sending: "Sending…",
    sent: "Sent. Thank you for helping us improve.",
    failed: "We could not send this. Try again later or use email instead.",
    fallback: "Other contact options",
    emailCta: "Send an email",
    issuesCta: "Open GitHub Issues (new tab)",
    reportTitle: "Reporting content",
    reportBody: "For content that violates the Community Guidelines, use the Report menu on that comment.",
    back: "← Back to home",
  },
} as const;

export function FeedbackContent() {
  const { lang } = useLang();
  const c = copy[lang === "ja" ? "ja" : "en"];
  const [category, setCategory] = useState<FeedbackCategory>("feedback");
  const [email, setEmail] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<"idle" | "sent" | "error">("idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSending) return;
    setIsSending(true);
    setResult("idle");
    try {
      await sendFeedback({
        category,
        email: email.trim() || undefined,
        page_url: pageUrl.trim() || undefined,
        message: message.trim(),
        website,
      });
      setMessage("");
      setResult("sent");
    } catch {
      setResult("error");
    } finally {
      setIsSending(false);
    }
  }

  const controlStyle = {
    width: "100%",
    minHeight: 44,
    padding: "10px 12px",
    border: "1px solid var(--border)",
    borderRadius: 8,
    background: "var(--bg)",
    color: "var(--text)",
    fontSize: 16,
  } as const;

  return (
    <div className="content-page" style={{ maxWidth: "min(72ch, 100%)", margin: "0 auto", padding: "48px 24px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12, fontFamily: '"Noto Serif JP", serif' }}>{c.title}</h1>
      <p style={{ color: "var(--text-muted)", lineHeight: 1.8, marginBottom: 32 }}>{c.intro}</p>

      <form onSubmit={submit} aria-describedby="feedback-result" style={{ display: "grid", gap: 20 }}>
        <h2 style={{ fontSize: 20, margin: 0 }}>{c.formTitle}</h2>
        <div style={{ display: "grid", gap: 8 }}>
          <label htmlFor="feedback-category" style={{ fontWeight: 700 }}>{c.category}</label>
          <select id="feedback-category" value={category} onChange={(event) => setCategory(event.target.value as FeedbackCategory)} style={controlStyle}>
            {(Object.keys(c.categories) as FeedbackCategory[]).map((value) => (
              <option key={value} value={value}>{c.categories[value]}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          <label htmlFor="feedback-email" style={{ fontWeight: 700 }}>{c.email}</label>
          <input id="feedback-email" aria-describedby="feedback-email-hint" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} style={controlStyle} />
          <span id="feedback-email-hint" style={{ color: "var(--text-muted)", fontSize: 13 }}>{c.emailHint}</span>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          <label htmlFor="feedback-page" style={{ fontWeight: 700 }}>{c.page}</label>
          <input id="feedback-page" type="url" inputMode="url" value={pageUrl} onChange={(event) => setPageUrl(event.target.value)} placeholder="https://" style={controlStyle} />
        </div>
        <label aria-hidden="true" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clipPath: "inset(50%)" }}>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
        </label>
        <div style={{ display: "grid", gap: 8 }}>
          <label htmlFor="feedback-message" style={{ fontWeight: 700 }}>{c.message}</label>
          <textarea id="feedback-message" aria-describedby="feedback-message-hint feedback-message-count" required minLength={10} maxLength={4000} rows={8} value={message} onChange={(event) => setMessage(event.target.value)} style={{ ...controlStyle, resize: "vertical" }} />
          <span style={{ display: "flex", justifyContent: "space-between", gap: 12, color: "var(--text-muted)", fontSize: 13 }}>
            <span id="feedback-message-hint">{c.messageHint}</span><span id="feedback-message-count">{message.length}/4000</span>
          </span>
        </div>
        <button type="submit" disabled={isSending || message.trim().length < 10} style={{ minHeight: 44, padding: "10px 18px", border: 0, borderRadius: 8, background: "var(--accent)", color: "var(--accent-text)", fontWeight: 800, cursor: isSending || message.trim().length < 10 ? "not-allowed" : "pointer", opacity: isSending || message.trim().length < 10 ? 0.6 : 1 }}>
          {isSending ? c.sending : c.submit}
        </button>
        <div id="feedback-result" aria-live="polite" role={result === "error" ? "alert" : "status"} style={{ minHeight: 24, color: result === "error" ? "var(--state-error)" : "var(--text)" }}>
          {result === "sent" ? c.sent : result === "error" ? c.failed : ""}
        </div>
      </form>

      <section aria-labelledby="feedback-fallback" style={{ marginTop: 36, paddingTop: 28, borderTop: "1px solid var(--border)" }}>
        <h2 id="feedback-fallback" style={{ fontSize: 18 }}>{c.fallback}</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ minHeight: 44, display: "inline-flex", alignItems: "center", color: "var(--accent)", fontWeight: 700 }}>{c.emailCta}</a>
          <a href={`${REPO_URL}/issues`} target="_blank" rel="noopener noreferrer" style={{ minHeight: 44, display: "inline-flex", alignItems: "center", color: "var(--accent)", fontWeight: 700 }}>{c.issuesCta}</a>
        </div>
      </section>

      <section aria-labelledby="report-content" style={{ marginTop: 28 }}>
        <h2 id="report-content" style={{ fontSize: 18 }}>{c.reportTitle}</h2>
        <p style={{ lineHeight: 1.8 }}>{c.reportBody}</p>
        <Link href="/guidelines" style={{ minHeight: 44, display: "inline-flex", alignItems: "center", color: "var(--accent)", fontWeight: 700 }}>Community Guidelines</Link>
      </section>

      <Link href="/" style={{ marginTop: 40, minHeight: 44, display: "inline-flex", alignItems: "center", color: "var(--accent)", fontWeight: 700 }}>{c.back}</Link>
    </div>
  );
}
