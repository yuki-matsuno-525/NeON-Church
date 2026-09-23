import type { Metadata } from "next";

/**
 * 解釈書の区画の題。下の1冊のページには、その本の題にサイト名を付けて出す。
 */
export const metadata: Metadata = {
  title: { default: "Commentaries", template: "%s | NeON Church" },
  description:
    "Read how the texts have been interpreted by Church Fathers, Jewish sages, Reformers, and the Mukyokai movement.",
};

export default function CommentaryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
