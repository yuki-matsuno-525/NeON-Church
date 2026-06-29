import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ReadPage from "./page";
import type { TranslationProject } from "@/lib/api";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    fetchReadingProgress: vi.fn().mockResolvedValue([]),
    fetchTranslationLibrary: vi.fn(),
  };
});

const mockUseAuth = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

const makeProject = (overrides: Partial<TranslationProject> = {}): TranslationProject => ({
  id: "tp1",
  name: "マタイ英訳プロジェクト",
  description: "",
  owner_username: "alice",
  source_book: "b1",
  source_book_name: "マタイによる福音書",
  target_language: "en",
  status: "published",
  unit_count: 100,
  done_count: 100,
  is_member: false,
  is_in_library: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-10T00:00:00Z",
  ...overrides,
});

describe("ReadPage マイ翻訳セクション", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("未ログインのときはマイ翻訳セクションを表示しない", async () => {
    const { fetchTranslationLibrary } = await import("@/lib/api");
    mockUseAuth.mockReturnValue({ user: null, loading: false });

    render(<ReadPage />);

    expect(screen.queryByText("本棚")).not.toBeInTheDocument();
    expect(vi.mocked(fetchTranslationLibrary)).not.toHaveBeenCalled();
  });

  it("登録が0件のときはセクションを表示しない", async () => {
    const { fetchTranslationLibrary } = await import("@/lib/api");
    vi.mocked(fetchTranslationLibrary).mockResolvedValue([]);
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "alice" }, loading: false });

    render(<ReadPage />);

    await waitFor(() => expect(vi.mocked(fetchTranslationLibrary)).toHaveBeenCalled());
    expect(screen.queryByText("本棚")).not.toBeInTheDocument();
  });

  it("登録があるとカードを表示し /translations/{id}/read にリンクする", async () => {
    const { fetchTranslationLibrary } = await import("@/lib/api");
    vi.mocked(fetchTranslationLibrary).mockResolvedValue([makeProject()]);
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "alice" }, loading: false });

    render(<ReadPage />);

    await screen.findByText("本棚");
    const card = screen.getByText("マタイ英訳プロジェクト").closest("a");
    expect(card).toHaveAttribute("href", "/translations/tp1/read");
  });
});
