import type { MetadataRoute } from "next";

const SITE_URL = "https://aaditya-builds.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date("2026-08-24"),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
