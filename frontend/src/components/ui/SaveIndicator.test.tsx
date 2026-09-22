import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SaveIndicator } from "./SaveIndicator";

describe("SaveIndicator", () => {
  it("保存中と保存済みを出し分ける", () => {
    const { rerender } = render(<SaveIndicator status="saving" />);
    expect(screen.getByRole("status")).toHaveTextContent("保存中");

    rerender(<SaveIndicator status="saved" />);
    expect(screen.getByRole("status")).toHaveTextContent("保存済み ✓");
  });

  it("失敗したときはここには出さない（直し方と一緒に別の場所に出すため）", () => {
    render(<SaveIndicator status="error" />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
