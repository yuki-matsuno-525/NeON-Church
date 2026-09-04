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

/** どのタブを見ているかは URL（?tab=）で表す。既定は「読んでいる」。 */
const renderPage = async (params: { tab?: string } = {}) =>
  render(await PlansPage({ searchParams: Promise.resolve(params) }));

describe("読書プラン一覧", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("開いたときは「進行中」が出る", async () => {
    // 読書プランは続けることが中身なので、毎日戻ってくる場所を既定にする。
    await mockServer({ signedIn: true });

    await renderPage();

    expect(screen.getByRole("tab", { name: "進行中" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText(/まだ読んでいるプランはありません/)).toBeInTheDocument();
    // タブを押した人はもうどのタブか分かっているので、中で名乗り直さない。
    expect(screen.queryByRole("heading", { name: "進行中" })).not.toBeInTheDocument();
  });

  it("タブごとに、用途に合うリンク先のプランを出す", async () => {
    await mockServer({ signedIn: true });

    await renderPage({ tab: "mine" });
    expect(screen.getByRole("link", { name: /福音書を読む/ })).toHaveAttribute("href", "/plans/p1/edit");
    // 明細は「説明 → 値」の組で並ぶ（灰色の箱を横に並べるのをやめた）。
    expect(screen.getByText("日数").nextElementSibling).toHaveTextContent("7日");
    expect(screen.getByText("読者").nextElementSibling).toHaveTextContent("2人");
    expect(screen.getByRole("link", { name: "alice" })).toHaveAttribute("href", "/profile/alice");
    // 自分のプランには下書きが混ざるので、ここだけ公開範囲の印を出す。
    expect(screen.getByText("下書き")).toBeInTheDocument();
  });

  it("さがすタブでは公開プランを詳細へのリンクで出し、公開の印は出さない", async () => {
    await mockServer({ signedIn: true });

    await renderPage({ tab: "find" });

    expect(screen.getByRole("link", { name: /福音書を読む/ })).toHaveAttribute("href", "/plans/p1");
    // ここは全部公開なので、「公開」と書いても何も伝わらない。
    expect(screen.queryByText("公開")).not.toBeInTheDocument();
  });

  it("読み終わったプランは「進行中」から外れて「完了」に入る", async () => {
    // 読み終わっても購読は残る（is_active が落ちるのは「やめる」を押したときだけ）ので、
    // 終わった日数がプランの日数に届いたかで振り分ける。
    const apiServer = await mockServer({ signedIn: true });
    vi.mocked(apiServer.serverFetchList).mockResolvedValue([
      { id: "s1", plan: "p1", plan_title: "途中のプラン", started_at: "2026-08-01T00:00:00Z", is_active: true, day_count: 7, completed_count: 3 },
      { id: "s2", plan: "p2", plan_title: "読了したプラン", started_at: "2026-08-01T00:00:00Z", is_active: true, day_count: 5, completed_count: 5 },
    ]);

    const reading = await renderPage();
    expect(screen.getByRole("link", { name: "途中のプラン" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "読了したプラン" })).not.toBeInTheDocument();
    // 進捗が数字とバーの両方で出る（以前は札が並ぶだけで進み具合が分からなかった）
    expect(screen.getByText("7日中 3日")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: /途中のプラン/ })).toHaveAttribute("aria-valuenow", "43");
    reading.unmount();

    await renderPage({ tab: "done" });
    expect(screen.getByRole("link", { name: "読了したプラン" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "途中のプラン" })).not.toBeInTheDocument();
  });

  it("未ログインでもタブは4つ出て、最初は「さがす」が開く", async () => {
    // 「進行中」を既定にすると、開いた直後に見えるのがログインの案内だけに
    // なってしまう。実物の公開プランが先に見えるようにする。
    const apiServer = await mockServer({ signedIn: false });

    await renderPage();

    expect(screen.getAllByRole("tab")).toHaveLength(4);
    expect(screen.getByRole("tab", { name: "さがす" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("link", { name: /福音書を読む/ })).toHaveAttribute("href", "/plans/p1");
    // 作る導線はログインしてから。ログインが要るタブの案内から入ってもらう。
    expect(screen.queryByRole("link", { name: "新しいプラン" })).not.toBeInTheDocument();
    // 自分のものと購読は認証が要るので、未ログインでは取りに行かない。
    expect(vi.mocked(apiServer.serverFetchPage).mock.calls.map(([path]) => path)).toEqual(["/plans/"]);
    expect(apiServer.serverFetchList).not.toHaveBeenCalled();
  });

  it("未ログインでログインが要るタブを開くと、タブごとの案内とログインの導線が出る", async () => {
    await mockServer({ signedIn: false });

    const reading = await renderPage({ tab: "reading" });
    expect(screen.getByText(/読んでいるプランの進み具合がここに出ます/)).toBeInTheDocument();
    // ログインし終わったら、押したタブへそのまま戻ってくる。
    expect(screen.getByRole("link", { name: "ログインする" })).toHaveAttribute(
      "href",
      "/login?from=%2Fplans%3Ftab%3Dreading",
    );
    expect(screen.queryByRole("link", { name: /福音書を読む/ })).not.toBeInTheDocument();
    reading.unmount();

    await renderPage({ tab: "mine" });
    expect(screen.getByText(/自分で作ったプランを下書きも含めて/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ログインする" })).toHaveAttribute(
      "href",
      "/login?from=%2Fplans%3Ftab%3Dmine",
    );
  });

  it("取得失敗を空一覧と誤表示せず、再試行できる", async () => {
    const user = userEvent.setup();
    const apiServer = await mockServer({ signedIn: true });
    vi.mocked(apiServer.serverFetchPage).mockRejectedValue(new Error("Network Error"));

    await renderPage();

    expect(screen.getByRole("alert")).toHaveTextContent("プランを読み込めませんでした");
    expect(screen.queryByText("公開されているプランはまだありません。")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "もう一度試す" }));

    expect(refresh).toHaveBeenCalled();
  });
});
