import type { MetadataRoute } from "next";

// Installed to a home screen, this is what the app calls itself and opens as.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zenote",
    short_name: "Zenote",
    description: "Read your notes online",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
