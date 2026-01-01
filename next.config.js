/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import("next").NextConfig} */
const config = {
  async rewrites() {
    const defaultLocale = "en";

    return [
      // Rewrite root to default locale
      {
        source: "/",
        destination: `/${defaultLocale}`,
      },
      // Rewrite routes without locale prefix to default locale
      // Matches paths that don't start with api, trpc, _next, _vercel, or locale prefixes
      {
        source: "/:path((?!api|trpc|_next|_vercel|en|ko|ja).+)",
        destination: `/${defaultLocale}/:path*`,
      },
    ];
  },
};

export default withNextIntl(config);
