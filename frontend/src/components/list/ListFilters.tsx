"use client";

import { useState, type ReactNode } from "react";
import { useQuerySearch } from "@/hooks/useQuerySearch";
import { ClearableSearchInput } from "@/components/ui/ClearableSearchInput";
import { Icon } from "@/components/ui/Icon";

type Props = {
  /** 打った言葉を書き出す先のパス（例 "/articles"） */
  basePath: string;
  /** 検索欄の説明。読み上げと placeholder に使う */
  searchLabel: string;
  searchPlaceholder?: string;
  /** 絞り込みボタンの読み上げ名 */
  toggleLabel: string;
  /**
   * 検索以外の絞り込み（プルダウンなど）。
   * 渡さなければ絞り込みボタン自体を出さない。
   */
  children?: ReactNode;
  /** 中身のどれかが効いているか。閉じていても分かるよう、ボタンに印を出す */
  active?: boolean;
  /**
   * 絞り込み後の件数（「12件」のように組み立て済みの文字列）。
   * 関数ではなく文字列で受ける。サーバー側で組み立てる画面から関数は渡せないため。
   */
  totalText?: string;
};

/**
 * 一覧の絞り込み。記事・プラン・翻訳・Q&A が同じものを使う。
 *
 * いちばん使う検索欄だけいつも出し、書や言語などのプルダウンは
 * 漏斗のボタンを押したときだけ開く。読む画面のコメント欄と同じやり方。
 * 常に全部出しておくと、使わない人にも 2 段ぶん場所を取り続けるため。
 *
 * 打った言葉は useQuerySearch が URL へ書き出す。入力欄が持つ値が正で、
 * URL は書き出し先（逆にすると日本語の変換中に文字が二重になる）。
 * 他のクエリ（?tab= など）は消えない。
 */
export function ListFilters({
  basePath,
  searchLabel,
  searchPlaceholder,
  toggleLabel,
  children,
  active = false,
  totalText,
}: Props) {
  const { value, setValue } = useQuerySearch(basePath);
  const [open, setOpen] = useState(false);
  const panelId = `${basePath.replace(/\W/g, "")}-filters`;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        <ClearableSearchInput
          value={value}
          onChange={setValue}
          placeholder={searchPlaceholder ?? searchLabel}
          ariaLabel={searchLabel}
          inputClassName="form-control text-sm"
          wrapperClassName="field-grow"
        />
        {children && (
          <button
            type="button"
            onClick={() => setOpen((wasOpen) => !wasOpen)}
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={toggleLabel}
            title={toggleLabel}
            className={`filter-toggle${open ? " filter-toggle-on" : ""}`}
          >
            <Icon name="filter" size={15} />
            {active && <span aria-hidden="true" className="filter-dot" />}
          </button>
        )}
        {totalText && (
          <span className="whitespace-nowrap text-xs text-faint">{totalText}</span>
        )}
      </div>

      {children && open && (
        <div id={panelId} className="mt-2 flex flex-wrap items-center gap-2">
          {children}
        </div>
      )}
    </div>
  );
}
