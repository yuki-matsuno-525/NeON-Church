import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { NotificationProvider, useNotifications } from "./NotificationContext";

vi.mock("@/lib/api", () => ({
  fetchUnreadCount: vi.fn().mockResolvedValue(0),
}));

const mockUser = { id: "u1", username: "alice" } as { id: string; username: string } | null;
let currentUser: typeof mockUser = mockUser;
vi.mock("./AuthContext", () => ({
  useAuth: () => ({ user: currentUser, loading: false, setUser: vi.fn(), logout: async () => {} }),
}));

function Probe() {
  const { unreadCount, decrementUnread, clearUnread, refresh } = useNotifications();
  return (
    <div>
      <span data-testid="count">{unreadCount}</span>
      <button onClick={decrementUnread}>dec</button>
      <button onClick={clearUnread}>clear</button>
      <button onClick={() => refresh()}>refresh</button>
    </div>
  );
}

describe("NotificationProvider", () => {
  beforeEach(() => {
    currentUser = { id: "u1", username: "alice" };
    vi.clearAllMocks();
  });

  it("ログイン済みなら mount 時に fetchUnreadCount を呼んで状態に反映", async () => {
    const { fetchUnreadCount } = await import("@/lib/api");
    vi.mocked(fetchUnreadCount).mockResolvedValueOnce(5);
    render(
      <NotificationProvider>
        <Probe />
      </NotificationProvider>
    );
    await waitFor(() => expect(screen.getByTestId("count").textContent).toBe("5"));
  });

  it("decrementUnread で 1 減り、clearUnread で 0 に戻る", async () => {
    const { fetchUnreadCount } = await import("@/lib/api");
    vi.mocked(fetchUnreadCount).mockResolvedValueOnce(3);
    render(
      <NotificationProvider>
        <Probe />
      </NotificationProvider>
    );
    await waitFor(() => expect(screen.getByTestId("count").textContent).toBe("3"));
    act(() => {
      screen.getByText("dec").click();
    });
    expect(screen.getByTestId("count").textContent).toBe("2");
    act(() => {
      screen.getByText("clear").click();
    });
    expect(screen.getByTestId("count").textContent).toBe("0");
  });

  it("ログアウト中は fetch せず 0 を維持する", async () => {
    currentUser = null;
    const { fetchUnreadCount } = await import("@/lib/api");
    render(
      <NotificationProvider>
        <Probe />
      </NotificationProvider>
    );
    expect(screen.getByTestId("count").textContent).toBe("0");
    expect(fetchUnreadCount).not.toHaveBeenCalled();
  });

  it("Provider 外で useNotifications を呼んでも no-op で例外を出さない", () => {
    expect(() => render(<Probe />)).not.toThrow();
  });
});
