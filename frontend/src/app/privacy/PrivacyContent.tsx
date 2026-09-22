import Link from "next/link";
import { getRequestLanguage } from "@/lib/i18nServer";
import { ContentPageMeta } from "@/components/ContentPageMeta";

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
        body: "ユーザー名、メールアドレス、パスワード（ハッシュ化して保存）、自己紹介、投稿したコメント・Q&A・記事・翻訳、お気に入り、読書進捗、通知設定を保存します。Google / GitHub でログインした場合は、各サービスから受け取る識別子・メールアドレス・表示名を保存します。また、アクセスの際の IP アドレスおよび User Agent を、不正利用対策（投稿回数の制限など）とサーバーの記録のために一時的に扱います。",
      },
      {
        heading: "2. 利用目的",
        body: "サービスの提供、ユーザー認証、コミュニティ運営、不正利用やスパムの検知・対応、サービス改善のための分析、重要な告知の通知を目的として利用します。",
      },
      {
        heading: "3. 第三者への提供",
        body: "本サービスは収集した個人情報を、本人の同意なく第三者へ提供することはありません。ただし、法令に基づく開示要請があった場合、または生命・身体・財産の保護のために必要な場合は除きます。なお、サービスの運営のため、次項の外部サービスにデータの保管・処理を任せています。",
      },
      {
        heading: "4. 外部サービスの利用",
        body: "本サービスは次の外部サービスを利用しており、これらの事業者のサーバー（日本国外を含む）に情報が保存・処理されます。サーバーとデータベース：Render（米国）、画面の配信：Vercel（米国）、エラーの記録：Sentry（米国。個人を特定する情報は送らない設定）、ログイン：Google / GitHub（利用した場合のみ）、メール送信：パスワード再設定や通知のメール配信事業者。各事業者は、それぞれのプライバシーポリシーに従って情報を取り扱います。",
      },
      {
        heading: "5. Cookie とセッション",
        body: "認証状態の維持・CSRF 対策のために Cookie を使用します。これらは本サービスの動作に必要であり、無効化するとログインなどの機能が利用できなくなります。",
      },
      {
        heading: "6. 公開範囲",
        body: "ユーザー名・自己紹介・投稿したコメント・Q&A・記事・公開した翻訳は、本サービス内および検索エンジンから閲覧可能です。お気に入りは既定で非公開です。プロフィール設定から公開範囲を変更できます。",
      },
      {
        heading: "7. データの削除と訂正",
        body: "アカウント設定からアカウントを削除すると、紐づく個人情報は速やかに削除されます。すでに公開された投稿の削除は別途リクエストが必要となる場合があります。",
      },
      {
        heading: "8. お問い合わせ",
        body: "プライバシーに関するご質問・ご要望、保存している情報の開示・訂正・削除のご請求は、フィードバックページからご連絡ください。",
      },
      {
        heading: "9. 運営者",
        body: "本サービスは y-matsuno525（個人）が運営しています。運営者の氏名・住所は、請求があれば遅滞なく開示します。",
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
        body: "We store your username, email, hashed password, bio, posted comments / Q&A / articles / translations, favorites, reading progress, and notification preferences. If you sign in with Google or GitHub, we store the identifier, email, and display name received from that service. Your IP address and User Agent are processed temporarily for abuse prevention (such as rate limits) and server logs.",
      },
      {
        heading: "2. How We Use Information",
        body: "To operate the Service, authenticate users, run the community, detect and respond to abuse and spam, analyze usage for improvement, and send important announcements.",
      },
      {
        heading: "3. Sharing With Third Parties",
        body: "We do not share your personal information with third parties without your consent, except where required by law or where necessary to protect life, body, or property. To operate the Service, we entrust storage and processing of data to the external services listed in the next section.",
      },
      {
        heading: "4. External Services",
        body: "The Service relies on the following external services, and information is stored and processed on their servers, including outside Japan: servers and database: Render (US); web delivery: Vercel (US); error tracking: Sentry (US, configured not to send personally identifying information); sign-in: Google / GitHub (only if you use them); email: the provider that delivers password reset and notification emails. Each provider handles information under its own privacy policy.",
      },
      {
        heading: "5. Cookies and Sessions",
        body: "We use cookies to maintain authentication state and provide CSRF protection. These are required to operate the Service; disabling them will break features such as login.",
      },
      {
        heading: "6. Visibility",
        body: "Your username, bio, public comments, Q&A, and published translation projects are visible inside the Service and may be indexed by search engines. Favorites are private by default. You can change visibility from your profile settings.",
      },
      {
        heading: "7. Deletion and Correction",
        body: "Deleting your account from settings will promptly remove associated personal information. Removing content that has already been published may require a separate request.",
      },
      {
        heading: "8. Contact",
        body: "For privacy questions, or requests to disclose, correct, or delete the information we hold, please reach out via the Feedback page.",
      },
      {
        heading: "9. Operator",
        body: "The Service is operated by y-matsuno525 (an individual). The operator's name and address will be disclosed without delay upon request.",
      },
    ],
    back: "← Back to home",
  },
};

// 文字を並べるだけの画面なので、サーバー側で描いてブラウザに JavaScript を送らない。
export async function PrivacyContent() {
  const lang = await getRequestLanguage();
  const c = content[lang] ?? content.en;
  return (
    <div className="content-page">
      <h1 className="mb-4">{c.title}</h1>
      <p className="mb-8 text-sm leading-reading text-muted">
        {c.intro}
      </p>
      <ContentPageMeta
        updatedAt="2026-09-22"
        sections={c.sections.map((section) => section.heading)}
        relatedLinks={[
          { href: "/settings", label: lang === "ja" ? "アカウント設定" : "Account settings" },
          { href: "/terms", label: lang === "ja" ? "利用規約" : "Terms" },
          { href: "/feedback", label: lang === "ja" ? "お問い合わせ" : "Contact" },
        ]}
        labels={lang === "ja"
          ? { updated: "更新日", contents: "目次", related: "関連ページ" }
          : { updated: "Last updated", contents: "Contents", related: "Related pages" }}
      />
      {c.sections.map((s, index) => (
        <section id={`section-${index + 1}`} key={s.heading} className="mb-8">
          <h2 className="mb-3 text-accent">
            {s.heading}
          </h2>
          <p className="m-0 text-md leading-reading text-body">{s.body}</p>
        </section>
      ))}
      <p className="mt-8 text-sm">
        <Link href="/feedback" className="font-bold text-accent">
          {lang === "ja" ? "プライバシーに関するお問い合わせ" : "Privacy questions and requests"}
        </Link>
      </p>
      <div className="mt-8">
        <Link
          href="/"
          className="text-sm font-bold text-accent no-underline"
        >
          {c.back}
        </Link>
      </div>
    </div>
  );
}
