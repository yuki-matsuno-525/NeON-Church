import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Skeleton } from "./Skeleton";

describe("Skeleton", () => {
  it("aria-hidden が付与され、width/height/radius を style に反映する", () => {
    render(<Skeleton width={120} height={20} radius={6} />);
    const el = screen.getByTestId("skeleton");
    expect(el).toHaveAttribute("aria-hidden", "true");
    expect(el.style.width).toBe("120px");
    expect(el.style.height).toBe("20px");
    expect(el.style.borderRadius).toBe("6px");
  });
});
