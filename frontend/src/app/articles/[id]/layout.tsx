import { routeMetadata } from "../../routeMetadata";

export const metadata = routeMetadata.article;

export default function ArticleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
