import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useBookCatalogState } from "./useBookCatalog";

vi.mock("@/lib/api", () => ({ fetchBooks: vi.fn() }));

describe("useBookCatalogState", () => {
  beforeEach(() => vi.clearAllMocks());

  it("取得失敗を空一覧と区別し、再試行できる", async () => {
    const api = await import("@/lib/api");
    vi.mocked(api.fetchBooks)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce([
        { id: "book-1", name: "マタイによる福音書", translation: "口語訳", order: 1 },
      ]);

    const { result } = renderHook(() => useBookCatalogState());
    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.catalog).toEqual([]);

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(false);
    expect(result.current.catalog[0]?.slug).toBe("matthew");
  });
});
