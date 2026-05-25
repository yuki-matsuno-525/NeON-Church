import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PasswordField } from "./PasswordField";

vi.mock("@/contexts/LanguageContext", () => ({
  useLang: () => ({ lang: "ja", setLang: vi.fn() }),
}));

describe("PasswordField", () => {
  it("初期表示は type=password で eye アイコン (Show)", () => {
    render(
      <PasswordField
        id="pw"
        value=""
        onChange={() => {}}
        autoComplete="current-password"
      />
    );
    const input = document.querySelector("#pw") as HTMLInputElement;
    expect(input.type).toBe("password");
    const toggle = screen.getByRole("button", { name: "パスワードを表示" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
  });

  it("トグルクリックで type=text に切り替わり aria-pressed=true、label が反転", () => {
    render(
      <PasswordField
        id="pw"
        value="secret"
        onChange={() => {}}
        autoComplete="current-password"
      />
    );
    const toggle = screen.getByRole("button", { name: "パスワードを表示" });
    fireEvent.click(toggle);
    const input = document.querySelector("#pw") as HTMLInputElement;
    expect(input.type).toBe("text");
    expect(screen.getByRole("button", { name: "パスワードを非表示" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("autoComplete / required / minLength / aria 属性を input に渡す", () => {
    render(
      <PasswordField
        id="pw"
        value=""
        onChange={() => {}}
        autoComplete="new-password"
        required
        minLength={8}
        ariaInvalid
        ariaDescribedby="err-1"
      />
    );
    const input = document.querySelector("#pw") as HTMLInputElement;
    expect(input.getAttribute("autocomplete")).toBe("new-password");
    expect(input.required).toBe(true);
    expect(input.minLength).toBe(8);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe("err-1");
  });

  it("input の変更で onChange が文字列を受け取る", () => {
    const onChange = vi.fn();
    render(
      <PasswordField
        id="pw"
        value=""
        onChange={onChange}
        autoComplete="current-password"
      />
    );
    const input = document.querySelector("#pw") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "abc" } });
    expect(onChange).toHaveBeenCalledWith("abc");
  });
});
