import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ForgotPasswordPage from "./page";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, requestPasswordReset: vi.fn() };
});

describe("ForgotPasswordPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("存在有無を明かさない完了メッセージを表示する", async () => {
    const api = await import("@/lib/api");
    vi.mocked(api.requestPasswordReset).mockResolvedValue({ detail: "ok" });
    render(<ForgotPasswordPage />);

    fireEvent.change(screen.getByLabelText("メールアドレス"), { target: { value: "person@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "再設定リンクを送信" }));

    await waitFor(() => expect(api.requestPasswordReset).toHaveBeenCalledWith("person@example.com"));
    expect(await screen.findByRole("status")).toHaveTextContent("アカウントが存在する場合");
  });
});
