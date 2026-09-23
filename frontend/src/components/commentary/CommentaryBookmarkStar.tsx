"use client";

import { useEffect, useState } from "react";
import {
  createCommentaryBookmark,
  fetchCommentaryBookmarks,
  removeBookmark,
  type Bookmark,
  type CommentaryPlace,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { BookmarkStar } from "@/components/ui/BookmarkStar";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/lib/i18n";

type Props = {
  place: CommentaryPlace;
  size?: number;
  /**
   * 呼ぶ側がこの場所のお気に入りをもう取ってあるなら渡す（章のページ。区切りのお気に入りと一緒に取る）。
   * 渡されたら自分では取りに行かない。null はまだ取り終わっていない。
   */
  bookmarks?: Bookmark[] | null;
  /** bookmarks を渡したときは、入れた・外した結果をこれで返す */
  onChange?: (bookmark: Bookmark | null) => void;
};

/** お気に入りの一覧から、この場所（書・章そのもの）のものを選ぶ。章のページでは区切りのものも混ざるので除く。 */
function findOwn(items: Bookmark[], chapter: number | undefined): Bookmark | null {
  return (
    items.find((bm) => bm.commentary_reference?.chapter === (chapter ?? null) && bm.commentary_reference?.number === null) ??
    null
  );
}

/**
 * 解釈書の書・章をお気に入りに入れる星。聖書の書・章のページの星と同じ見た目・動き。
 * ログインしていないときは出さない（聖書のページと同じ）。
 */
export function CommentaryBookmarkStar({ place, size = 18, bookmarks, onChange }: Props) {
  const t = useT();
  const toast = useToast();
  const { user } = useAuth();
  const [fetched, setFetched] = useState<Bookmark | null>(null);
  const [busy, setBusy] = useState(false);
  const { work, chapter } = place;
  const controlled = bookmarks !== undefined;
  const bookmark = controlled ? findOwn(bookmarks ?? [], chapter) : fetched;
  const setBookmark = (value: Bookmark | null) => (controlled ? onChange?.(value) : setFetched(value));

  useEffect(() => {
    if (!user || controlled) return;
    let alive = true;
    fetchCommentaryBookmarks(work, chapter)
      .then((items) => {
        if (alive) setFetched(findOwn(items, chapter));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user, controlled, work, chapter]);

  if (!user) return null;

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (bookmark) {
        await removeBookmark(bookmark.id);
        setBookmark(null);
      } else {
        setBookmark(await createCommentaryBookmark({ work, chapter }));
      }
    } catch {
      toast.show(t.errorActionFailed, { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return <BookmarkStar active={!!bookmark} busy={busy} onToggle={toggle} size={size} />;
}
