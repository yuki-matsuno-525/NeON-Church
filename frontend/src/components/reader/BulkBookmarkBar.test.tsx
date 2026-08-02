import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { BulkBookmarkBar, useBulkBookmark } from "./BulkBookmarkBar";
import { VerseList } from "./VerseList";
import type { Verse } from "@/lib/types";
import { useT } from "@/lib/i18n";

const verses: Verse[] = [
  { id: "v1", chapter: "c1", number: 1, text: "はじめに" },
  { id: "v2", chapter: "c1", number: 2, text: "つぎに" },
  { id: "v3", chapter: "c1", number: 3, text: "そして" },
];

/** 章ページの「まとめてお気に入り」まわりだけを取り出した確認用の画面。 */
function Harness({ save }: { save: (ids: string[]) => Promise<number> }) {
  const t = useT();
  const bulk = useBulkBookmark(save, t);
  const [selectedVerseId, setSelectedVerseId] = useState<string | null>(null);

  return (
    <div>
      <button type="button" onClick={bulk.start}>
        まとめてお気に入り
      </button>
      <div data-testid="opened">{selectedVerseId ?? "なし"}</div>
      <VerseList
        verses={verses}
        selectedVerseId={selectedVerseId}
        onSelectVerse={setSelectedVerseId}
        pickMode={bulk.pickMode}
        pickedIds={bulk.pickedIds}
        onTogglePick={bulk.toggle}
      />
      {bulk.pickMode && (
        <BulkBookmarkBar
          pickedCount={bulk.pickedIds.length}
          busy={bulk.busy}
          message={bulk.message}
          onSave={bulk.submit}
          onCancel={bulk.cancel}
        />
      )}
    </div>
  );
}

describe("まとめてお気に入り", () => {
  it("選んだ節をまとめてお気に入りに入れられる", async () => {
    const user = userEvent.setup();
    const save = vi.fn().mockResolvedValue(2);
    render(<Harness save={save} />);

    await user.click(screen.getByRole("button", { name: "まとめてお気に入り" }));
    await user.click(screen.getByText("はじめに"));
    await user.click(screen.getByText("そして"));

    expect(screen.getByText("2節を選んでいます")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "お気に入りに追加" }));

    expect(save).toHaveBeenCalledWith(["v1", "v3"]);
    // 全部入ったらモードは終わる
    await waitFor(() => {
      expect(screen.queryByTestId("bulk-bookmark-bar")).not.toBeInTheDocument();
    });
  });

  it("まとめてお気に入りのあいだは節を押してもコメント欄が開かない", async () => {
    const user = userEvent.setup();
    render(<Harness save={vi.fn().mockResolvedValue(1)} />);

    await user.click(screen.getByRole("button", { name: "まとめてお気に入り" }));
    await user.click(screen.getByText("はじめに"));

    expect(screen.getByTestId("opened")).toHaveTextContent("なし");
  });

  it("もう一度押すと選び外しになる", async () => {
    const user = userEvent.setup();
    render(<Harness save={vi.fn().mockResolvedValue(0)} />);

    await user.click(screen.getByRole("button", { name: "まとめてお気に入り" }));
    await user.click(screen.getByText("はじめに"));
    await user.click(screen.getByText("はじめに"));

    expect(screen.getByText("追加したい節を押してください")).toBeInTheDocument();
  });

  it("すでにお気に入りのある節が混ざっていたら、入った件数を伝える", async () => {
    const user = userEvent.setup();
    render(<Harness save={vi.fn().mockResolvedValue(1)} />);

    await user.click(screen.getByRole("button", { name: "まとめてお気に入り" }));
    await user.click(screen.getByText("はじめに"));
    await user.click(screen.getByText("つぎに"));
    await user.click(screen.getByRole("button", { name: "お気に入りに追加" }));

    expect(await screen.findByText("1件を追加しました（残りはお気に入りずみ）")).toBeInTheDocument();
  });

  it("やめるとモードが終わる", async () => {
    const user = userEvent.setup();
    render(<Harness save={vi.fn().mockResolvedValue(0)} />);

    await user.click(screen.getByRole("button", { name: "まとめてお気に入り" }));
    await user.click(screen.getByRole("button", { name: "やめる" }));

    expect(screen.queryByTestId("bulk-bookmark-bar")).not.toBeInTheDocument();
  });
});
