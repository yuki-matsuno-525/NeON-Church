import type { CompiledBook, CompiledVisibility } from "./types";

/** 断章ボックスの呼び名。個別名が付いていればそれを、無ければ一般名を返す。 */
export function trayLabel(book: Pick<CompiledBook, "tray_name">): string {
  return book.tray_name?.trim() || "断章ボックス";
}

export function visibilityLabel(visibility: CompiledVisibility): string {
  if (visibility === "public") return "公開";
  if (visibility === "unlisted") return "限定公開";
  return "非公開";
}

export function visibilityDescription(visibility: CompiledVisibility): string {
  if (visibility === "public") return "編纂書の一覧に並び、誰でも読めます。";
  if (visibility === "unlisted") return "一覧には並びませんが、URLを知っている人は読めます。";
  return "自分だけが読めます。";
}
