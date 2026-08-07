import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ClearableSearchInput } from "./ClearableSearchInput";

const setup = (value = "", onChange = vi.fn()) => {
  const view = render(
    <ClearableSearchInput
      value={value}
      onChange={onChange}
      placeholder="検索"
      ariaLabel="検索"
    />
  );
  return { ...view, onChange, input: screen.getByRole("searchbox", { name: "検索" }) };
};

describe("ClearableSearchInput", () => {
  it("変換を使わない入力はそのまま親へ渡す", () => {
    const { input, onChange } = setup();
    fireEvent.change(input, { target: { value: "Matthew" } });
    expect(onChange).toHaveBeenCalledWith("Matthew");
  });

  it("日本語変換中は親へ渡さず、確定したときだけ一度渡す", () => {
    const { input, onChange } = setup();

    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: "き" } });
    fireEvent.change(input, { target: { value: "きりすと" } });
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.compositionEnd(input, { target: { value: "キリスト" } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("キリスト");
  });

  it("変換の途中で親が古い値を渡し直しても、打った文字が残る", () => {
    const { input, rerender, onChange } = setup();

    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: "き" } });
    fireEvent.change(input, { target: { value: "きりす" } });

    // URL 反映の遅れなどで親が1テンポ前の値を渡してくる状況。
    // ここで input の中身が書き換わると、IME の未確定文字と合わさって二重入力になる。
    rerender(
      <ClearableSearchInput
        value="キ"
        onChange={onChange}
        placeholder="検索"
        ariaLabel="検索"
      />
    );

    expect(input).toHaveValue("きりす");
  });

  it("消すボタンで空になり、親へ空文字を渡す", () => {
    const { onChange } = setup("Luke");
    fireEvent.click(screen.getByRole("button", { name: "入力をクリア" }));
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("name と id を渡せる", () => {
    render(
      <ClearableSearchInput
        value=""
        onChange={vi.fn()}
        placeholder="検索"
        ariaLabel="検索"
        name="q"
        id="search-q"
      />
    );
    const input = screen.getByRole("searchbox", { name: "検索" });
    expect(input).toHaveAttribute("name", "q");
    expect(input).toHaveAttribute("id", "search-q");
  });
});
