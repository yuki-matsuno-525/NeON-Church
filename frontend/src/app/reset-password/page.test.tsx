import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ResetPasswordPage from "./page";

let query = new URLSearchParams("uid=user-id&token=reset-token");
vi.mock("next/navigation", () => ({
  useSearchParams: () => query,
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, confirmPasswordReset: vi.fn() };
});

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    query = new URLSearchParams("uid=user-id&token=reset-token");
  });

  it("uidとtokenを送信して完了状態を表示する", async () => {
    const api = await import("@/lib/api");
    vi.mocked(api.confirmPasswordReset).mockResolvedValue({ detail: "ok" });
    render(<ResetPasswordPage />);

    fireEvent.change(screen.getByLabelText("新しいパスワード"), { target: { value: "NewPass123!" } });
    fireEvent.change(screen.getByLabelText("新しいパスワード（確認）"), { target: { value: "NewPass123!" } });
    fireEvent.click(screen.getByRole("button", { name: "パスワードを更新" }));

    await waitFor(() => expect(api.confirmPasswordReset).toHaveBeenCalledWith({ uid: "user-id", token: "reset-token", new_password: "NewPass123!" }));
    expect(await screen.findByRole("status")).toHaveTextContent("パスワードを更新しました");
  });

  it("パラメータがないリンクを無効として案内する", () => {
    query = new URLSearchParams();
    render(<ResetPasswordPage />);

    expect(screen.getByRole("alert")).toHaveTextContent("リンクは無効");
    expect(screen.getByRole("link", { name: "再設定リンクを再発行" })).toHaveAttribute("href", "/forgot-password");
  });
});
