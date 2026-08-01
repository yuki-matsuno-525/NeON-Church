import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NotificationsPage from "./page";
import type { ListPage, Notification, NotificationCounts } from "@/lib/api";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockUseAuth = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

// 未読件数は一覧ではなくサーバーの数（NotificationContext）を見るのでモックする。
const mockUseNotifications = vi.fn();
vi.mock("@/contexts/NotificationContext", () => ({
  useNotifications: () => mockUseNotifications(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    fetchNotificationPage: vi.fn(),
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
  translation_project_id: null,
  is_read: false,
  created_at: new Date().toISOString(),
  target_kind: "verse_comment",
  book_name: "マタイによる福音書",
  chapter_number: 5,
  verse_number: 3,
  translation_unit_id: null,
  is_qa: false,
  ...overrides,
});

/** 1ページ分のレスポンス。counts は results の中身から素直に数える。 */
const makePage = (
  results: Notification[],
  overrides: Partial<ListPage<Notification, NotificationCounts>> = {}
): ListPage<Notification, NotificationCounts> => {
  const counts: NotificationCounts = { all: results.length, reply: 0, upvote: 0, mention: 0 };
  for (const n of results) counts[n.notification_type] += 1;
  return { results, count: results.length, hasMore: false, counts, ...overrides };
};

describe("NotificationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "alice" }, loading: false });
    mockUseNotifications.mockReturnValue({
      unreadCount: 1,
      decrementUnread: vi.fn(),
      clearUnread: vi.fn(),
      refresh: vi.fn(),
    });
  });

  it("ローディング中に Skeleton を表示する", async () => {
    const { fetchNotificationPage } = await import("@/lib/api");
    vi.mocked(fetchNotificationPage).mockReturnValue(new Promise(() => {}));
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
    const { fetchNotificationPage } = await import("@/lib/api");
    vi.mocked(fetchNotificationPage).mockResolvedValue(makePage([]));
    render(<NotificationsPage />);
    await screen.findByText("通知はありません。");
  });

  it("通知一覧を表示する", async () => {
    const { fetchNotificationPage } = await import("@/lib/api");
    vi.mocked(fetchNotificationPage).mockResolvedValue(
      makePage([makeNotification({ actor_username: "charlie", comment_body_snippet: "コメント本文" })])
    );
    render(<NotificationsPage />);
    await screen.findByText("charlie");
    expect(screen.getByText("コメント本文")).toBeInTheDocument();
  });

  it("未読があると「すべて既読」ボタンが押せる", async () => {
    const { fetchNotificationPage } = await import("@/lib/api");
    vi.mocked(fetchNotificationPage).mockResolvedValue(makePage([makeNotification({ is_read: false })]));
    render(<NotificationsPage />);
    const btn = await screen.findByRole("button", { name: "すべて既読" });
    expect(btn).toBeEnabled();
  });

  it("すべて既読のとき「すべて既読」ボタンは disabled で表示される (layout shift 防止)", async () => {
    const { fetchNotificationPage } = await import("@/lib/api");
    // 一覧の中身ではなくサーバーの未読数 0 で判定する
    mockUseNotifications.mockReturnValue({
      unreadCount: 0,
      decrementUnread: vi.fn(),
      clearUnread: vi.fn(),
      refresh: vi.fn(),
    });
    vi.mocked(fetchNotificationPage).mockResolvedValue(makePage([makeNotification({ is_read: true })]));
    render(<NotificationsPage />);
    await screen.findByText("bob");
    expect(screen.getByRole("button", { name: "すべて既読" })).toBeDisabled();
  });

  it("読み込み済みが既読だけでも、他ページに未読があれば「すべて既読」は押せる", async () => {
    // 一覧は1ページ分しか持たないので、表示中の分から未読を数えると押せなくなってしまう。
    const { fetchNotificationPage } = await import("@/lib/api");
    mockUseNotifications.mockReturnValue({
      unreadCount: 5,
      decrementUnread: vi.fn(),
      clearUnread: vi.fn(),
      refresh: vi.fn(),
    });
    vi.mocked(fetchNotificationPage).mockResolvedValue(
      makePage([makeNotification({ is_read: true })], { hasMore: true })
    );
    render(<NotificationsPage />);
    await screen.findByText("bob");
    expect(screen.getByRole("button", { name: "すべて既読" })).toBeEnabled();
  });

  it("「すべて既読」ボタン押下で markAllNotificationsRead が呼ばれる", async () => {
    const { fetchNotificationPage, markAllNotificationsRead } = await import("@/lib/api");
    vi.mocked(fetchNotificationPage).mockResolvedValue(makePage([makeNotification()]));
    vi.mocked(markAllNotificationsRead).mockResolvedValue(undefined);
    render(<NotificationsPage />);
    const btn = await screen.findByRole("button", { name: "すべて既読" });
    fireEvent.click(btn);
    await waitFor(() => expect(markAllNotificationsRead).toHaveBeenCalled());
  });

  it("通知タイプ 'reply' は「返信」と表示される", async () => {
    const { fetchNotificationPage } = await import("@/lib/api");
    vi.mocked(fetchNotificationPage).mockResolvedValue(
      makePage([makeNotification({ notification_type: "reply" })])
    );
    render(<NotificationsPage />);
    await screen.findByText("返信", { selector: ".badge" });
  });

  it("通知タイプ 'upvote' は「いいね」と表示される", async () => {
    const { fetchNotificationPage } = await import("@/lib/api");
    vi.mocked(fetchNotificationPage).mockResolvedValue(
      makePage([makeNotification({ notification_type: "upvote" })])
    );
    render(<NotificationsPage />);
    await screen.findByText("いいね", { selector: ".badge" });
  });

  it("通知タイプ 'mention' は「メンション」と表示される（以前は生の mention が出ていた）", async () => {
    const { fetchNotificationPage } = await import("@/lib/api");
    vi.mocked(fetchNotificationPage).mockResolvedValue(
      makePage([makeNotification({ notification_type: "mention" })])
    );
    render(<NotificationsPage />);
    await screen.findByText("メンション", { selector: ".badge" });
  });

  it("fetchNotificationPage が失敗してもクラッシュしない", async () => {
    const { fetchNotificationPage } = await import("@/lib/api");
    vi.mocked(fetchNotificationPage).mockRejectedValue(new Error("Network Error"));
    render(<NotificationsPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("読み込めませんでした");
    expect(screen.getByRole("button", { name: "もう一度試す" })).toBeInTheDocument();
  });

  // ------------------------------------------------------------------
  // 種類での絞り込みともっと見る
  // ------------------------------------------------------------------
  it("種類のチップを押すとその種類だけを取り直す", async () => {
    const { fetchNotificationPage } = await import("@/lib/api");
    vi.mocked(fetchNotificationPage).mockResolvedValue(
      makePage([makeNotification({ notification_type: "upvote" })])
    );
    render(<NotificationsPage />);
    const chip = await screen.findByRole("button", { name: /いいね \(1\)/ });
    await userEvent.click(chip);

    expect(fetchNotificationPage).toHaveBeenCalledWith({ type: "upvote", page: 1 });
  });

  it("続きがあるとき「もっと見る」で次のページを足す", async () => {
    const { fetchNotificationPage } = await import("@/lib/api");
    vi.mocked(fetchNotificationPage)
      .mockResolvedValueOnce(makePage([makeNotification({ id: "n1", actor_username: "bob" })], { hasMore: true }))
      .mockResolvedValueOnce(makePage([makeNotification({ id: "n2", actor_username: "carol" })]));
    render(<NotificationsPage />);

    const button = await screen.findByRole("button", { name: "もっと見る" });
    await userEvent.click(button);

    await screen.findByText("carol");
    expect(screen.getByText("bob")).toBeInTheDocument();
    expect(fetchNotificationPage).toHaveBeenLastCalledWith({ type: undefined, page: 2 });
  });
});
