import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Toggle } from "./Toggle";

describe("Toggle", () => {
  it("role=switch + aria-checked が状態を反映する", () => {
    render(<Toggle checked={false} onChange={() => {}} label="t" />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  it("クリックで onChange に反転値が渡る", () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} label="t" />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("description があると aria-describedby で結ばれる", () => {
    render(<Toggle checked label="t" description="説明文" onChange={() => {}} />);
    const sw = screen.getByRole("switch");
    const desc = screen.getByText("説明文");
    expect(sw.getAttribute("aria-describedby")).toBe(desc.id);
  });

  it("disabled だと onChange が呼ばれない", () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} label="t" disabled />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onChange).not.toHaveBeenCalled();
  });
});
