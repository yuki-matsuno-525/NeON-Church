import type { Metadata } from "next";
import { routeMetadata } from "../routeMetadata";

/**
 * 翻訳プロジェクトの区画の題。
 *
 * template を書き直しているのは、この下にあるプロジェクト 1 件のページに
 * サイト名を付け直すため。
 */
export const metadata: Metadata = {
  ...routeMetadata.translations,
  title: { default: routeMetadata.translations.title, template: "%s | NeON Church" },
};

export default function TranslationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
