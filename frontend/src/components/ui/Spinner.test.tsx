import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Spinner } from "./Spinner";

vi.mock("@/contexts/LanguageContext", () => ({
  useLang: () => ({ lang: "ja", setLang: vi.fn() }),
}));

describe("Spinner", () => {
  it("role=status と SR ラベルが付く", () => {
    render(<Spinner label="読み込み中" />);
    const el = screen.getByRole("status");
    expect(el).toBeInTheDocument();
    expect(screen.getByText("読み込み中")).toBeInTheDocument();
  });

  it("label 未指定なら t.loading をフォールバック", () => {
    render(<Spinner />);
    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
  });
});
