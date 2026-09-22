import { afterEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { HowToGuide } from "./HowToGuide";

const renderGuide = () =>
  render(<HowToGuide id="test" title="作り方" steps={["日を足す", "章を選ぶ"]} note="自動で保存されます。" />);

describe("HowToGuide", () => {
  afterEach(() => localStorage.clear());

  it("はじめては開いた状態で、手順と添え書きを出す", () => {
    const { container } = renderGuide();

    expect(container.querySelector("details")).toHaveAttribute("open");
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(["日を足す", "章を選ぶ"]);
    expect(screen.getByText("自動で保存されます。")).toBeInTheDocument();
  });

  it("一度たたむと、次からはたたんだまま出す", () => {
    const first = renderGuide();
    const details = first.container.querySelector("details")!;
    details.open = false;
    fireEvent(details, new Event("toggle"));
    first.unmount();

    const { container } = renderGuide();
    expect(container.querySelector("details")).not.toHaveAttribute("open");
  });
});
