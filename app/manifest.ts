import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JobTrack by Nick Vivarelli",
    short_name: "JobTrack",
    description:
      "A private dashboard for tracking job applications, responses, interviews, offers, and notes.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#071019",
    theme_color: "#071019",
    orientation: "portrait-primary",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icons/jobtrack-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/jobtrack-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/jobtrack-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
