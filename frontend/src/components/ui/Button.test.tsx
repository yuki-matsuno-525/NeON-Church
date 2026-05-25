import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "./Button";

vi.mock("@/contexts/LanguageContext", () => ({
  useLang: () => ({ lang: "ja", setLang: vi.fn() }),
}));

describe("Button", () => {
  it("クリックで onClick が呼ばれる", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>OK</Button>);
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(onClick).toHaveBeenCalled();
  });

  it("loading のとき aria-busy=true で disabled、Spinner が表示される", () => {
    render(<Button loading>Save</Button>);
    const btn = screen.getByRole("button", { name: /Save/ });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("disabled だと onClick が呼ばれない", () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        NG
      </Button>
    );
    fireEvent.click(screen.getByRole("button", { name: "NG" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("type のデフォルトが button (form 内で誤 submit しない)", () => {
    render(<Button>X</Button>);
    expect(screen.getByRole("button", { name: "X" })).toHaveAttribute("type", "button");
  });
});
