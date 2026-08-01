import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewArticlePage from "./page";

const push = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a>,
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => mockUseAuth() }));
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, createArticle: vi.fn() };
});

describe("記事の新規作成", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "alice" }, loading: false });
    const api = await import("@/lib/api");
    vi.mocked(api.createArticle).mockResolvedValue({
      id: "a1",
      title: "題",
      summary: "",
      visibility: "private",
      owner_username: "alice",
      tags: [],
      created_at: "2026-08-01T00:00:00Z",
      updated_at: "2026-08-01T00:00:00Z",
    });
  });

  it("IME変換中のEnterでは作成しない", async () => {
    const api = await import("@/lib/api");
    render(<NewArticlePage />);
    const title = screen.getByRole("textbox", { name: /題/ });

    fireEvent.change(title, { target: { value: "断食について" } });
    fireEvent.compositionStart(title);
    fireEvent.keyDown(title, { key: "Enter", code: "Enter", isComposing: true });

    expect(api.createArticle).not.toHaveBeenCalled();
  });

  it("作成後は下書きの編集画面へ移動する", async () => {
    const user = userEvent.setup();
    const api = await import("@/lib/api");
    render(<NewArticlePage />);

    await user.type(screen.getByRole("textbox", { name: /題/ }), "断食について");
    await user.click(screen.getByRole("button", { name: "書きはじめる" }));

    await waitFor(() => expect(api.createArticle).toHaveBeenCalledWith({ title: "断食について", visibility: "private" }));
    expect(push).toHaveBeenCalledWith("/articles/a1/edit");
  });
});
