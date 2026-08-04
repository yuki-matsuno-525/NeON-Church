import type { Metadata } from "next";
import { routeMetadata } from "../routeMetadata";

/**
 * プロフィールの区画の題。
 *
 * template を書き直しているのは、この下にある他の人のプロフィールにも
 * サイト名を付け直すため。
 */
export const metadata: Metadata = {
  ...routeMetadata.profile,
  title: { default: routeMetadata.profile.title, template: "%s | NeON Church" },
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
