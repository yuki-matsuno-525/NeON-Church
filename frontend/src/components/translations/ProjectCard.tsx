// この部品は受け取ったものを描くだけで、押した・入力したといった出来事を
// 扱わない。そのためサーバー側で組み立てる画面からもそのまま使える
// （"use client" を付けると、使う側がサーバーでもブラウザ側に回ってしまう）。
import Link from "next/link";
import type { TranslationProject } from "@/lib/api";
import { languageLabel } from "@/lib/languages";

type Props = {
  project: TranslationProject;
  /** 右上のバッジに出す状態の名前（「公開済み」など） */
  statusLabel: string;
  createdByLabel: string;
  progressLabel: string;
};

/** 翻訳プロジェクト 1 件のカード。カード全体が詳細ページへのリンク。 */
export function ProjectCard({ project, statusLabel, createdByLabel, progressLabel }: Props) {
  const progressPct = project.unit_count > 0
    ? Math.round((project.done_count / project.unit_count) * 100)
    : 0;
  const progressText = project.unit_count > 0
    ? `${project.done_count}/${project.unit_count} (${progressPct}%)`
    : `${project.done_count}/${project.unit_count}`;

  return (
    <Link href={`/translations/${project.id}`} className="no-underline text-inherit">
      <div className="card-glow card-glow-interactive py-4 px-4 flex flex-col">
        <div className="flex items-start justify-end gap-3 mb-3">
          <span className="badge badge-icon badge-tone">{statusLabel}</span>
        </div>

        <h3 className="card-title">{project.name}</h3>

        {project.description && <p className="card-summary">{project.description}</p>}

        <div className="flex gap-2 text-xs text-faint flex-wrap mb-3">
          <span className="meta-pill">{project.source_book_name}</span>
          <span className="meta-pill">{languageLabel(project.target_language)}</span>
          <span className="meta-pill">{createdByLabel} {project.owner_username}</span>
        </div>

        <div className="mt-auto">
          <div className="flex justify-between gap-3 text-xs text-muted mb-1">
            <span>{progressLabel}</span>
            <span>{progressText}</span>
          </div>
          <div
            role="progressbar"
            aria-label={`${project.name} ${progressLabel}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPct}
            className="progress-track mt-0"
          >
            <div className="progress-fill progress-fill-tone" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>
    </Link>
  );
}
