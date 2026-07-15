import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NeON Church",
    short_name: "NeON Church",
    description:
      "Not a church as an institution, but an open field where texts and interpretations intersect.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/img/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/img/icon-512.png", sizes: "512x512", type: "image/png" },
      // maskable: Android がアイコンを円形などに切り抜く形状用。十字を縮小して切り代の余白を確保した別画像。
      { src: "/img/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
