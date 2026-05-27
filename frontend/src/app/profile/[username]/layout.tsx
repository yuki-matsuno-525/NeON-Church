import type { Metadata } from "next";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const title = `@${username}`;
  const description = `${username} さんのコメント・お気に入りを見る。NeON Church では聖書・外典・偽典を読み、語り合うことができる。`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default function UserProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
