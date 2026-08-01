import { routeMetadata } from "../routeMetadata";

export const metadata = routeMetadata.articles;

export default function ArticlesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
