import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PlanEditPage from "./page";
import type { Plan } from "@/lib/types";

// params は Promise なので、テストでは中身をそのまま返す（他のページのテストと同じやり方）。
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    use: (value: unknown) => {
      if (value instanceof Promise) return { id: "p1" };
      return actual.use(value as never);
    },
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/plans/p1/edit",
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1", username: "alice" }, loading: false }),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, fetchPlan: vi.fn(), updatePlan: vi.fn() };
});

const plan: Plan = {
  id: "p1",
  title: "福音書を読む",
  description: "",
  note: "",
  visibility: "private",
  owner_username: "alice",
  day_count: 0,
  reader_count: 0,
  created_at: "2026-08-01T00:00:00Z",
  updated_at: "2026-08-01T00:00:00Z",
  days: [],
  can_reorder_days: true,
};

describe("プランの編集画面", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("説明と注記に打った文字が、取り直しで消えない", async () => {
    // 以前は描き直すたびにプランを取り直し、打った文字をサーバーの値で上書きしていた。
    const api = await import("@/lib/api");
    vi.mocked(api.fetchPlan).mockResolvedValue(plan);
    vi.mocked(api.updatePlan).mockResolvedValue(plan);

    render(<PlanEditPage params={Promise.resolve({ id: "p1" })} />);
    await screen.findByDisplayValue("福音書を読む");

    await userEvent.type(screen.getByPlaceholderText("どんなプランかの短い説明"), "四つの福音書");
    await userEvent.type(screen.getByLabelText(/読む人への注記/), "ゆっくりどうぞ");

    await waitFor(() => {
      expect(screen.getByDisplayValue("四つの福音書")).toBeInTheDocument();
      expect(screen.getByDisplayValue("ゆっくりどうぞ")).toBeInTheDocument();
    });
    expect(api.fetchPlan).toHaveBeenCalledTimes(1);
  });
});
