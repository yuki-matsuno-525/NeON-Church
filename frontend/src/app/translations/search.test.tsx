import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import TranslationsPage from "./page";
import type { PaginatedResponse, TranslationProject } from "@/lib/api";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    fetchTranslations: vi.fn(),
  };
});

const mockUseAuth = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

const makeProject = (overrides: Partial<TranslationProject> = {}): TranslationProject => ({
  id: "p1",
  name: "Matthew translation project",
  description: "A project for Matthew",
  owner_username: "alice",
  source_book: "b1",
  source_book_name: "Matthew",
  target_language: "en",
  status: "published",
  unit_count: 10,
  done_count: 3,
  is_member: false,
  is_in_library: false,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-10T00:00:00Z",
  ...overrides,
});

const paginated = (items: TranslationProject[]): PaginatedResponse<TranslationProject> => ({
  count: items.length,
  next: null,
  previous: null,
  results: items,
});

describe("TranslationsPage search", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null });
    const { fetchTranslations } = await import("@/lib/api");
    vi.mocked(fetchTranslations).mockResolvedValue(paginated([makeProject()]));
  });

  it("passes the project search term to each status column request", async () => {
    render(<TranslationsPage />);

    fireEvent.change(screen.getByRole("searchbox", { name: "プロジェクトを検索" }), {
      target: { value: "Matthew" },
    });

    const { fetchTranslations } = await import("@/lib/api");
    await waitFor(() => {
      expect(vi.mocked(fetchTranslations)).toHaveBeenCalledWith("published", 1, "Matthew");
    });
  });
});
