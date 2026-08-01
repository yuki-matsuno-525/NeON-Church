import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LoginRequiredModal } from "./LoginRequiredModal";

vi.mock("next/navigation", () => ({
  usePathname: () => "/qa",
}));

/**
 * このモーダルは「ログインが要る操作」を押したときに7か所から出てくる。
 * ダイアログとして正しく振る舞わないと、キーボードだけの人は背後の画面へ迷い込み、
 * 閉じ方も分からなくなる。
 */
describe("LoginRequiredModal", () => {
  it("ダイアログとして読み上げられる", () => {
    render(<LoginRequiredModal onClose={vi.fn()} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    // 見出しと説明がダイアログの名前・説明として結び付いている
    expect(dialog).toHaveAccessibleName();
    expect(dialog).toHaveAccessibleDescription();
  });

  it("開いた時点で中の要素にフォーカスが移る", () => {
    render(<LoginRequiredModal onClose={vi.fn()} />);
    expect(screen.getByRole("dialog")).toContainElement(document.activeElement as HTMLElement);
  });

  it("Escape キーで閉じられる", () => {
    const onClose = vi.fn();
    render(<LoginRequiredModal onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("Tab が最後の要素から先頭へ折り返す（背後の画面へ出ない）", () => {
    render(<LoginRequiredModal onClose={vi.fn()} />);
    const dialog = screen.getByRole("dialog");
    const focusables = dialog.querySelectorAll<HTMLElement>("a[href], button");
    const last = focusables[focusables.length - 1];
    last.focus();

    fireEvent.keyDown(window, { key: "Tab" });

    expect(document.activeElement).toBe(focusables[0]);
  });
});
