"use client";

import { useQuerySearch } from "@/hooks/useQuerySearch";
import { ClearableSearchInput } from "@/components/ui/ClearableSearchInput";

type Props = {
  label: string;
  placeholder: string;
};

/**
 * 一覧の検索欄。打った内容は URL に書き出す。
 *
 * 入力欄が持つ値が正で、URL は書き出し先。逆にすると、反映待ちのあいだに
 * 打った文字が巻き戻り、日本語の変換中は文字が二重になる（useQuerySearch 参照）。
 */
export function TranslationSearch({ label, placeholder }: Props) {
  const { value, setValue } = useQuerySearch("/translations");

  return (
    <label className="block mb-4">
      <span className="sr-only">{label}</span>
      <ClearableSearchInput
        value={value}
        onChange={setValue}
        placeholder={placeholder}
        ariaLabel={label}
        inputClassName="form-control text-sm"
        wrapperClassName="w-full"
      />
    </label>
  );
}
