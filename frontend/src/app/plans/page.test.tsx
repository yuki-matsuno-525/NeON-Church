import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PlansPage from "./page";
import type { Plan } from "@/lib/types";

const mockUseAuth = vi.fn();

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => mockUseAuth() }));
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    fetchPlans: vi.fn(),
    fetchMyPlanSubscriptions: vi.fn(),
  };
});

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

describe("読書プラン一覧", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "alice" }, loading: false });
    const api = await import("@/lib/api");
    vi.mocked(api.fetchPlans).mockImplementation(async (params) => ({
      count: 1,
      next: null,
      previous: null,
      results: params?.mine ? [{ ...plan, visibility: "private" }] : [plan],
    }));
    vi.mocked(api.fetchMyPlanSubscriptions).mockResolvedValue([]);
  });

  it("認証確認中は編集導線を先に表示しない", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });

    render(<PlansPage />);

    expect(screen.getByTestId("skeleton-list")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "新しいプラン" })).not.toBeInTheDocument();
  });

  it("自分のプランと公開プランを、用途に合うリンク先で表示する", async () => {
    render(<PlansPage />);

    const planLinks = await screen.findAllByRole("link", { name: /福音書を読む/ });
    expect(planLinks[0]).toHaveAttribute("href", "/plans/p1/edit");
    expect(planLinks[1]).toHaveAttribute("href", "/plans/p1");
    expect(screen.getAllByText("7日")).toHaveLength(2);
    expect(screen.getAllByText("2人が読書中")).toHaveLength(2);
  });

  it("取得失敗を空一覧と誤表示せず、再試行できる", async () => {
    const user = userEvent.setup();
    const api = await import("@/lib/api");
    vi.mocked(api.fetchPlans)
      .mockRejectedValueOnce(new Error("Network Error"))
      .mockRejectedValueOnce(new Error("Network Error"))
      .mockResolvedValue({ count: 1, next: null, previous: null, results: [plan] });

    render(<PlansPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("プランを読み込めませんでした");
    expect(screen.queryByText("公開されているプランはまだありません。")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "もう一度試す" }));

    await waitFor(() => expect(screen.getAllByRole("link", { name: /福音書を読む/ })).toHaveLength(2));
  });
});
