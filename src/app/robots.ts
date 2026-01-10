import { type MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://open.tamago.chat";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/trpc/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
