import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { SessionExpiredHandler } from "./SessionExpiredHandler";

const mockUseAuth = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/lib/i18n", () => ({
  useT: () => ({ sessionExpiredTitle: "切れました", sessionExpiredDesc: "再ログイン" }),
}));

// モーダルは存在確認だけできればよい（中身は LoginRequiredModal 側でテスト）。
vi.mock("@/components/ui/LoginRequiredModal", () => ({
  LoginRequiredModal: () => <div data-testid="session-expired-modal" />,
}));

const setUser = vi.fn();

describe("SessionExpiredHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ログイン中に auth:session-expired を受けるとログアウトしモーダルを出す", () => {
    mockUseAuth.mockReturnValue({ user: { id: "u1" }, setUser });
    render(<SessionExpiredHandler />);

    expect(screen.queryByTestId("session-expired-modal")).toBeNull();

    act(() => {
      window.dispatchEvent(new CustomEvent("auth:session-expired"));
    });

    expect(setUser).toHaveBeenCalledWith(null);
    expect(screen.getByTestId("session-expired-modal")).toBeTruthy();
  });

  it("未ログイン時は何もしない（多重防止）", () => {
    mockUseAuth.mockReturnValue({ user: null, setUser });
    render(<SessionExpiredHandler />);

    act(() => {
      window.dispatchEvent(new CustomEvent("auth:session-expired"));
    });

    expect(setUser).not.toHaveBeenCalled();
    expect(screen.queryByTestId("session-expired-modal")).toBeNull();
  });
});
