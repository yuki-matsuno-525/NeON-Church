"use client";

/**
 * 種類で絞り込むチップ列。
 *
 * お気に入り（節・章・書・コメント・翻訳）や通知（返信・高評価・メンション）のように、
 * 1本の一覧に複数の種類が混ざる画面で使う。見た目は /read のカテゴリチップに揃えてある。
 *
 * value が null のときは「すべて」を選んだ状態。
 */

export type FilterChip<T extends string> = {
  /** null は「すべて」 */
  value: T | null;
  label: string;
  count: number;
};

export function FilterChips<T extends string>({
  chips,
  value,
  onChange,
  ariaLabel,
}: {
  chips: FilterChip<T>[];
  value: T | null;
  onChange: (value: T | null) => void;
  ariaLabel: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="mb-6 flex flex-wrap gap-2">
      {chips.map((chip) => {
        const isActive = chip.value === value;
        return (
          <button
            key={chip.value ?? "__all__"}
            type="button"
            onClick={() => onChange(chip.value)}
            aria-pressed={isActive}
            className={[
              "tap-target cursor-pointer rounded-full border border-border px-3 py-2 text-sm",
              isActive ? "bg-accent text-accent-text" : "bg-transparent text-muted",
            ].join(" ")}
          >
            {chip.label} <span className="opacity-70">({chip.count})</span>
          </button>
        );
      })}
    </div>
  );
}
