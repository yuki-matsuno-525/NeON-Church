"use client";

import { useRouter } from "next/navigation";
import { saveTranslationPreference } from "@/lib/translationPreference";
import { useT } from "@/lib/i18n";

type Props = {
  /** 切り替え先の候補（いま使っている訳は除いてある） */
  options: { id: string; label: string }[];
};

/**
 * 本文が出せなかったときに「別の訳で読む」を出すボタン。
 *
 * 「その訳にはこの書が無い」ときの逃げ道。選ぶと覚えたうえで、
 * サーバーにその訳で組み立て直してもらう。
 */
export function TranslationSwitchActions({ options }: Props) {
  const router = useRouter();
  const t = useT();

  return (
    <>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            saveTranslationPreference(option.id);
            router.refresh();
          }}
        >
          {t.switchTranslation(option.label)}
        </button>
      ))}
    </>
  );
}
