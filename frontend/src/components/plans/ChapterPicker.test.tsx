import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChapterPicker } from "./ChapterPicker";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, fetchBookRead: vi.fn() };
});

const markChapters = {
  book: { id: "b1", name: "マルコによる福音書", translation: "口語訳", order: 2 },
  chapters: [
    { id: "c1", book: "b1", number: 1, opening: "神の子イエス・キリストの福音のはじめ。" },
    { id: "c2", book: "b1", number: 2, opening: "幾日かたって、イエスがまたカペナウムにこられたとき、" },
  ],
  translations: ["口語訳", "KJV"],
};

function renderPicker(overrides: Partial<React.ComponentProps<typeof ChapterPicker>> = {}) {
  return render(
    <ChapterPicker picked={[]} canAdd onPick={vi.fn()} {...overrides} />,
  );
}

describe("章を選ぶところ", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const api = await import("@/lib/api");
    vi.mocked(api.fetchBookRead).mockResolvedValue(markChapters);
  });

  it("ジャンルで書を絞れる", async () => {
    const user = userEvent.setup();
    renderPicker();

    expect(screen.getByText("創世記")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "福音書" }));

    expect(screen.getByText("マルコによる福音書")).toBeInTheDocument();
    expect(screen.queryByText("創世記")).not.toBeInTheDocument();
  });

  it("名前で書をさがせる", async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.type(screen.getByPlaceholderText("書をさがす"), "ピレモン");

    expect(screen.getByText("ピレモンへの手紙")).toBeInTheDocument();
    expect(screen.queryByText("創世記")).not.toBeInTheDocument();
  });

  it("書を選ぶと、章が書き出しつきで1行1章で並ぶ", async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.type(screen.getByPlaceholderText("書をさがす"), "マルコ");
    await user.click(screen.getByRole("button", { name: /マルコによる福音書/ }));

    expect(await screen.findByText("神の子イエス・キリストの福音のはじめ。")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "マルコ 1章を別のタブで読む" })).toHaveAttribute(
      "href",
      "/mark/1",
    );
  });

  it("＋を押すと、その章を渡す", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    renderPicker({ onPick });

    await user.type(screen.getByPlaceholderText("書をさがす"), "マルコ");
    await user.click(screen.getByRole("button", { name: /マルコによる福音書/ }));
    await user.click(await screen.findByRole("button", { name: "マルコ 2章を足す" }));

    expect(onPick).toHaveBeenCalledWith({
      book: "mark",
      book_name: "マルコによる福音書",
      chapter_number: 2,
      translation: "",
    });
  });

  it("すでに足した章は押せない", async () => {
    const user = userEvent.setup();
    renderPicker({ picked: [{ book: "mark", chapter_number: 1 }] });

    await user.type(screen.getByPlaceholderText("書をさがす"), "マルコ");
    await user.click(screen.getByRole("button", { name: /マルコによる福音書/ }));

    expect(await screen.findByRole("button", { name: "マルコ 1章は追加ずみ" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "マルコ 2章を足す" })).toBeEnabled();
    // 題と書き出しは読むためのもので、押せるものにはしない
    expect(screen.queryByRole("button", { name: "マルコ 1章" })).not.toBeInTheDocument();
  });

  it("上限に達していると足せない", async () => {
    const user = userEvent.setup();
    renderPicker({ canAdd: false });

    await user.type(screen.getByPlaceholderText("書をさがす"), "マルコ");
    await user.click(screen.getByRole("button", { name: /マルコによる福音書/ }));

    expect(await screen.findByRole("button", { name: "マルコ 1章を足す" })).toBeDisabled();
  });
});
