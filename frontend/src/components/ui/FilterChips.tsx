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
    <div
      role="group"
      aria-label={ariaLabel}
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: "var(--space-5)",
      }}
    >
      {chips.map((chip) => {
        const isActive = chip.value === value;
        return (
          <button
            key={chip.value ?? "__all__"}
            type="button"
            onClick={() => onChange(chip.value)}
            aria-pressed={isActive}
            style={{
              fontSize: "var(--font-size-sm)",
              padding: "6px 14px",
              borderRadius: 999,
              border: "1px solid var(--border)",
              cursor: "pointer",
              fontFamily: "inherit",
              background: isActive ? "var(--accent)" : "transparent",
              color: isActive ? "var(--accent-text)" : "var(--text-muted)",
            }}
          >
            {chip.label} <span style={{ opacity: 0.7 }}>({chip.count})</span>
          </button>
        );
      })}
    </div>
  );
}
