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

/**
 * 解釈書の書・章をお気に入りに入れる星。聖書の書・章のページの星と同じ見た目・動き。
 * ログインしていないときは出さない（聖書のページと同じ）。
 */
export function CommentaryBookmarkStar({ place, size = 18 }: { place: CommentaryPlace; size?: number }) {
  const t = useT();
  const toast = useToast();
  const { user } = useAuth();
  const [bookmark, setBookmark] = useState<Bookmark | null>(null);
  const [busy, setBusy] = useState(false);
  const { work, chapter } = place;

  useEffect(() => {
    if (!user) return;
    let alive = true;
    fetchCommentaryBookmarks(work, chapter)
      .then((items) => {
        if (!alive) return;
        // 章のページでは、その章の区切りのお気に入りも一緒に返るので、章そのものだけを選ぶ。
        setBookmark(
          items.find((bm) => bm.commentary_reference?.chapter === (chapter ?? null) && bm.commentary_reference?.number === null) ??
            null,
        );
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user, work, chapter]);

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
