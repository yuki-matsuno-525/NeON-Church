import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";
import type { ReactNode } from "react";

const mockFetchMe = vi.fn();
const mockApiLogout = vi.fn();

vi.mock("@/lib/api", () => ({
  fetchMe: (...args: unknown[]) => mockFetchMe(...args),
  logout: (...args: unknown[]) => mockApiLogout(...args),
}));

const TEST_USER = {
  id: "u1",
  username: "alice",
  email: "alice@example.com",
  bio: "",
  created_at: "2024-01-01T00:00:00Z",
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // CSRF fetch
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
  });

  it("初期状態: loading=true, user=null", async () => {
    mockFetchMe.mockResolvedValue(TEST_USER);
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
    // 非同期更新をフラッシュして act() 警告を解消
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it("fetchMe成功時: user がセットされloading=false", async () => {
    mockFetchMe.mockResolvedValue(TEST_USER);
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user?.username).toBe("alice");
  });

  it("fetchMe失敗時: user=null でloading=false", async () => {
    mockFetchMe.mockRejectedValue(new Error("Unauthorized"));
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
  });

  it("setUser でユーザーを直接セットできる", async () => {
    mockFetchMe.mockRejectedValue(new Error("Unauthorized"));
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setUser(TEST_USER);
    });

    expect(result.current.user?.username).toBe("alice");
  });

  it("logout でuser=nullになる", async () => {
    mockFetchMe.mockResolvedValue(TEST_USER);
    mockApiLogout.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.user).not.toBeNull());

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
  });

  it("logoutAPIが失敗してもuser=nullになる", async () => {
    mockFetchMe.mockResolvedValue(TEST_USER);
    mockApiLogout.mockRejectedValue(new Error("network error"));
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.user).not.toBeNull());

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
  });
});
