import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import SettingsPage from "./page";
import type { AccountSettings } from "@/lib/api";

const mockReplace = vi.fn();
const mockSetUser = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u1", username: "alice", email: "alice@example.com" },
    loading: false,
    setUser: mockSetUser,
  }),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    fetchAccountSettings: vi.fn(),
    updateAccountIdentity: vi.fn(),
    updateNotificationPreferences: vi.fn(),
    changePassword: vi.fn(),
    fetchSessions: vi.fn(),
    revokeSession: vi.fn(),
    revokeOtherSessions: vi.fn(),
    deleteAccount: vi.fn(),
  };
});

const account: AccountSettings = {
  id: "u1",
  username: "alice",
  email: "alice@example.com",
  bio: "",
  bookmarks_visibility: "private",
  created_at: "2026-01-01T00:00:00Z",
  email_notifications_enabled: false,
  in_app_notifications_enabled: true,
  has_usable_password: true,
  social_providers: [],
};

describe("SettingsPage", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const api = await import("@/lib/api");
    vi.mocked(api.fetchAccountSettings).mockResolvedValue(account);
    vi.mocked(api.fetchSessions).mockResolvedValue([
      { id: "current", current: true, created_at: "2026-01-01T00:00:00Z", expires_at: "2026-01-21T00:00:00Z" },
      { id: "other", current: false, created_at: "2026-01-02T00:00:00Z", expires_at: "2026-01-22T00:00:00Z" },
    ]);
  });

  it("設定をセクションごとに表示する", async () => {
    render(<SettingsPage />);

    expect(await screen.findByRole("heading", { name: "アカウント設定" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ユーザー情報" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "通知" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "メール通知" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("heading", { name: "パスワード" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ログイン中のセッション" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "アカウント削除" })).toBeInTheDocument();
  });

  it("現在のパスワード付きでユーザー情報を更新する", async () => {
    const api = await import("@/lib/api");
    vi.mocked(api.updateAccountIdentity).mockResolvedValue({ ...account, username: "renamed" });
    render(<SettingsPage />);

    fireEvent.change(await screen.findByLabelText("ユーザー名"), { target: { value: "renamed" } });
    fireEvent.change(screen.getAllByLabelText("現在のパスワード")[0], { target: { value: "current-pass" } });
    fireEvent.click(screen.getByRole("button", { name: "ユーザー情報を保存" }));

    await waitFor(() => expect(api.updateAccountIdentity).toHaveBeenCalledWith({
      username: "renamed",
      email: "alice@example.com",
      current_password: "current-pass",
    }));
    expect(await screen.findByRole("status")).toHaveTextContent("ユーザー情報を更新しました");
    expect(mockSetUser).toHaveBeenCalledWith(expect.objectContaining({ username: "renamed" }));
  });

  it("セッション失効前に確認ダイアログを表示する", async () => {
    const api = await import("@/lib/api");
    vi.mocked(api.revokeSession).mockResolvedValue();
    render(<SettingsPage />);

    await screen.findByText("別のセッション");
    const sessionItems = screen.getAllByRole("listitem");
    fireEvent.click(within(sessionItems[1]).getByRole("button", { name: "無効にする" }));
    const dialog = screen.getByRole("alertdialog", { name: "セッションを無効にしますか？" });
    fireEvent.click(within(dialog).getByRole("button", { name: "無効にする" }));

    await waitFor(() => expect(api.revokeSession).toHaveBeenCalledWith("other"));
  });

  it("OAuthのみのアカウントではパスワード欄を要求せず削除確認できる", async () => {
    const api = await import("@/lib/api");
    vi.mocked(api.fetchAccountSettings).mockResolvedValue({ ...account, has_usable_password: false, social_providers: ["google"] });
    render(<SettingsPage />);

    fireEvent.change(await screen.findByLabelText("確認のためユーザー名を入力"), { target: { value: "alice" } });
    fireEvent.click(screen.getByRole("button", { name: "アカウントを削除" }));

    expect(screen.getByRole("alertdialog", { name: "アカウントを完全に削除しますか？" })).toBeInTheDocument();
  });
});
