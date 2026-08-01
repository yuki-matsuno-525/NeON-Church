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
    fireEvent.click(screen.getByTestId("verse-item"));
    expect(onSelectVerse).toHaveBeenCalledWith("v1");
  });

  it("ふだんはチェックボックスを出さない", () => {
    render(<VerseList {...defaultProps} />);
    expect(screen.queryByTestId("verse-checkbox")).not.toBeInTheDocument();
  });

  it("集めるモードでは節ごとにチェックボックスを出し、選んだ節に印を付ける", () => {
    const verses = [makeVerse(), makeVerse({ id: "v2", number: 2, text: "2つめの節" })];
    render(<VerseList {...defaultProps} verses={verses} collecting collectedVerseIds={["v2"]} />);

    expect(screen.getAllByTestId("verse-checkbox")).toHaveLength(2);
    const items = screen.getAllByRole("checkbox");
    expect(items[0]).toHaveAttribute("aria-checked", "false");
    expect(items[1]).toHaveAttribute("aria-checked", "true");
  });
});
