import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlanDayEditor } from "./PlanDayEditor";
import type { PlanDay } from "@/lib/types";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    updatePlanDay: vi.fn(),
    fetchBookRead: vi.fn().mockResolvedValue({ book: null, chapters: [], translations: [] }),
  };
});

const reading = (id: string, book: string, book_name: string, chapter_number: number, order: number) => ({
  id,
  book,
  book_name,
  chapter_number,
  translation: "",
  order,
  completed: false,
});

const day: PlanDay = {
  id: "d1",
  number: 1,
  title: "光をわけた日",
  devotional: "はじめに。",
  readings: [reading("r1", "matthew", "マタイによる福音書", 1, 0)],
  completed: false,
};

const threeChapterDay: PlanDay = {
  ...day,
  readings: [
    reading("r1", "matthew", "マタイによる福音書", 1, 0),
    reading("r2", "philemon", "ピレモンへの手紙", 1, 1),
    reading("r3", "romans", "ローマ人への手紙", 8, 2),
  ],
};

function renderEditor(overrides: Partial<React.ComponentProps<typeof PlanDayEditor>> = {}) {
  return render(
    <PlanDayEditor
      planId="p1"
      day={day}
      canDelete
      canMoveUp
      canMoveDown
      onDelete={vi.fn()}
      onMove={vi.fn()}
      open
      onToggle={vi.fn()}
      {...overrides}
    />,
  );
}

describe("プランの1日の編集", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("読む章が出て、外せる", async () => {
    const user = userEvent.setup();
    const api = await import("@/lib/api");
    vi.mocked(api.updatePlanDay).mockResolvedValue({ ...day, readings: [] });
    renderEditor();

    expect(screen.getByText("マタイによる福音書 1章")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "マタイによる福音書 1章を外す" }));

    expect(screen.queryByText("マタイによる福音書 1章")).not.toBeInTheDocument();
  });

  it("書き換えるとしばらくして自動で保存される", async () => {
    const user = userEvent.setup();
    const api = await import("@/lib/api");
    vi.mocked(api.updatePlanDay).mockResolvedValue(day);
    renderEditor();

    await user.type(screen.getByPlaceholderText("タイトルを入力してください"), "！");

    await waitFor(
      () => {
        expect(api.updatePlanDay).toHaveBeenCalledWith(
          "p1",
          "d1",
          expect.objectContaining({ title: "光をわけた日！" }),
        );
      },
      { timeout: 4000 },
    );
  });

  it("並べ替えられないときは上下と削除のボタンを出さない", () => {
    renderEditor({ canDelete: false, canMoveUp: false, canMoveDown: false });

    expect(screen.queryByRole("button", { name: "第1日を上へ移動" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "第1日を削除" })).not.toBeInTheDocument();
    // 中身は直せるので、入力欄は出したまま
    expect(screen.getByPlaceholderText("タイトルを入力してください")).toBeInTheDocument();
  });

  it("4つの区画がそろっていて、章を足すところは最初から開いている", () => {
    renderEditor();

    expect(screen.getByText("この日の題（任意）")).toBeInTheDocument();
    expect(screen.getByText("選択した章")).toBeInTheDocument();
    expect(screen.getByText("章を追加")).toBeInTheDocument();
    expect(screen.getByText("この日に添える文章（任意）")).toBeInTheDocument();
    // 「＋ 章を足す」を押さなくても、書を探すところが出ている
    expect(screen.getByPlaceholderText("書をさがす")).toBeInTheDocument();
  });

  it("たたんでいるときは中身を出さず、読む章だけ見出しに出す", () => {
    renderEditor({ day: threeChapterDay, open: false });

    // 見出しのボタン（開け閉めするもの）。↑↓削除も「第1日…」の名前を持つので
    // 開いているかどうかで選ぶ。
    expect(screen.getByRole("button", { expanded: false })).toHaveTextContent(
      "第1日光をわけた日マタイによる福音書 1章・ピレモンへの手紙 1章・ローマ人への手紙 8章",
    );
    expect(screen.queryByPlaceholderText("タイトルを入力してください")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("書をさがす")).not.toBeInTheDocument();
  });

  it("章が1つだけなら並び替えの案内を出さない", () => {
    renderEditor();

    expect(screen.queryByText("ドラッグして順番変更")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "並び替えモード" })).not.toBeInTheDocument();
  });

  it("取っ手に焦点を当てて矢印キーを押すと、章の順番が入れ替わる", async () => {
    const user = userEvent.setup();
    const api = await import("@/lib/api");
    vi.mocked(api.updatePlanDay).mockResolvedValue(threeChapterDay);
    renderEditor({ day: threeChapterDay });

    const handle = screen.getByRole("button", {
      name: "ローマ人への手紙 8章を並び替える。上下の矢印キーでも動かせます",
    });
    handle.focus();
    await user.keyboard("{ArrowUp}");

    // 3番目だったローマ8章が2番目になる（行の左の丸の番号でも確かめられる）
    const order = screen
      .getAllByRole("button", { name: /を外す$/ })
      .map((button) => button.getAttribute("aria-label"));
    expect(order).toEqual([
      "マタイによる福音書 1章を外す",
      "ローマ人への手紙 8章を外す",
      "ピレモンへの手紙 1章を外す",
    ]);
  });

  it("並び替えた順番がそのまま保存される", async () => {
    const user = userEvent.setup();
    const api = await import("@/lib/api");
    vi.mocked(api.updatePlanDay).mockResolvedValue(threeChapterDay);
    renderEditor({ day: threeChapterDay });

    screen.getByRole("button", {
      name: "ローマ人への手紙 8章を並び替える。上下の矢印キーでも動かせます",
    }).focus();
    await user.keyboard("{ArrowUp}");

    await waitFor(
      () => {
        expect(api.updatePlanDay).toHaveBeenCalledWith(
          "p1",
          "d1",
          expect.objectContaining({
            readings: [
              { book: "matthew", chapter_number: 1, translation: "" },
              { book: "romans", chapter_number: 8, translation: "" },
              { book: "philemon", chapter_number: 1, translation: "" },
            ],
          }),
        );
      },
      { timeout: 4000 },
    );
  });
});
