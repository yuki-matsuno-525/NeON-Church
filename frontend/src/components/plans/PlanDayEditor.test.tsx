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
    fetchBooks: vi.fn().mockResolvedValue([]),
    fetchChapters: vi.fn().mockResolvedValue([]),
  };
});

const day: PlanDay = {
  id: "d1",
  number: 1,
  title: "光をわけた日",
  devotional: "はじめに。",
  readings: [
    {
      id: "r1",
      book: "matthew",
      book_name: "マタイによる福音書",
      chapter_number: 1,
      translation: "",
      order: 0,
    },
  ],
  completed: false,
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

    await user.type(screen.getByPlaceholderText("この日の題（任意）"), "！");

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
    expect(screen.getByPlaceholderText("この日の題（任意）")).toBeInTheDocument();
  });

  it("章を足すと書をさがす画面が出る", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole("button", { name: "＋ 章を足す" }));

    expect(screen.getByPlaceholderText("書をさがす")).toBeInTheDocument();
  });
});
