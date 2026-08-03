import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AsyncList } from "./AsyncList";

describe("AsyncList", () => {
  it("読み込み中は中身ではなくプレースホルダを出す", () => {
    render(
      <AsyncList loading error={null} isEmpty={false} emptyText="ありません">
        <p>中身</p>
      </AsyncList>
    );

    expect(screen.getByTestId("skeleton-list")).toBeInTheDocument();
    expect(screen.queryByText("中身")).not.toBeInTheDocument();
  });

  it("失敗を 0 件と混同せず、再試行できる", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <AsyncList
        loading={false}
        error="読み込みに失敗しました。"
        isEmpty
        emptyText="ありません"
        onRetry={onRetry}
      >
        <p>中身</p>
      </AsyncList>
    );

    expect(screen.getByRole("alert")).toHaveTextContent("読み込みに失敗しました。");
    // isEmpty が true でも「ありません」ではなく失敗を伝える
    expect(screen.queryByText("ありません")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "もう一度試す" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("文言を渡さない失敗は、どの画面でも同じ枠で伝える", () => {
    render(
      <AsyncList loading={false} error isEmpty emptyText="ありません" onRetry={vi.fn()}>
        <p>中身</p>
      </AsyncList>
    );

    expect(screen.getByRole("alert")).toHaveTextContent("読み込めませんでした");
    expect(screen.getByRole("button", { name: /もう一度試す/ })).toBeInTheDocument();
  });

  it("再試行の文言を画面側から差し替えられる", () => {
    render(
      <AsyncList loading={false} error="失敗" isEmpty={false} onRetry={vi.fn()} retryLabel="再試行">
        <p>中身</p>
      </AsyncList>
    );

    expect(screen.getByRole("button", { name: "再試行" })).toBeInTheDocument();
  });

  it("0 件のときは一行のメッセージを出す", () => {
    render(
      <AsyncList loading={false} error={null} isEmpty emptyText="まだありません">
        <p>中身</p>
      </AsyncList>
    );

    expect(screen.getByText("まだありません")).toBeInTheDocument();
    expect(screen.queryByText("中身")).not.toBeInTheDocument();
  });

  it("0 件のときの表示を丸ごと差し替えられる", () => {
    render(
      <AsyncList loading={false} error={null} isEmpty emptyText="まだありません" empty={<p>作ってみましょう</p>}>
        <p>中身</p>
      </AsyncList>
    );

    expect(screen.getByText("作ってみましょう")).toBeInTheDocument();
    expect(screen.queryByText("まだありません")).not.toBeInTheDocument();
  });

  it("データがあるときだけ中身を出す", () => {
    render(
      <AsyncList loading={false} error={null} isEmpty={false} emptyText="ありません">
        <p>中身</p>
      </AsyncList>
    );

    expect(screen.getByText("中身")).toBeInTheDocument();
  });
});
