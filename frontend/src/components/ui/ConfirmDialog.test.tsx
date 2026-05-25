import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmDialog } from "./ConfirmDialog";

vi.mock("@/contexts/LanguageContext", () => ({
  useLang: () => ({ lang: "ja", setLang: vi.fn() }),
}));

describe("ConfirmDialog", () => {
  it("open=false なら描画されない", () => {
    render(
      <ConfirmDialog
        open={false}
        title="t"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("open=true で alertdialog として描画され、title / description が読まれる", () => {
    render(
      <ConfirmDialog
        open
        title="削除しますか？"
        description="この操作は取り消せません"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    const dlg = screen.getByRole("alertdialog");
    expect(dlg).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("削除しますか？")).toBeInTheDocument();
    expect(screen.getByText("この操作は取り消せません")).toBeInTheDocument();
  });

  it("確認ボタンクリックで onConfirm、キャンセルで onCancel", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="t"
        confirmText="OK"
        cancelText="Cancel"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(onConfirm).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("Escape キーで onCancel が呼ばれる", () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="t"
        onConfirm={() => {}}
        onCancel={onCancel}
      />
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onCancel).toHaveBeenCalled();
  });
});
