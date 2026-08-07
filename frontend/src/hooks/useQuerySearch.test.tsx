import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useEffect, useReducer } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useQuerySearch } from "./useQuerySearch";
import { ClearableSearchInput } from "@/components/ui/ClearableSearchInput";

// 本物のブラウザーと同じく「router.replace を呼んでから URL が変わるまでに間がある」状況を作る。
// この遅れこそが、入力欄が古い値に巻き戻る原因だった。
const URL_LAG_MS = 50;

const h = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  return {
    listeners,
    lag: { current: 50 },
    params: { current: new URLSearchParams() },
    replace: vi.fn(),
    /** URL が実際に変わったことにして、useSearchParams を使う画面へ知らせる */
    commit(url: string) {
      h.params.current = new URLSearchParams(url.split("?")[1] ?? "");
      listeners.forEach((notify) => notify());
    },
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: h.replace }),
  useSearchParams: () => {
    const [, force] = useReducer((n: number) => n + 1, 0);
    useEffect(() => {
      h.listeners.add(force);
      return () => {
        h.listeners.delete(force);
      };
    }, []);
    return h.params.current;
  },
}));

function Harness() {
  const { value, setValue } = useQuerySearch("/qa");
  return (
    <ClearableSearchInput
      value={value}
      onChange={setValue}
      placeholder="検索"
      ariaLabel="検索"
    />
  );
}

/** replace が呼ばれてから URL_LAG_MS 遅れて URL が反映される、という時間の進み方 */
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

describe("useQuerySearch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    h.params.current = new URLSearchParams();
    h.lag.current = URL_LAG_MS;
    h.replace.mockReset();
    h.replace.mockImplementation((url: string) => {
      setTimeout(() => h.commit(url), h.lag.current);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("URL 反映を待っている間に打ち足した文字が消えない", () => {
    render(<Harness />);
    const input = screen.getByRole("searchbox", { name: "検索" });

    fireEvent.change(input, { target: { value: "キリ" } });
    advance(300); // 手が止まったので URL へ書き出す
    expect(h.replace).toHaveBeenLastCalledWith("/qa?q=%E3%82%AD%E3%83%AA", { scroll: false });

    // URL がまだ "キリ" のうちに打ち足す
    fireEvent.change(input, { target: { value: "キリス" } });
    advance(URL_LAG_MS); // ここで古い "キリ" が届く

    expect(input).toHaveValue("キリス");
  });

  it("URL 反映が2回ぶん溜まっても、古いほうで巻き戻らない", () => {
    h.lag.current = 400; // 反映が debounce より遅い＝書き出しが2本重なる
    render(<Harness />);
    const input = screen.getByRole("searchbox", { name: "検索" });

    fireEvent.change(input, { target: { value: "キリ" } });
    advance(300); // 1本目を書き出す（まだ URL は変わらない）
    fireEvent.change(input, { target: { value: "キリス" } });
    advance(300); // 2本目を書き出す
    advance(100); // ここで1本目の古い "キリ" が届く

    expect(input).toHaveValue("キリス");

    advance(300); // 2本目の "キリス" も届く
    expect(input).toHaveValue("キリス");
  });

  it("消した文字が戻ってこない", () => {
    render(<Harness />);
    const input = screen.getByRole("searchbox", { name: "検索" });

    fireEvent.change(input, { target: { value: "マタイ" } });
    advance(300 + URL_LAG_MS);

    fireEvent.change(input, { target: { value: "マタ" } });
    fireEvent.change(input, { target: { value: "マ" } });
    fireEvent.change(input, { target: { value: "" } });
    advance(300 + URL_LAG_MS);

    expect(input).toHaveValue("");
    expect(h.replace).toHaveBeenLastCalledWith("/qa", { scroll: false });
  });

  it("変換の確定と URL 反映が重なっても二重入力にならない", () => {
    render(<Harness />);
    const input = screen.getByRole("searchbox", { name: "検索" });

    fireEvent.change(input, { target: { value: "キ" } });
    advance(300); // "キ" を URL へ書き出す

    fireEvent.compositionStart(input);
    fireEvent.change(input, { target: { value: "キきりすと" } });
    advance(URL_LAG_MS); // 変換の途中で古い "キ" が届く
    expect(input).toHaveValue("キきりすと");

    fireEvent.compositionEnd(input, { target: { value: "キキリスト" } });
    expect(input).toHaveValue("キキリスト");

    advance(300 + URL_LAG_MS);
    expect(input).toHaveValue("キキリスト");
  });

  it("戻る・進むで URL が変わったときは入力欄も合わせる", () => {
    render(<Harness />);
    const input = screen.getByRole("searchbox", { name: "検索" });

    fireEvent.change(input, { target: { value: "ルカ" } });
    advance(300 + URL_LAG_MS);
    h.replace.mockClear();

    act(() => h.commit("/qa?q=ヨハネ")); // ブラウザーの戻る操作に相当

    expect(input).toHaveValue("ヨハネ");
    advance(300 + URL_LAG_MS);
    expect(h.replace).not.toHaveBeenCalled(); // 書き戻しで replace を誘発しない
  });

  it("他のパラメーターを消さない", () => {
    h.params.current = new URLSearchParams("tag=t1");
    render(<Harness />);

    fireEvent.change(screen.getByRole("searchbox", { name: "検索" }), {
      target: { value: "Luke" },
    });
    advance(300);

    expect(h.replace).toHaveBeenLastCalledWith("/qa?tag=t1&q=Luke", { scroll: false });
  });
});
