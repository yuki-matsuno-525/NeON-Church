"use client";

import Link from "next/link";
import { useLang } from "@/contexts/LanguageContext";

type Section = { heading: string; body: string };
type Content = {
  title: string;
  intro: string;
  sections: Section[];
  back: string;
};

const content: Record<string, Content> = {
  ja: {
    title: "プライバシーポリシー",
    intro:
      "NeON Church（以下「本サービス」）における個人情報の取り扱いについて定めます。本サービスはベータ版運用中で、本ポリシーは予告なく変更される場合があります。",
    sections: [
      {
        heading: "1. 収集する情報",
        body: "ユーザー名、メールアドレス、パスワード（ハッシュ化）、自己紹介、アバター画像、投稿したコメント・Q&A・翻訳、お気に入り、読書進捗、通知設定、IP アドレスおよび User Agent（不正利用対策のため）を収集します。",
      },
      {
        heading: "2. 利用目的",
        body: "サービスの提供、ユーザー認証、コミュニティ運営、不正利用やスパムの検知・対応、サービス改善のための分析、重要な告知の通知を目的として利用します。",
      },
      {
        heading: "3. 第三者への提供",
        body: "本サービスは収集した個人情報を、本人の同意なく第三者へ提供することはありません。ただし、法令に基づく開示要請があった場合、または生命・身体・財産の保護のために必要な場合は除きます。",
      },
      {
        heading: "4. Cookie とセッション",
        body: "認証状態の維持・CSRF 対策のために Cookie を使用します。これらは本サービスの動作に必要であり、無効化するとログインなどの機能が利用できなくなります。",
      },
      {
        heading: "5. 公開範囲",
        body: "ユーザー名・自己紹介・アバター・投稿コメント・Q&A・公開翻訳プロジェクトは、本サービス内および検索エンジンから閲覧可能です。お気に入りは既定で非公開です。プロフィール設定から公開範囲を変更できます。",
      },
      {
        heading: "6. データの削除と訂正",
        body: "アカウント設定からアカウントを削除すると、紐づく個人情報は速やかに削除されます。すでに公開された投稿の削除は別途リクエストが必要となる場合があります。",
      },
      {
        heading: "7. お問い合わせ",
        body: "プライバシーに関するご質問・ご要望はフィードバックページからご連絡ください。",
      },
    ],
    back: "← トップへ戻る",
  },
  en: {
    title: "Privacy Policy",
    intro:
      "This policy describes how NeON Church (the \"Service\") handles personal information. The Service is in beta and this policy may change without prior notice.",
    sections: [
      {
        heading: "1. Information We Collect",
        body: "We collect your username, email, hashed password, bio, posted comments / Q&A / translations, bookmarks, reading progress, notification preferences, IP address and User Agent (for abuse prevention).",
      },
      {
        heading: "2. How We Use Information",
        body: "To operate the Service, authenticate users, run the community, detect and respond to abuse and spam, analyze usage for improvement, and send important announcements.",
      },
      {
        heading: "3. Sharing With Third Parties",
        body: "We do not share your personal information with third parties without your consent, except where required by law or where necessary to protect life, body, or property.",
      },
      {
        heading: "4. Cookies and Sessions",
        body: "We use cookies to maintain authentication state and provide CSRF protection. These are required to operate the Service; disabling them will break features such as login.",
      },
      {
        heading: "5. Visibility",
        body: "Your username, bio, public comments, Q&A, and published translation projects are visible inside the Service and may be indexed by search engines. Bookmarks are private by default. You can change visibility from your profile settings.",
      },
      {
        heading: "6. Deletion and Correction",
        body: "Deleting your account from settings will promptly remove associated personal information. Removing content that has already been published may require a separate request.",
      },
      {
        heading: "7. Contact",
        body: "For privacy questions or requests, please reach out via the Feedback page.",
      },
    ],
    back: "← Back to home",
  },
};

export function PrivacyContent() {
  const { lang } = useLang();
  const c = content[lang] ?? content.en;
  return (
    <div style={{ maxWidth: "min(72ch, 100%)", margin: "0 auto", padding: "48px 24px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16, fontFamily: '"Noto Serif JP", serif' }}>{c.title}</h1>
      <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.8, marginBottom: 32 }}>
        {c.intro}
      </p>
      {c.sections.map((s) => (
        <div key={s.heading} style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--accent)", marginBottom: 10 }}>
            {s.heading}
          </h2>
          <p style={{ fontSize: 14, lineHeight: 1.8, color: "var(--text)", margin: 0 }}>{s.body}</p>
        </div>
      ))}
      <div style={{ marginTop: 40 }}>
        <Link
          href="/"
          style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 700, fontSize: 14 }}
        >
          {c.back}
        </Link>
      </div>
    </div>
  );
}
