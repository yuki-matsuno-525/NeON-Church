import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { handleHorizontalTabListKeyDown } from "./a11y";

describe("handleHorizontalTabListKeyDown", () => {
  it("矢印、Home、Endでタブを選択しフォーカスを移す", () => {
    const selectFirst = vi.fn();
    const selectSecond = vi.fn();
    render(
      <div role="tablist" onKeyDown={handleHorizontalTabListKeyDown}>
        <button role="tab" onClick={selectFirst}>First</button>
        <button role="tab" onClick={selectSecond}>Second</button>
      </div>,
    );
    const first = screen.getByRole("tab", { name: "First" });
    const second = screen.getByRole("tab", { name: "Second" });
    first.focus();

    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(second).toHaveFocus();
    expect(selectSecond).toHaveBeenCalledOnce();

    fireEvent.keyDown(second, { key: "Home" });
    expect(first).toHaveFocus();
    expect(selectFirst).toHaveBeenCalledOnce();
  });
});
