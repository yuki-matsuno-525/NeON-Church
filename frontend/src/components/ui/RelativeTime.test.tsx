import { act } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { hydrateRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RelativeTime } from "./RelativeTime";

const CREATED_AT = "2024-06-01T12:00:00.000Z";

describe("RelativeTime", () => {
  let root: Root | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    if (root) {
      act(() => root?.unmount());
      root = undefined;
    }
    document.body.innerHTML = "";
    vi.useRealTimers();
  });

  it("SSR とクライアントの時計が違っても hydration mismatch を起こさず、現在時刻に追従する", async () => {
    vi.setSystemTime("2024-06-11T12:00:00.000Z");
    const serverHtml = renderToString(<RelativeTime dateStr={CREATED_AT} />);
    document.body.innerHTML = `<div id="root">${serverHtml}</div>`;

    vi.setSystemTime("2024-06-01T12:00:30.000Z");
    const recoverableErrors: unknown[] = [];
    const container = document.querySelector("#root");
    if (!container) throw new Error("hydration container was not created");

    await act(async () => {
      root = hydrateRoot(container, <RelativeTime dateStr={CREATED_AT} />, {
        onRecoverableError: (error) => recoverableErrors.push(error),
      });
    });

    expect(recoverableErrors).toEqual([]);
    const time = container.querySelector("time");
    expect(time).toHaveTextContent("たった今");
    expect(time).toHaveAttribute("title", new Date(CREATED_AT).toLocaleString());

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(time).toHaveTextContent("1分前");
  });
});
