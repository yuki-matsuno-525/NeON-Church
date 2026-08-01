import { routeMetadata } from "../routeMetadata";

export const metadata = routeMetadata.read;

export default function ReadLayout({ children }: { children: React.ReactNode }) {
  return children;
}
