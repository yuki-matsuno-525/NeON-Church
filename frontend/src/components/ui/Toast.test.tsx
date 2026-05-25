import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ToastProvider, useToast } from "./Toast";

vi.mock("@/contexts/LanguageContext", () => ({
  useLang: () => ({ lang: "ja", setLang: vi.fn() }),
}));

function Harness({ type, message }: { type: "info" | "success" | "error"; message: string }) {
  const t = useToast();
  return (
    <button onClick={() => t.show(message, { type, duration: 100 })}>show</button>
  );
}

describe("Toast", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("show() でメッセージが表示され、duration 経過後に消える", async () => {
    render(
      <ToastProvider>
        <Harness type="success" message="保存しました" />
      </ToastProvider>
    );
    act(() => {
      screen.getByText("show").click();
    });
    expect(screen.getByText("保存しました")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.queryByText("保存しました")).not.toBeInTheDocument();
  });

  it("error タイプは role=alert を持つ", () => {
    render(
      <ToastProvider>
        <Harness type="error" message="失敗" />
      </ToastProvider>
    );
    act(() => {
      screen.getByText("show").click();
    });
    expect(screen.getByRole("alert")).toHaveTextContent("失敗");
  });

  it("Provider 外で useToast を呼んでも no-op で例外を出さない", () => {
    const Probe = () => {
      const t = useToast();
      t.show("x");
      return null;
    };
    expect(() => render(<Probe />)).not.toThrow();
  });
});
