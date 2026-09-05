// この部品は受け取ったものを描くだけで、押した・入力したといった出来事を
// 扱わない。そのためサーバー側で組み立てる画面からもそのまま使える
// （"use client" を付けると、使う側がサーバーでもブラウザ側に回ってしまう）。
import Link from "next/link";
import type { TranslationProject } from "@/lib/api";
import type { Translations } from "@/lib/i18n";
import { languageLabel } from "@/lib/languages";

type Props = {
  project: TranslationProject;
  t: Translations;
};

/**
 * 翻訳プロジェクト 1 件のカード。
 *
 * 状態（公開・進行中・下書き）の札は持たない。一覧はタブで状態ごとに分かれていて、
 * 1 枚ずつに同じ言葉を繰り返しても何も伝わらないため。
 *
 * 題のリンクが影でカード全体を覆うので、どこを押しても詳細へ飛ぶ。
 * 以前はカードを丸ごと <Link> で包んでいたため、中の主催者をリンクにできなかった
 * （リンクの入れ子は HTML として無効で押せない）。
 */
export function ProjectCard({ project, t }: Props) {
  const progressPct = project.unit_count > 0
    ? Math.round((project.done_count / project.unit_count) * 100)
    : 0;
  const progressText = project.unit_count > 0
    ? `${project.done_count}/${project.unit_count} (${progressPct}%)`
    : `${project.done_count}/${project.unit_count}`;

  return (
    <article className="card-glow card-glow-interactive card-link py-4 px-4 flex flex-col">
      <h3 className="card-title">
        <Link href={`/translations/${project.id}`} className="card-link-main text-inherit no-underline">
          {project.name}
        </Link>
      </h3>

      {project.description && <p className="card-summary">{project.description}</p>}

      {/* 以前は書名・言語・作成者を同じ灰色の箱で横に並べていたが、値だけでは
          どれが何なのか読み取れなかった（「英語」が原文の言語か訳す先か分からない）。
          説明を左に置いて縦に揃える。

          書と版を分けているのは、DB の書が「書 × 版」で 1 件だから。書名だけだと
          エノク書なら英訳、創世記なら口語訳とも KJV とも取れてしまう。 */}
      <dl className="meta-rows mb-3">
        <dt>{t.cardBook}</dt>
        <dd>{project.source_book_name}</dd>
        <dt>{t.cardSourceVersion}</dt>
        <dd>{project.source_book_translation}</dd>
        <dt>{t.cardTargetLanguage}</dt>
        <dd>{languageLabel(project.target_language)}</dd>
        <dt>{t.cardOrganizer}</dt>
        <dd>
          <Link href={`/profile/${project.owner_username}`}>{project.owner_username}</Link>
        </dd>
      </dl>

      <div className="mt-auto">
        {/* 上の明細と同じ濃さにする。説明は text-soft、値は本文の色。
            text-muted のままだと、ここだけ紫みが強くて沈んで見えた。 */}
        <div className="flex justify-between gap-3 text-sm mb-1">
          <span className="text-soft">{t.progress}</span>
          <span className="text-body">{progressText}</span>
        </div>
        <div
          role="progressbar"
          aria-label={`${project.name} ${t.progress}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPct}
          className="progress-track mt-0"
        >
          <div className="progress-fill progress-fill-tone" style={{ width: `${progressPct}%` }} />
        </div>
      </div>
    </article>
  );
}
