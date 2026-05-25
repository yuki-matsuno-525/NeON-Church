import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TextField } from "./TextField";

describe("TextField", () => {
  it("label と input が htmlFor / id で関連付けされる", () => {
    render(<TextField label="ユーザー名" />);
    const input = screen.getByLabelText("ユーザー名");
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe("INPUT");
  });

  it("hint があると aria-describedby が hint id を含む", () => {
    render(<TextField label="名前" hint="フルネームで入力" />);
    const input = screen.getByLabelText("名前");
    const hint = screen.getByText("フルネームで入力");
    expect(input.getAttribute("aria-describedby")).toBe(hint.id);
  });

  it("error があると aria-invalid=true、role=alert で表示", () => {
    render(<TextField label="メール" error="不正な形式です" />);
    const input = screen.getByLabelText("メール");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByRole("alert")).toHaveTextContent("不正な形式です");
  });

  it("onChange が呼ばれる", () => {
    const onChange = vi.fn();
    render(<TextField label="L" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("L"), { target: { value: "abc" } });
    expect(onChange).toHaveBeenCalled();
  });

  it("labelHidden で sr-only クラスが付く", () => {
    render(<TextField label="検索" labelHidden />);
    const label = screen.getByText("検索");
    expect(label.className).toContain("sr-only");
  });
});
