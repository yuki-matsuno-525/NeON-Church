import Link from "next/link";
import { getRequestLanguage } from "@/lib/i18nServer";
import { ContentPageMeta } from "@/components/ContentPageMeta";
import { SOURCED_TRANSLATIONS, translationLabel, translationSource } from "@/lib/translations";

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
        body: "収録している本文は、底本・翻訳ともパブリックドメイン、または再配布が許されたライセンスの版です。訳ごとの底本・権利の状態・入手元を下に示します。読書画面でも本文の下に出典を表示しています。今後さらに文書を追加する際も、ライセンスを個別に確認し、パブリックドメインまたは利用許諾の明確な版に限定して収録します。",
      },
      {
        heading: "2. ユーザーによる共同翻訳",
        body: "ユーザーが本サービスの共同翻訳機能で作成した翻訳の著作権は、プロジェクトオーナーおよび参加者に帰属します。公開設定にした翻訳は、本サービス内および検索エンジンから閲覧可能となり、本サービスは表示・配信・保存のために必要な範囲で利用します。公開した翻訳は、クリエイティブ・コモンズ 表示 4.0 国際（CC BY 4.0）で提供されます。訳者名を表示すれば、誰でも自由に再利用できます。",
      },
      {
        heading: "3. ユーザー投稿（コメント・Q&A）",
        body: "コメント・Q&A の著作権は投稿者に帰属します。本サービスはこれらを表示・引用・配信するために必要な範囲で利用します。",
      },
      {
        heading: "4. 素材（フォント・画像など）",
        body: "本サービスでは見出しに Noto Serif JP（SIL Open Font License 1.1）を使用しています。ロゴ・背景画像・アイコンなどの画像は、本サービスのために制作したオリジナルです。",
      },
    ],
    sourceCodeLabel: "5. ソースコード",
    sourceCodeBody:
      "本サービスのソースコードは MIT License で GitHub に公開しています。収録している本文データは、上の各出典のライセンスに従います。",
    back: "← トップへ戻る",
  },
  en: {
    title: "Licenses",
    intro:
      "This page describes how scripture texts, user-submitted content, source code, and assets are handled in NeON Church. We review text licenses on an ongoing basis. Please contact us via Feedback if anything needs correction.",
    sections: [
      {
        heading: "1. Texts in the Collection",
        body: "Every text in the collection, both source text and translation, is public domain or published under a license that allows redistribution. The edition, license, and origin of each translation are listed below, and the reading view shows the source under the text. As we add further texts, we will verify the license of each one and only include editions that are clearly public domain or licensed for this use.",
      },
      {
        heading: "2. Collaborative Translations by Users",
        body: "Translations produced by users via the collaborative translation feature are owned by the project owner and contributors. Published translations become visible within the Service and may be indexed by search engines; the Service uses them as needed for display, distribution, and storage. Published translations are licensed under Creative Commons Attribution 4.0 International (CC BY 4.0): anyone may reuse them as long as the translators are credited.",
      },
      {
        heading: "3. User-Submitted Content (Comments and Q&A)",
        body: "Comments and Q&A are owned by their authors. The Service uses them as needed for display, quotation, and distribution.",
      },
      {
        heading: "4. Assets (Fonts and Images)",
        body: "We use Noto Serif JP for headings (SIL Open Font License 1.1). The logo, background images, and icons are original works created for the Service.",
      },
    ],
    sourceCodeLabel: "5. Source Code",
    sourceCodeBody:
      "The source code of the Service is published on GitHub under the MIT License. The scripture data follows the license of each source listed above.",
    back: "← Back to home",
  },
};

// 訳ごとの出典。中身は lib/translations.ts の TRANSLATION_SOURCES（読書画面の出典の1行と同じ元）。
function TextSources({ lang }: { lang: string }) {
  const pick = (text: { ja: string; en: string }) => (lang === "en" ? text.en : text.ja);
  return (
    <dl className="mt-4 mb-0">
      {SOURCED_TRANSLATIONS.map((id) => {
        const source = translationSource(id);
        if (!source) return null;
        return (
          <div key={id} className="mb-4">
            <dt className="text-md font-bold text-body">{translationLabel(id, lang)}</dt>
            <dd className="m-0 text-sm leading-reading text-muted">
              {pick(source.work)}
              <br />
              {pick(source.license)}
              <br />
              {lang === "en" ? "Source: " : "入手元："}
              <a href={source.origin.url} target="_blank" rel="noopener noreferrer" className="text-accent">
                {source.origin.name}
              </a>
              {source.note && (
                <>
                  <br />
                  {pick(source.note)}
                </>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

// 文字を並べるだけの画面なので、サーバー側で描いてブラウザに JavaScript を送らない。
export async function LicensesContent() {
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
        sections={[...c.sections.map((section) => section.heading), c.sourceCodeLabel]}
        relatedLinks={[
          { href: "/terms", label: lang === "ja" ? "利用規約" : "Terms" },
          { href: "/about", label: lang === "ja" ? "NeON Churchについて" : "About" },
          { href: "/feedback", label: lang === "ja" ? "修正を連絡" : "Report a correction" },
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
          {index === 0 && <TextSources lang={lang} />}
        </section>
      ))}
      <section id={`section-${c.sections.length + 1}`} className="mb-8">
        <h2 className="mb-3 text-accent">
          {c.sourceCodeLabel}
        </h2>
        <p className="m-0 text-md leading-reading text-body">
          {c.sourceCodeBody}{" "}
          <a
            href="https://github.com/yuki-matsuno-525/NeON-Church"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={lang === "ja" ? "GitHubリポジトリを新しいタブで開く" : "Open the GitHub repository in a new tab"}
            className="text-accent"
          >
            GitHub ↗
          </a>
        </p>
      </section>
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
