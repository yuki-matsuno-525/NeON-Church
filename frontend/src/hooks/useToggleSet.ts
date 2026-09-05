"use client";

import { useCallback, useState } from "react";

/**
 * 「開いているものの集まり」を持つ。折りたたみの一覧で使う。
 *
 * 何かを開いても他は閉じない（いくつでも同時に開ける）。
 * 一覧の中の 1 つを開け閉めするたびに、他の項目まで作り直さずに済むよう
 * 集合そのものを持ち替える形にしてある。
 *
 *   const days = useToggleSet(() => [todayId]);
 *   <button aria-expanded={days.has(day.id)} onClick={() => days.toggle(day.id)}>
 */
export function useToggleSet(initial?: () => Iterable<string>) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(initial?.() ?? []));

  const toggle = useCallback((id: string) => {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const add = useCallback((id: string) => {
    setOpen((current) => (current.has(id) ? current : new Set(current).add(id)));
  }, []);

  /** 全部開く。渡した並びのものだけを開いた状態にする。 */
  const openAll = useCallback((ids: Iterable<string>) => setOpen(new Set(ids)), []);
  const closeAll = useCallback(() => setOpen(new Set()), []);

  return {
    has: (id: string) => open.has(id),
    count: open.size,
    toggle,
    add,
    openAll,
    closeAll,
  };
}
