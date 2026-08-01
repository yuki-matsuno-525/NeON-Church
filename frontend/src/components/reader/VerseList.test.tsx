import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VerseList } from "./VerseList";
import type { Verse } from "@/lib/api";

vi.mock("next/navigation", () => ({
  usePathname: () => "/matthew/1",
}));

const makeVerse = (overrides: Partial<Verse> = {}): Verse => ({
  id: "v1",
  chapter: "c1",
  number: 1,
  text: "テスト節テキスト",
  ...overrides,
});

const defaultProps = {
  verses: [makeVerse()],
  selectedVerseId: null as string | null,
  onSelectVerse: vi.fn(),
};

describe("VerseList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("節テキストと節番号を表示する", () => {
    render(<VerseList {...defaultProps} />);
    expect(screen.getByText("テスト節テキスト")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /テスト節テキスト/ })).toHaveAttribute("aria-pressed", "false");
  });

  it("節をクリックすると onSelectVerse が呼ばれる", () => {
    const onSelectVerse = vi.fn();
    render(<VerseList {...defaultProps} onSelectVerse={onSelectVerse} />);
    fireEvent.click(screen.getByTestId("verse-item"));
    expect(onSelectVerse).toHaveBeenCalledWith("v1");
  });

  it("選択された節のクリックで同じ id の onSelectVerse が呼ばれる", () => {
    const onSelectVerse = vi.fn();
    render(<VerseList {...defaultProps} selectedVerseId="v1" onSelectVerse={onSelectVerse} />);
    expect(screen.getByRole("button", { name: /テスト節テキスト/ })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByTestId("verse-item"));
    expect(onSelectVerse).toHaveBeenCalledWith("v1");
  });

  // 節を選ぶのはこのアプリの中心の操作（ここからコメント・栞・引用へ進む）。
  // 以前はただの div に onClick を付けていたため、キーボードだけの人は使えなかった。
  it("キーボードで節までたどり着ける", () => {
    render(<VerseList {...defaultProps} />);
    expect(screen.getByRole("button", { name: /テスト節テキスト/ })).toHaveAttribute("tabindex", "0");
  });

  it.each(["Enter", " "])("%s キーで節を選べる", (key) => {
    const onSelectVerse = vi.fn();
    render(<VerseList {...defaultProps} onSelectVerse={onSelectVerse} />);
    fireEvent.keyDown(screen.getByTestId("verse-item"), { key });
    expect(onSelectVerse).toHaveBeenCalledWith("v1");
  });

  it("選択中の節は選択状態として伝わる", () => {
    render(<VerseList {...defaultProps} selectedVerseId="v1" />);
    expect(screen.getByTestId("verse-item")).toHaveAttribute("aria-pressed", "true");
  });
});
