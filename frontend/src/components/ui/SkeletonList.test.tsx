import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SkeletonList } from "./SkeletonList";

describe("SkeletonList", () => {
  it("aria-busy=true と aria-live=polite を持つ", () => {
    render(<SkeletonList />);
    const el = screen.getByTestId("skeleton-list");
    expect(el).toHaveAttribute("aria-busy", "true");
    expect(el).toHaveAttribute("aria-live", "polite");
  });

  it("count に応じてカードと Skeleton を並べる (default 3)", () => {
    render(<SkeletonList />);
    expect(screen.getAllByTestId("skeleton")).toHaveLength(3 * 4);
  });

  it("count=5 を指定すると 5 枚並べる", () => {
    render(<SkeletonList count={5} />);
    expect(screen.getAllByTestId("skeleton")).toHaveLength(5 * 4);
  });
});
