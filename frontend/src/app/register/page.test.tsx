import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RegisterPage from "./page";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
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
  return { ...actual, register: vi.fn() };
});

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("フォームフィールドとボタンが表示される", () => {
    render(<RegisterPage />);
    expect(screen.getByRole("button", { name: "登録する" })).toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(2);
  });

  it("登録成功時にユーザーをセットして /matthew/1 にリダイレクト", async () => {
    const { register } = await import("@/lib/api");
    const mockUser = { id: "u1", username: "bob", email: "b@c.com", bio: "", avatar_url: null, created_at: "" };
    vi.mocked(register).mockResolvedValue(mockUser);

    render(<RegisterPage />);
    const textboxes = screen.getAllByRole("textbox");
    fireEvent.change(textboxes[0], { target: { value: "bob" } });
    fireEvent.change(textboxes[1], { target: { value: "bob@example.com" } });
    fireEvent.change(document.querySelector('input[type="password"]')!, { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "登録する" }));

    await waitFor(() => expect(mockSetUser).toHaveBeenCalledWith(mockUser));
    expect(mockPush).toHaveBeenCalledWith("/matthew/1");
  });

  it("登録失敗時にエラーメッセージを表示", async () => {
    const { register } = await import("@/lib/api");
    vi.mocked(register).mockRejectedValue({ message: "このユーザー名は既に使われています" });

    render(<RegisterPage />);
    const textboxes = screen.getAllByRole("textbox");
    fireEvent.change(textboxes[0], { target: { value: "dup" } });
    fireEvent.change(textboxes[1], { target: { value: "dup@x.com" } });
    fireEvent.change(document.querySelector('input[type="password"]')!, { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "登録する" }));

    await waitFor(() => expect(screen.getByText("このユーザー名は既に使われています")).toBeInTheDocument());
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("送信中はボタンが「登録中...」になる", async () => {
    const { register } = await import("@/lib/api");
    vi.mocked(register).mockReturnValue(new Promise(() => {}));

    render(<RegisterPage />);
    const textboxes = screen.getAllByRole("textbox");
    fireEvent.change(textboxes[0], { target: { value: "bob" } });
    fireEvent.change(textboxes[1], { target: { value: "bob@example.com" } });
    fireEvent.change(document.querySelector('input[type="password"]')!, { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "登録する" }));

    expect(await screen.findByRole("button", { name: "登録中..." })).toBeDisabled();
  });

  it("ログインリンクが /login を指す", () => {
    render(<RegisterPage />);
    expect(screen.getByRole("link", { name: "ログイン" })).toHaveAttribute("href", "/login");
  });
});
