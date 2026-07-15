import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Home from "./page";

const pushMock = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/",
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
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

describe("Home compilation entry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the login modal when a guest opens compilation", async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });

    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: "編纂" }));

    expect(await screen.findByText("ログインして編纂を始める")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ログインする" })).toHaveAttribute("href", "/login?from=%2Fcompilations");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("opens the compilation page when the user is signed in", async () => {
    mockUseAuth.mockReturnValue({ user: { id: "u1", username: "alice" }, loading: false });

    render(<Home />);

    fireEvent.click(screen.getByRole("button", { name: "編纂" }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/compilations");
    });
  });
});
