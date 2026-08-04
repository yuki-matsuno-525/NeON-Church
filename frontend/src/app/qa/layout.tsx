import type { Metadata } from "next";
import { routeMetadata } from "../routeMetadata";

/**
 * Q&A の区画の題。
 *
 * template を書き直しているのは、この下にある質問 1 件のページに
 * サイト名を付け直すため。
 */
export const metadata: Metadata = {
  ...routeMetadata.qa,
  title: { default: routeMetadata.qa.title, template: "%s | NeON Church" },
};

export default function QaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
