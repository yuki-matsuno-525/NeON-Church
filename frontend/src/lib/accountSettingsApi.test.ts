import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteAccount,
  fetchAccountSettings,
  requestPasswordReset,
  revokeSession,
  updateNotificationPreferences,
} from "./apiClient";

const mockFetch = vi.fn();
global.fetch = mockFetch;

function response(status: number, body?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "Error",
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(body === undefined ? "" : JSON.stringify(body)),
  } as unknown as Response;
}

describe("account settings API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(document, "cookie", { value: "", writable: true, configurable: true });
  });

  it("設定と通知設定のエンドポイントを呼び出す", async () => {
    const settings = { username: "alice", email_notifications_enabled: false, in_app_notifications_enabled: true };
    mockFetch.mockResolvedValueOnce(response(200, settings));
    mockFetch.mockResolvedValueOnce(response(200, { email_notifications_enabled: false, in_app_notifications_enabled: true }));

    await expect(fetchAccountSettings()).resolves.toEqual(settings);
    await updateNotificationPreferences({ email_notifications_enabled: false, in_app_notifications_enabled: true });

    expect(mockFetch).toHaveBeenNthCalledWith(1, "/api/auth/settings/", expect.objectContaining({ credentials: "include" }));
    expect(mockFetch).toHaveBeenNthCalledWith(2, "/api/auth/settings/preferences/", expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ email_notifications_enabled: false, in_app_notifications_enabled: true }),
    }));
  });

  it("個別セッション失効とアカウント削除をDELETEで送信する", async () => {
    mockFetch.mockResolvedValueOnce(response(204));
    mockFetch.mockResolvedValueOnce(response(204));

    await revokeSession("session id");
    await deleteAccount("alice", "password");

    expect(mockFetch).toHaveBeenNthCalledWith(1, "/api/auth/settings/sessions/session%20id/", expect.objectContaining({ method: "DELETE" }));
    expect(mockFetch).toHaveBeenNthCalledWith(2, "/api/auth/settings/account/", expect.objectContaining({
      method: "DELETE",
      body: JSON.stringify({ username: "alice", password: "password" }),
    }));
  });

  it("パスワード再設定要求を公開エンドポイントへ送信する", async () => {
    mockFetch.mockResolvedValueOnce(response(200, { detail: "sent" }));

    await expect(requestPasswordReset("person@example.com")).resolves.toEqual({ detail: "sent" });
    expect(mockFetch).toHaveBeenCalledWith("/api/auth/password-reset/", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ email: "person@example.com" }),
    }));
  });
});
