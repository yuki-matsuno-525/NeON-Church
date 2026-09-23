import { redirect } from "next/navigation";
import { COMMENTARY_INDEX_HREF } from "@/lib/commentary";

/**
 * 解釈書の入口は「読む」の解釈書タブに移した。前の URL（/commentary）から来た人をそこへ送る。
 * 本のページ（/commentary/<本>）と章のページ（/commentary/<本>/<章>）はそのまま。
 */
export default function CommentaryIndexPage() {
  redirect(COMMENTARY_INDEX_HREF);
}
