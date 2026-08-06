import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PlansPage from "./page";
import type { Plan } from "@/lib/types";

const refresh = vi.fn();

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

vi.mock("@/lib/i18nServer", async () => {
  const { translations } = await import("@/lib/i18nDictionary");
  return { getT: async () => translations.ja, getRequestLanguage: async () => "ja" };
});

vi.mock("@/lib/apiServer", () => ({
  serverFetchPage: vi.fn(),
  serverFetchList: vi.fn(),
  serverIsSignedIn: vi.fn(),
}));

const plan: Plan = {
  id: "p1",
  title: "福音書を読む",
  description: "四つの福音書を順に読みます。",
  visibility: "public",
  owner_username: "alice",
  day_count: 7,
  reader_count: 2,
  created_at: "2026-08-01T00:00:00Z",
  updated_at: "2026-08-01T00:00:00Z",
};

async function mockServer({ signedIn }: { signedIn: boolean }) {
  const apiServer = await import("@/lib/apiServer");
  vi.mocked(apiServer.serverIsSignedIn).mockResolvedValue(signedIn);
  vi.mocked(apiServer.serverFetchList).mockResolvedValue([]);
  vi.mocked(apiServer.serverFetchPage).mockImplementation(async (path: string) => ({
    results: path.includes("mine=true") ? [{ ...plan, visibility: "private" }] : [plan],
    count: 1,
    hasMore: false,
    counts: undefined,
  }));
  return apiServer;
}

describe("読書プラン一覧", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("自分のプランと公開プランを、用途に合うリンク先で表示する", async () => {
    await mockServer({ signedIn: true });

    render(await PlansPage());

    const planLinks = screen.getAllByRole("link", { name: /福音書を読む/ });
    expect(planLinks[0]).toHaveAttribute("href", "/plans/p1/edit");
    expect(planLinks[1]).toHaveAttribute("href", "/plans/p1");
    expect(screen.getAllByText("7日")).toHaveLength(2);
    expect(screen.getAllByText("2人が読書中")).toHaveLength(2);
  });

  it("未ログインでは公開プランだけを出し、作成の導線は出さない", async () => {
    const apiServer = await mockServer({ signedIn: false });

    render(await PlansPage());

    expect(screen.getAllByRole("link", { name: /福音書を読む/ })).toHaveLength(1);
    expect(screen.queryByRole("link", { name: "新しいプラン" })).not.toBeInTheDocument();
    expect(vi.mocked(apiServer.serverFetchPage).mock.calls.map(([path]) => path)).toEqual(["/plans/"]);
  });

  it("取得失敗を空一覧と誤表示せず、再試行できる", async () => {
    const user = userEvent.setup();
    const apiServer = await mockServer({ signedIn: true });
    vi.mocked(apiServer.serverFetchPage).mockRejectedValue(new Error("Network Error"));

    render(await PlansPage());

    expect(screen.getByRole("alert")).toHaveTextContent("プランを読み込めませんでした");
    expect(screen.queryByText("公開されているプランはまだありません。")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "もう一度試す" }));

    expect(refresh).toHaveBeenCalled();
  });
});
