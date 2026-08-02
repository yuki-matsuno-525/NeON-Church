import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoginRequiredModal } from "./LoginRequiredModal";

vi.mock("next/navigation", () => ({
  usePathname: () => "/matthew/1",
}));

vi.mock("@/contexts/LanguageContext", () => ({
  useLang: () => ({ lang: "ja", setLang: vi.fn() }),
}));

describe("LoginRequiredModal", () => {
  it("ダイアログの名前と説明を関連付け、閉じる操作へ初期フォーカスする", () => {
    render(<LoginRequiredModal onClose={vi.fn()} from="/matthew/1" />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName();
    expect(dialog).toHaveAccessibleDescription();
    expect(screen.getByRole("button", { name: "閉じる" })).toHaveFocus();
    expect(screen.getByRole("link", { name: "ログインする" })).toHaveAttribute(
      "href",
      "/login?from=%2Fmatthew%2F1",
    );
  });

  it("from未指定時は現在のqueryとhashもログイン後の戻り先に含める", () => {
    window.history.replaceState(null, "", "/matthew/1?verse=3#comments");
    render(<LoginRequiredModal onClose={vi.fn()} />);

    expect(screen.getByRole("link", { name: "ログインする" })).toHaveAttribute(
      "href",
      "/login?from=%2Fmatthew%2F1%3Fverse%3D3%23comments",
    );
  });

  it("Escapeで閉じる", () => {
    const onClose = vi.fn();
    render(<LoginRequiredModal onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("Tabが最後の要素から先頭へ折り返す", () => {
    render(<LoginRequiredModal onClose={vi.fn()} />);
    const dialog = screen.getByRole("dialog");
    const focusables = dialog.querySelectorAll<HTMLElement>("a[href], button");
    const last = focusables[focusables.length - 1];
    last.focus();

    fireEvent.keyDown(window, { key: "Tab" });

    expect(document.activeElement).toBe(focusables[0]);
  });
});
