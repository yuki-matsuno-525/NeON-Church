import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("title / description / action を表示し、role=status を持つ", () => {
    render(
      <EmptyState
        title="何もありません"
        description="最初の項目を追加してください。"
        action={<button>追加</button>}
      />
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("何もありません")).toBeInTheDocument();
    expect(screen.getByText("最初の項目を追加してください。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "追加" })).toBeInTheDocument();
  });

  it("description / action なしでも title だけで表示される", () => {
    render(<EmptyState title="空" />);
    expect(screen.getByText("空")).toBeInTheDocument();
  });
});
