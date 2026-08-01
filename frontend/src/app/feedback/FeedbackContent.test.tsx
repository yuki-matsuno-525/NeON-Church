import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FeedbackContent } from "./FeedbackContent";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
}));
vi.mock("@/contexts/LanguageContext", () => ({ useLang: () => ({ lang: "ja" }) }));
vi.mock("@/lib/apiClient", () => ({ sendFeedback: vi.fn() }));

describe("FeedbackContent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("未ログインでもフォームから送信し、成功を通知する", async () => {
    const user = userEvent.setup();
    const api = await import("@/lib/apiClient");
    vi.mocked(api.sendFeedback).mockResolvedValue({ detail: "Feedback received." });
    render(<FeedbackContent />);

    await user.selectOptions(screen.getByRole("combobox", { name: "種類" }), "bug");
    await user.type(screen.getByRole("textbox", { name: "内容" }), "章移動ボタンが反応しません。");
    await user.click(screen.getByRole("button", { name: "送信する" }));

    await waitFor(() => expect(api.sendFeedback).toHaveBeenCalledWith({
      category: "bug",
      email: undefined,
      page_url: undefined,
      message: "章移動ボタンが反応しません。",
      website: "",
    }));
    expect(screen.getByRole("status")).toHaveTextContent("送信しました");
  });

  it("送信失敗をalertとして表示し再試行できる", async () => {
    const user = userEvent.setup();
    const api = await import("@/lib/apiClient");
    vi.mocked(api.sendFeedback)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ detail: "Feedback received." });
    render(<FeedbackContent />);

    await user.type(screen.getByRole("textbox", { name: "内容" }), "再現手順を含む不具合の報告です。");
    await user.click(screen.getByRole("button", { name: "送信する" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("送信できませんでした");

    await user.click(screen.getByRole("button", { name: "送信する" }));
    expect(await screen.findByRole("status")).toHaveTextContent("送信しました");
    expect(api.sendFeedback).toHaveBeenCalledTimes(2);
  });
});
