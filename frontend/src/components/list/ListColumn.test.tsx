import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ListColumn } from "./ListColumn";
import { ColumnTabs } from "./ColumnTabs";
import { ListPageHeader } from "./ListPageHeader";

describe("ListColumn", () => {
  it("見出し・件数・説明と中身を並べる", () => {
    render(
      <ListColumn icon="globe" tone="active" title="公開" count={3} description="誰でも読めます。">
        <p>カード</p>
      </ListColumn>
    );

    expect(screen.getByRole("heading", { name: "公開" })).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("誰でも読めます。")).toBeInTheDocument();
    expect(screen.getByText("カード")).toBeInTheDocument();
  });

  it("labelledBy を渡したときだけタブの中身として扱う", () => {
    const { rerender } = render(
      <ListColumn icon="globe" tone="ok" title="公開" count={0} description="説明">
        <p>カード</p>
      </ListColumn>
    );
    expect(screen.queryByRole("tabpanel")).not.toBeInTheDocument();

    rerender(
      <ListColumn icon="globe" tone="ok" title="公開" count={0} description="説明" id="p" labelledBy="tab-p">
        <p>カード</p>
      </ListColumn>
    );
    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
  });
});

describe("ColumnTabs", () => {
  const tabs = [
    { key: "a" as const, label: "解決済み", tone: "ok" as const, count: 2 },
    { key: "b" as const, label: "未解決", tone: "wait" as const, count: 5 },
  ];

  it("選ばれているタブだけを選択状態にし、件数を添える", () => {
    render(<ColumnTabs tabs={tabs} active="b" onChange={vi.fn()} label="質問" idPrefix="qa" />);

    expect(screen.getByRole("tab", { name: "未解決 (5)" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "解決済み (2)" })).toHaveAttribute("aria-selected", "false");
  });

  it("押すと切り替えを知らせる", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ColumnTabs tabs={tabs} active="b" onChange={onChange} label="質問" idPrefix="qa" />);

    await user.click(screen.getByRole("tab", { name: "解決済み (2)" }));
    expect(onChange).toHaveBeenCalledWith("a");
  });
});

describe("ListPageHeader", () => {
  it("見出し・説明・導線を並べる", () => {
    render(<ListPageHeader title="記事" description="読み物です。" action={<button>新規</button>} />);

    expect(screen.getByRole("heading", { level: 1, name: "記事" })).toBeInTheDocument();
    expect(screen.getByText("読み物です。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新規" })).toBeInTheDocument();
  });
});
