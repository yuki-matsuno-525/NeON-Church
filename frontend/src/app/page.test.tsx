import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    fetchVerseOfDay: vi.fn().mockResolvedValue(null),
    fetchQAComments: vi.fn().mockResolvedValue([]),
    fetchTrendingComments: vi.fn().mockResolvedValue([]),
  };
});

describe("Home article entry", () => {
  it("記事のカードから記事一覧へ行ける（ログインは要らない）", () => {
    render(<Home />);

    expect(screen.getByRole("link", { name: "記事" })).toHaveAttribute("href", "/articles");
  });
});
