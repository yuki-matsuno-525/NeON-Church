import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ListPage } from "@/lib/api";
import { useLoadMore } from "./useLoadMore";

const page = (results: string[], hasMore = false): ListPage<string> => ({
  results,
  count: results.length,
  hasMore,
  counts: undefined,
});

describe("useLoadMore", () => {
  it("初回エラーを保持し、再試行で1ページ目を表示する", async () => {
    const fetchPage = vi.fn<(page: number) => Promise<ListPage<string>>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(page(["first"]));

    const { result } = renderHook(() => useLoadMore(fetchPage));

    await waitFor(() => expect(result.current.error?.message).toBe("offline"));
    expect(result.current.items).toEqual([]);

    act(() => result.current.retry());

    await waitFor(() => expect(result.current.items).toEqual(["first"]));
    expect(result.current.error).toBeNull();
    expect(fetchPage).toHaveBeenLastCalledWith(1);
  });

  it("追加読込エラーでも既存項目とhasMoreを保ち、同じページを再試行する", async () => {
    const fetchPage = vi.fn<(page: number) => Promise<ListPage<string>>>()
      .mockResolvedValueOnce(page(["first"], true))
      .mockRejectedValueOnce(new Error("page 2 failed"))
      .mockResolvedValueOnce({ ...page(["second"]), count: 2 });

    const { result } = renderHook(() => useLoadMore(fetchPage));
    await waitFor(() => expect(result.current.items).toEqual(["first"]));

    await act(async () => result.current.loadMore());

    expect(result.current.items).toEqual(["first"]);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.loadMoreError?.message).toBe("page 2 failed");

    await act(async () => result.current.loadMore());

    expect(result.current.items).toEqual(["first", "second"]);
    expect(result.current.loadMoreError).toBeNull();
    expect(fetchPage.mock.calls.map(([requestedPage]) => requestedPage)).toEqual([1, 2, 2]);
  });
});
