import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "./page";

const mockPush = vi.fn();
const mockReplace = vi.fn();
let mockFrom: string | null = null;
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSearchParams: () => ({ get: (key: string) => key === "from" ? mockFrom : null }),
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
    mockFrom = null;
  });

  it("フォームフィールドとボタンが表示される", () => {
    render(<LoginPage />);
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
    expect(document.querySelector('input[type="password"]')).toBeTruthy();
    expect(screen.getByRole("button", { name: "ログイン" })).toBeInTheDocument();
  });

  it("ログイン成功時にユーザーをセットして /matthew/1 にリダイレクト", async () => {
    const { login } = await import("@/lib/api");
    const mockUser = { id: "u1", username: "alice", email: "a@b.com", bio: "", bookmarks_visibility: "private" as const, created_at: "" };
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

  it("ログイン後に安全な from のURLへ戻り、登録リンクにも引き継ぐ", async () => {
    mockFrom = "/qa?q=%E5%B1%B1%E4%B8%8A#question-q1";
    const { login } = await import("@/lib/api");
    vi.mocked(login).mockResolvedValue({
      id: "u1", username: "alice", email: "a@b.com", bio: "", bookmarks_visibility: "private", created_at: "",
    });

    render(<LoginPage />);
    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: "alice" } });
    fireEvent.change(document.querySelector('input[type="password"]')!, { target: { value: "pass1234" } });
    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith(mockFrom));
    expect(screen.getByRole("link", { name: "新規登録" })).toHaveAttribute(
      "href",
      `/register?from=${encodeURIComponent(mockFrom)}`,
    );
  });

  it("パスワード表示切替ボタンが表示され、トグルできる", () => {
    render(<LoginPage />);
    const toggle = screen.getByRole("button", { name: "パスワードを表示" });
    const pw = document.querySelector('input[type="password"]') as HTMLInputElement;
    expect(pw).toBeTruthy();
    fireEvent.click(toggle);
    expect(document.querySelector('input[type="text"][autocomplete="current-password"]')).toBeTruthy();
  });

  it("links to password recovery", () => {
    render(<LoginPage />);
    expect(document.querySelector('a[href="/forgot-password"]')).toBeInTheDocument();
  });
});
