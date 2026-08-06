"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { ClearableSearchInput } from "@/components/ui/ClearableSearchInput";

type Props = {
  /** URL に入っている検索語 */
  q: string;
  label: string;
  placeholder: string;
  /** 検索語が変わったら 1 ページ目に戻す（列ごとのページ番号を消す） */
  pageParams: string[];
};

/**
 * 一覧の検索欄。打った内容は URL に書く。
 *
 * 打っている間だけ手元に持ち、手が止まってから URL に移す。1 文字ごとに
 * URL を変えると、そのたびにサーバーが一覧を組み立て直してしまう。
 */
export function TranslationSearch({ q, label, placeholder, pageParams }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [text, setText] = useState(q);
  const [lastQ, setLastQ] = useState(q);
  if (q !== lastQ) {
    // 戻る・進むで URL 側が変わったときは、入力欄を合わせる。
    setLastQ(q);
    setText(q);
  }
  const debounced = useDebouncedValue(text);
  // 配列のままだと毎回別物と見なされて、下の処理が何度も走ってしまう。
  const pageParamKey = pageParams.join(",");

  useEffect(() => {
    if (debounced === q) return;
    const params = new URLSearchParams(searchParams.toString());
    if (debounced) params.set("q", debounced);
    else params.delete("q");
    // 絞り込みが変われば件数も変わる。開いていたページ番号は捨てる。
    for (const name of pageParamKey.split(",").filter(Boolean)) params.delete(name);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [debounced, q, searchParams, pathname, pageParamKey, router]);

  return (
    <label className="block mb-4">
      <span className="sr-only">{label}</span>
      <ClearableSearchInput
        value={text}
        onChange={setText}
        placeholder={placeholder}
        ariaLabel={label}
        inputClassName="form-control text-sm"
        wrapperClassName="w-full"
      />
    </label>
  );
}
