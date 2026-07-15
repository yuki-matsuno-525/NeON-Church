"use client";

import Link from "next/link";
import { useLang } from "@/contexts/LanguageContext";

type Section = { heading: string; body: string };
type Content = {
  title: string;
  intro: string;
  sections: Section[];
  sourceCodeLabel: string;
  sourceCodeBody: string;
  back: string;
};

const content: Record<string, Content> = {
  ja: {
    title: "ライセンス",
    intro:
      "NeON Church で扱う本文・ユーザー投稿・ソースコード・素材の取り扱い方針を明記します。各文献のライセンスは順次精査しており、追加・修正が必要な場合はフィードバックページからお知らせください。",
    sections: [
      {
        heading: "1. 収録している本文",
        body: "収録している本文は、底本・翻訳ともすべてパブリックドメインです。本サービス内で閲覧・引用できます。文書ごとの訳者・出典は各書のページに表示しています。今後さらに文書を追加する際も、ライセンスを個別に確認し、パブリックドメインまたは利用許諾の明確な版に限定して収録します。",
      },
      {
        heading: "2. ユーザーによる共同翻訳",
        body: "ユーザーが本サービスの共同翻訳機能で作成した翻訳の著作権は、プロジェクトオーナーおよび参加者に帰属します。公開設定にした翻訳は、本サービス内および検索エンジンから閲覧可能となり、本サービスは表示・配信・保存のために必要な範囲で利用します。既定は All Rights Reserved 相当です。今後、CC BY / CC BY-SA など明示的なオープンライセンスを選択可能にする方針です。",
      },
      {
        heading: "3. ユーザー投稿（コメント・Q&A）",
        body: "コメント・Q&A の著作権は投稿者に帰属します。本サービスはこれらを表示・引用・配信するために必要な範囲で利用します。",
      },
      {
        heading: "4. 素材（フォント・画像など）",
        body: "本サービスでは見出しに Noto Serif JP（SIL Open Font License 1.1）を使用しています。背景画像その他の素材は順次クレジットを整備しています。",
      },
    ],
    sourceCodeLabel: "5. ソースコード",
    sourceCodeBody:
      "本サービスのソースコードは GitHub で公開しています。ライセンス条件はリポジトリの LICENSE ファイルを参照してください。",
    back: "← トップへ戻る",
  },
  en: {
    title: "Licenses",
    intro:
      "This page describes how scripture texts, user-submitted content, source code, and assets are handled in NeON Church. We review text licenses on an ongoing basis. Please contact us via Feedback if anything needs correction.",
    sections: [
      {
        heading: "1. Texts in the Collection",
        body: "Every text in the collection is public domain, both the source text and the translation, and can be read and quoted within the Service. The translator and source for each text are shown on that book's page. As we add further texts, we will verify the license of each one and only include editions that are clearly public domain or licensed for this use.",
      },
      {
        heading: "2. Collaborative Translations by Users",
        body: "Translations produced by users via the collaborative translation feature are owned by the project owner and contributors. Published translations become visible within the Service and may be indexed by search engines; the Service uses them as needed for display, distribution, and storage. The default is All Rights Reserved. Selecting explicit open licenses such as CC BY or CC BY-SA is planned.",
      },
      {
        heading: "3. User-Submitted Content (Comments and Q&A)",
        body: "Comments and Q&A are owned by their authors. The Service uses them as needed for display, quotation, and distribution.",
      },
      {
        heading: "4. Assets (Fonts and Images)",
        body: "We use Noto Serif JP for headings (SIL Open Font License 1.1). Credits for background images and other assets are being added.",
      },
    ],
    sourceCodeLabel: "5. Source Code",
    sourceCodeBody:
      "The source code of the Service is published on GitHub. See the LICENSE file in the repository for license terms.",
    back: "← Back to home",
  },
};

export function LicensesContent() {
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
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--accent)", marginBottom: 10 }}>
          {c.sourceCodeLabel}
        </h2>
        <p style={{ fontSize: 14, lineHeight: 1.8, color: "var(--text)", margin: 0 }}>
          {c.sourceCodeBody}{" "}
          <a
            href="https://github.com/yuki-matsuno-525/NeON-Church"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--accent)" }}
          >
            GitHub
          </a>
        </p>
      </div>
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
