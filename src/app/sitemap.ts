import { type MetadataRoute } from "next";

const baseUrl = "https://opentamago.vercel.app";
const locales = ["en", "ko", "ja"] as const;

// Static routes that exist for all locales
const staticRoutes = [
  { path: "", priority: 1.0, changeFrequency: "weekly" as const },
  { path: "/charx", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/p2p/share", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/p2p/connect", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/how-it-works", priority: 0.7, changeFrequency: "monthly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const route of staticRoutes) {
    for (const locale of locales) {
      // English uses root path, other locales use prefix
      const localePath = locale === "en" ? "" : `/${locale}`;
      const url = `${baseUrl}${localePath}${route.path}`;

      entries.push({
        url,
        lastModified: new Date(),
        changeFrequency: route.changeFrequency,
        priority: route.priority,
      });
    }
  }

  return entries;
}
