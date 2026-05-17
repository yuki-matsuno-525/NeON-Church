import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "./page";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: () => null }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockSetUser = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ setUser: mockSetUser }),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, login: vi.fn() };
});

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("フォームフィールドとボタンが表示される", () => {
    render(<LoginPage />);
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
    expect(document.querySelector('input[type="password"]')).toBeTruthy();
    expect(screen.getByRole("button", { name: "ログイン" })).toBeInTheDocument();
  });

  it("ログイン成功時にユーザーをセットして /matthew/1 にリダイレクト", async () => {
    const { login } = await import("@/lib/api");
    const mockUser = { id: "u1", username: "alice", email: "a@b.com", bio: "", avatar_url: null, created_at: "" };
    vi.mocked(login).mockResolvedValue(mockUser);

    render(<LoginPage />);
    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: "alice" } });
    fireEvent.change(document.querySelector('input[type="password"]')!, { target: { value: "pass1234" } });
    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => expect(mockSetUser).toHaveBeenCalledWith(mockUser));
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("ログイン失敗時にエラーメッセージを表示", async () => {
    const { login } = await import("@/lib/api");
    vi.mocked(login).mockRejectedValue({ message: "認証に失敗しました" });

    render(<LoginPage />);
    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: "alice" } });
    fireEvent.change(document.querySelector('input[type="password"]')!, { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => expect(screen.getByText("認証に失敗しました")).toBeInTheDocument());
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("送信中はボタンが「ログイン中...」になる", async () => {
    const { login } = await import("@/lib/api");
    vi.mocked(login).mockReturnValue(new Promise(() => {}));

    render(<LoginPage />);
    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: "alice" } });
    fireEvent.change(document.querySelector('input[type="password"]')!, { target: { value: "pass1234" } });
    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));

    expect(await screen.findByRole("button", { name: "ログイン中..." })).toBeDisabled();
  });

  it("新規登録リンクが /register を指す", () => {
    render(<LoginPage />);
    expect(screen.getByRole("link", { name: "新規登録" })).toHaveAttribute("href", "/register");
  });
});
