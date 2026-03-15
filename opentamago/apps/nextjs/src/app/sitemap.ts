import { type MetadataRoute } from "next";
import { locales } from "~/i18n/config";

const baseUrl = "https://open.tamago.chat";

const staticRoutes = [
  { path: "", priority: 1.0, changeFrequency: "weekly" as const },
  { path: "/charx", priority: 0.9, changeFrequency: "weekly" as const },
  { path: "/charx/editor", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/pokebox", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/p2p/share", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/p2p/connect", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/how-it-works", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/settings", priority: 0.3, changeFrequency: "monthly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const route of staticRoutes) {
    for (const locale of locales) {
      const localePath = locale === "en" ? "" : `/${locale}`;
      const url = `${baseUrl}${localePath}${route.path}`;

      entries.push({
        url,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
      });
    }
  }

  return entries;
}
