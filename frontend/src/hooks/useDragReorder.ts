"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * 縦に並んだ行を、つまんで動かして並べ替える。
 *
 * パソコンのファイルを動かすときと同じ手ざわりにしてある。つまんだ行は少し浮き上がって
 * 指について来て、残りの行がすっと寄って場所を空ける。指を離すとそこに収まる。
 *
 * 部品は入れていないので自前で書いている。使い方:
 *
 *   const drag = useDragReorder({ count: rows.length, onReorder: move });
 *   {rows.map((row, i) => (
 *     <div key={row.id} {...drag.rowProps(i)}>
 *       <button {...drag.handleProps(i)}>つまむ</button>
 *     </div>
 *   ))}
 *
 * 行そのものをつまませたいときは、行に handleProps を付ける（中の押せるものは除く）。
 *
 * 触る画面では、指を置いたところから画面が動いてしまわないよう handleProps が
 * touch-action: none を当てる。iOS は JS ではスクロールを止められないため。
 *
 * キーボードでも動かせる。取っ手に焦点を当てて上下の矢印キー。動かしたあとも
 * 同じ取っ手に焦点が残るので、続けて押していける。
 */
export function useDragReorder({
  count,
  onReorder,
  enabled = true,
}: {
  count: number;
  /** from 番目を to 番目へ動かす。呼ぶ側が並びを持ち替える。 */
  onReorder: (from: number, to: number) => void;
  enabled?: boolean;
}) {
  const rowsRef = useRef<(HTMLElement | null)[]>([]);
  const handlesRef = useRef<(HTMLElement | null)[]>([]);
  // つまんでいる最中の状態。描画に要るぶんだけ持つ。
  const [drag, setDrag] = useState<{ from: number; to: number; dy: number; shift: number } | null>(null);
  // 矢印キーで動かしたあと、焦点を移った先の取っ手へ戻すための覚え書き。
  const refocusRef = useRef<number | null>(null);

  const stop = useCallback(() => setDrag(null), []);

  const start = useCallback(
    (index: number, event: React.PointerEvent) => {
      if (!enabled || count < 2) return;
      // マウスは左ボタンだけ。指とペンはそのまま受ける。
      if (event.pointerType === "mouse" && event.button !== 0) return;
      const rects = rowsRef.current.slice(0, count).map((el) => {
        const box = el?.getBoundingClientRect();
        return { top: box?.top ?? 0, height: box?.height ?? 0 };
      });
      // 行と行のすき間。1 行しか無ければ 0。
      const gap = rects.length > 1 ? Math.max(0, rects[1].top - (rects[0].top + rects[0].height)) : 0;
      const shift = rects[index].height + gap;
      const startY = event.clientY;
      event.preventDefault();
      setDrag({ from: index, to: index, dy: 0, shift });
      // 行き先はこの閉じ込みの中で持つ。setDrag の中で数えて確定すると、
      // React が「開発中は更新の関数を 2 回呼ぶ」ため並べ替えが二重にかかる。
      let target = index;

      const move = (moveEvent: PointerEvent) => {
        const dy = moveEvent.clientY - startY;
        // つまんでいる行の中心が、どの行の真ん中を越えたかで行き先を決める。
        const center = rects[index].top + rects[index].height / 2 + dy;
        let to = index;
        for (let i = 0; i < index; i += 1) {
          if (center < rects[i].top + rects[i].height / 2) {
            to = i;
            break;
          }
        }
        if (to === index) {
          for (let i = count - 1; i > index; i -= 1) {
            if (center > rects[i].top + rects[i].height / 2) {
              to = i;
              break;
            }
          }
        }
        target = to;
        setDrag({ from: index, to, dy, shift });
      };

      const finish = (commit: boolean) => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", cancel);
        window.removeEventListener("keydown", onKeyDown);
        setDrag(null);
        if (commit && target !== index) {
          onReorder(index, target);
          refocusRef.current = target;
        }
      };
      const up = () => finish(true);
      const cancel = () => finish(false);
      // Esc でやめられる。押し間違えたまま離すしかない、という行き止まりを作らないため。
      const onKeyDown = (keyEvent: KeyboardEvent) => {
        if (keyEvent.key === "Escape") finish(false);
      };

      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", cancel);
      window.addEventListener("keydown", onKeyDown);
    },
    [count, enabled, onReorder],
  );

  const onHandleKeyDown = useCallback(
    (index: number, event: React.KeyboardEvent) => {
      if (!enabled) return;
      const direction = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
      if (direction === 0) return;
      const to = index + direction;
      if (to < 0 || to >= count) return;
      event.preventDefault();
      onReorder(index, to);
      refocusRef.current = to;
    },
    [count, enabled, onReorder],
  );

  // 並べ替えたあと、動かした行の取っ手に焦点を戻す。戻さないと、
  // キーボードだけで操作している人は 1 回動かすたびに居場所を見失う。
  useLayoutEffect(() => {
    const index = refocusRef.current;
    if (index === null) return;
    refocusRef.current = null;
    handlesRef.current[index]?.focus();
  });

  // 並びの数が減ったときに、消えた行の参照を残さない。
  useEffect(() => {
    rowsRef.current.length = count;
    handlesRef.current.length = count;
  }, [count]);

  /** その行が今どれだけずれて見えるか。 */
  const offsetOf = (index: number): number => {
    if (!drag) return 0;
    const { from, to, shift } = drag;
    if (index === from) return drag.dy;
    if (from < to && index > from && index <= to) return -shift;
    if (to < from && index >= to && index < from) return shift;
    return 0;
  };

  return {
    /** つまんでいる行の番号。まだなら null。 */
    draggingIndex: drag?.from ?? null,

    /**
     * その行が、いま指を離したら何番目に収まるか。
     * 行に番号を出しているとき、運んでいる間も番号が入れ替わって見えるようにする。
     * 番号だけ元の位置に残っていると、どこに落ちるのか分からないため。
     */
    previewIndex: (index: number): number => {
      if (!drag) return index;
      const { from, to } = drag;
      if (index === from) return to;
      if (from < to && index > from && index <= to) return index - 1;
      if (to < from && index >= to && index < from) return index + 1;
      return index;
    },

    rowProps: (index: number) => {
      const lifted = drag?.from === index;
      return {
        ref: (el: HTMLElement | null) => {
          rowsRef.current[index] = el;
        },
        style: {
          transform: `translateY(${offsetOf(index)}px)${lifted ? " scale(1.02)" : ""}`,
          // つまんでいる行だけは指にぴったり付いてほしいので、動きをなめらかにしない。
          transition: lifted ? "none" : "transform var(--duration-base) var(--ease-out)",
          zIndex: lifted ? 3 : undefined,
          position: "relative" as const,
        },
        "data-dragging": lifted ? "" : undefined,
      };
    },

    handleProps: (index: number) => ({
      ref: (el: HTMLElement | null) => {
        handlesRef.current[index] = el;
      },
      onPointerDown: (event: React.PointerEvent) => start(index, event),
      onKeyDown: (event: React.KeyboardEvent) => onHandleKeyDown(index, event),
      style: { touchAction: "none" as const },
    }),

    /** つまんでいる途中でやめさせたいとき（外から閉じるときなど）。 */
    stop,
  };
}
