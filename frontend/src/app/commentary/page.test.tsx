import { describe, expect, it, vi } from "vitest";
import CommentaryIndexPage from "./page";

const redirect = vi.fn();
vi.mock("next/navigation", () => ({ redirect: (href: string) => redirect(href) }));

describe("/commentary", () => {
  it("「読む」の解釈書タブへ送る", () => {
    CommentaryIndexPage();
    expect(redirect).toHaveBeenCalledWith("/read?tab=commentary");
  });
});
