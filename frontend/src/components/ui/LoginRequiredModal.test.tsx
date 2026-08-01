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
  it("ダイアログとして関連付け、閉じる操作へ初期フォーカスする", () => {
    render(<LoginRequiredModal onClose={vi.fn()} from="/matthew/1" />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("button", { name: "閉じる" })).toHaveFocus();
    expect(screen.getByRole("link", { name: "ログインする" })).toHaveAttribute(
      "href",
      "/login?from=%2Fmatthew%2F1",
    );
  });

  it("Escapeで閉じる", () => {
    const onClose = vi.fn();
    render(<LoginRequiredModal onClose={onClose} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
