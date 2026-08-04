import type { Metadata } from "next";
import { routeMetadata } from "../routeMetadata";

/**
 * 記事の区画の題。
 *
 * template を書き直しているのは、この下にある記事 1 件のページに
 * サイト名を付け直すため。ここで題を文字列だけにすると、下のページの題が
 * 「◯◯」だけになり、共有したときにどのサイトのものか分からなくなる。
 */
export const metadata: Metadata = {
  ...routeMetadata.articles,
  title: { default: routeMetadata.articles.title, template: "%s | NeON Church" },
};

export default function ArticlesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
