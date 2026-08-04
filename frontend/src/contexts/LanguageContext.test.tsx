import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { LanguageProvider, useLang } from "./LanguageContext";

// jsdom の document.cookie は「書いた分が積み上がる」本物に近い挙動をするので、
// テストごとに空へ戻してから確かめる。
function clearCookies() {
  Object.defineProperty(document, "cookie", { value: "", writable: true, configurable: true });
}

function Probe() {
  const { lang, setLang } = useLang();
  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <button onClick={() => setLang("en")}>en</button>
    </div>
  );
}

describe("LanguageProvider", () => {
  beforeEach(() => {
    clearCookies();
    localStorage.clear();
  });

  it("サーバーが渡した初期言語をそのまま使う", () => {
    render(
      <LanguageProvider initialLang="en">
        <Probe />
      </LanguageProvider>,
    );
    expect(screen.getByTestId("lang")).toHaveTextContent("en");
  });

  it("localStorage に別の言語が残っていても、初期言語を上書きしない", () => {
    localStorage.setItem("lang", "en");
    render(
      <LanguageProvider initialLang="ja">
        <Probe />
      </LanguageProvider>,
    );
    expect(screen.getByTestId("lang")).toHaveTextContent("ja");
  });

  it("表示のたびに Cookie の期限を延ばす", () => {
    render(
      <LanguageProvider initialLang="en">
        <Probe />
      </LanguageProvider>,
    );
    expect(document.cookie).toContain("neon_lang=en");
  });

  it("切り替えると Cookie と html の lang が変わり、localStorage は使わない", () => {
    render(
      <LanguageProvider initialLang="ja">
        <Probe />
      </LanguageProvider>,
    );

    act(() => {
      screen.getByText("en").click();
    });

    expect(screen.getByTestId("lang")).toHaveTextContent("en");
    expect(document.cookie).toContain("neon_lang=en");
    expect(document.documentElement.lang).toBe("en");
    expect(localStorage.getItem("lang")).toBeNull();
  });
});
