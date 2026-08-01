import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewPlanPage from "./page";

const push = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => mockUseAuth() }));
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, createPlan: vi.fn() };
});

describe("読書プランの新規作成", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "alice" }, loading: false });
    const api = await import("@/lib/api");
    vi.mocked(api.createPlan).mockResolvedValue({
      id: "p1",
      title: "福音書を読む",
      description: "",
      visibility: "private",
      owner_username: "alice",
      day_count: 0,
      reader_count: 0,
      created_at: "2026-08-01T00:00:00Z",
      updated_at: "2026-08-01T00:00:00Z",
    });
  });

  it("認証確認中は入力フォームを表示しない", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });

    render(<NewPlanPage />);

    expect(screen.getByTestId("skeleton-list")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "題" })).not.toBeInTheDocument();
  });

  it("未ログイン時は作成元へ戻れるログイン導線を示す", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });

    render(<NewPlanPage />);

    expect(screen.getByRole("link", { name: "ログインする" })).toHaveAttribute(
      "href",
      "/login?from=%2Fplans%2Fnew",
    );
  });

  it("題を送信して作成したプランの編集画面へ移動する", async () => {
    const user = userEvent.setup();
    const api = await import("@/lib/api");
    render(<NewPlanPage />);

    await user.type(screen.getByRole("textbox", { name: "題" }), "  福音書を読む  ");
    await user.click(screen.getByRole("button", { name: "作りはじめる" }));

    await waitFor(() => expect(api.createPlan).toHaveBeenCalledWith({ title: "福音書を読む", visibility: "private" }));
    expect(push).toHaveBeenCalledWith("/plans/p1/edit");
  });

  it("IME変換中のEnterでは作成しない", async () => {
    const api = await import("@/lib/api");
    render(<NewPlanPage />);
    const title = screen.getByRole("textbox", { name: "題" });

    fireEvent.change(title, { target: { value: "福音書を読む" } });
    fireEvent.compositionStart(title);
    fireEvent.keyDown(title, { key: "Enter", code: "Enter", isComposing: true });

    expect(api.createPlan).not.toHaveBeenCalled();
  });

  it("入力後にやめる場合は破棄を確認する", async () => {
    const user = userEvent.setup();
    render(<NewPlanPage />);

    await user.type(screen.getByRole("textbox", { name: "題" }), "福音書を読む");
    await user.click(screen.getByRole("button", { name: "やめる" }));

    expect(screen.getByRole("alertdialog", { name: "作りかけのプランを破棄しますか？" })).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("作成失敗を入力欄に関連付けたエラーとして示す", async () => {
    const user = userEvent.setup();
    const api = await import("@/lib/api");
    vi.mocked(api.createPlan).mockRejectedValue(new Error("Network Error"));
    render(<NewPlanPage />);

    const title = screen.getByRole("textbox", { name: "題" });
    await user.type(title, "福音書を読む");
    await user.click(screen.getByRole("button", { name: "作りはじめる" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("プランを作れませんでした");
    expect(title).toHaveAttribute("aria-invalid", "true");
    expect(title).toHaveAttribute("aria-describedby", "new-plan-error");
  });
});
