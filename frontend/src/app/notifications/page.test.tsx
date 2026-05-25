import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import NotificationsPage from "./page";
import type { Notification } from "@/lib/api";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockUseAuth = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    fetchNotifications: vi.fn(),
    markAllNotificationsRead: vi.fn(),
    markNotificationRead: vi.fn(),
  };
});

const makeNotification = (overrides: Partial<Notification> = {}): Notification => ({
  id: "n1",
  notification_type: "reply",
  actor_username: "bob",
  comment_id: "c1",
  comment_body_snippet: "返信テキスト",
  is_read: false,
  created_at: new Date().toISOString(),
  ...overrides,
});

describe("NotificationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "alice" }, loading: false });
  });

  it("ローディング中に Skeleton を表示する", async () => {
    const { fetchNotifications } = await import("@/lib/api");
    vi.mocked(fetchNotifications).mockReturnValue(new Promise(() => {}));
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "alice" }, loading: true });
    render(<NotificationsPage />);
    expect(screen.getByTestId("skeleton-list")).toBeInTheDocument();
  });

  it("未ログイン時は /login にリダイレクトする", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    render(<NotificationsPage />);
    expect(mockPush).toHaveBeenCalledWith("/login?from=/notifications");
  });

  it("通知がない場合「通知はありません。」を表示する", async () => {
    const { fetchNotifications } = await import("@/lib/api");
    vi.mocked(fetchNotifications).mockResolvedValue([]);
    render(<NotificationsPage />);
    await screen.findByText("通知はありません。");
  });

  it("通知一覧を表示する", async () => {
    const { fetchNotifications } = await import("@/lib/api");
    vi.mocked(fetchNotifications).mockResolvedValue([
      makeNotification({ actor_username: "charlie", comment_body_snippet: "コメント本文" }),
    ]);
    render(<NotificationsPage />);
    await screen.findByText("charlie");
    expect(screen.getByText("コメント本文")).toBeInTheDocument();
  });

  it("未読通知があると「すべて既読」ボタンが表示される", async () => {
    const { fetchNotifications } = await import("@/lib/api");
    vi.mocked(fetchNotifications).mockResolvedValue([makeNotification({ is_read: false })]);
    render(<NotificationsPage />);
    await screen.findByRole("button", { name: "すべて既読" });
  });

  it("すべて既読のとき「すべて既読」ボタンが表示されない", async () => {
    const { fetchNotifications } = await import("@/lib/api");
    vi.mocked(fetchNotifications).mockResolvedValue([makeNotification({ is_read: true })]);
    render(<NotificationsPage />);
    await screen.findByText("bob");
    expect(screen.queryByRole("button", { name: "すべて既読" })).not.toBeInTheDocument();
  });

  it("「すべて既読」ボタン押下で markAllNotificationsRead が呼ばれる", async () => {
    const { fetchNotifications, markAllNotificationsRead } = await import("@/lib/api");
    vi.mocked(fetchNotifications).mockResolvedValue([makeNotification()]);
    vi.mocked(markAllNotificationsRead).mockResolvedValue(undefined);
    render(<NotificationsPage />);
    const btn = await screen.findByRole("button", { name: "すべて既読" });
    fireEvent.click(btn);
    await waitFor(() => expect(markAllNotificationsRead).toHaveBeenCalled());
  });

  it("通知タイプ 'reply' は「返信」と表示される", async () => {
    const { fetchNotifications } = await import("@/lib/api");
    vi.mocked(fetchNotifications).mockResolvedValue([makeNotification({ notification_type: "reply" })]);
    render(<NotificationsPage />);
    await screen.findByText("返信");
  });

  it("通知タイプ 'upvote' は「いいね」と表示される", async () => {
    const { fetchNotifications } = await import("@/lib/api");
    vi.mocked(fetchNotifications).mockResolvedValue([makeNotification({ notification_type: "upvote" })]);
    render(<NotificationsPage />);
    await screen.findByText("いいね");
  });

  it("fetchNotifications が失敗してもクラッシュしない", async () => {
    const { fetchNotifications } = await import("@/lib/api");
    vi.mocked(fetchNotifications).mockRejectedValue(new Error("Network Error"));
    render(<NotificationsPage />);
    await screen.findByText("通知はありません。");
  });
});
