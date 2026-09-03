import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlanReader } from "./PlanReader";
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
    fetchPlan: vi.fn(),
    subscribeToPlan: vi.fn(),
    completePlanDay: vi.fn(),
    uncompletePlanDay: vi.fn(),
  };
});

const plan: Plan = {
  id: "p1",
  title: "福音書を読む",
  description: "",
  visibility: "public",
  owner_username: "alice",
  day_count: 2,
  reader_count: 1,
  created_at: "2026-08-01T00:00:00Z",
  updated_at: "2026-08-01T00:00:00Z",
  days: [
    {
      id: "d1",
      number: 1,
      title: "はじまり",
      devotional: "声に出して読んでみてください。",
      completed: false,
      readings: [
        { id: "r1", book: "matthew", book_name: "マタイによる福音書", chapter_number: 1, translation: "", order: 0 },
        { id: "r2", book: "enoch", book_name: "エノク書", chapter_number: 5, translation: "口語訳", order: 1 },
      ],
    },
    {
      id: "d2",
      number: 2,
      title: "",
      devotional: "",
      completed: false,
      readings: [],
    },
  ],
  subscription: null,
};

/** 読書中（購読していて、まだやめていない）の状態のプラン。 */
const readingPlan: Plan = {
  ...plan,
  subscription: { id: "s1", started_at: "2026-08-01T00:00:00Z", is_active: true },
};

describe("プランを読み進めるところ", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "bob" }, loading: false });
  });

  it("日の見出しは、左の目盛りを足しても 1 回しか読み上げられない", () => {
    render(<PlanReader initialPlan={plan} />);

    // 目盛りは aria-hidden で包んであるので、画面読み上げには入らない。
    // ignore で「隠してあるものの中身」を除くと、残るのはカードの見出しだけになる。
    const hidden = '[aria-hidden="true"], [aria-hidden="true"] *';
    expect(screen.getAllByText("第1日", { ignore: hidden })).toHaveLength(1);
    expect(screen.getAllByText("第2日", { ignore: hidden })).toHaveLength(1);
    // 目盛り自体は（見た目として）出ている。
    expect(screen.getAllByText("第1日")).toHaveLength(2);
  });

  it("読む章がリンクとして出る。訳の指定があれば行き先に付く", () => {
    render(<PlanReader initialPlan={plan} />);

    expect(screen.getByRole("link", { name: /マタイによる福音書 1章/ })).toHaveAttribute(
      "href",
      "/matthew/1",
    );
    expect(screen.getByRole("link", { name: /エノク書 5章/ })).toHaveAttribute(
      "href",
      "/enoch/5?translation=%E5%8F%A3%E8%AA%9E%E8%A8%B3",
    );
  });

  it("訳の指定がある章だけ、書名の下に訳名が出る", () => {
    render(<PlanReader initialPlan={plan} />);

    expect(screen.getByText("口語訳")).toBeInTheDocument();
  });

  it("その日に添えられた文章が出る", () => {
    render(<PlanReader initialPlan={plan} />);

    expect(screen.getByText("声に出して読んでみてください。")).toBeInTheDocument();
  });

  it("読み始める前は「読み終えた」を出さない", () => {
    render(<PlanReader initialPlan={plan} />);

    expect(screen.getByRole("button", { name: "読み始める" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "第1日を読み終えたと記録" })).not.toBeInTheDocument();
  });

  it("読書中なら「読み終えた」を押して印を付けられる", async () => {
    const user = userEvent.setup();
    const api = await import("@/lib/api");
    vi.mocked(api.completePlanDay).mockResolvedValue(undefined as never);
    render(<PlanReader initialPlan={readingPlan} />);

    await user.click(screen.getByRole("button", { name: "第1日を読み終えたと記録" }));

    expect(api.completePlanDay).toHaveBeenCalledWith("p1", "d1");
  });
});
