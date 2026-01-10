export function WebApplicationJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "OpenTamago",
    url: "https://open.tamago.chat",
    applicationCategory: "EntertainmentApplication",
    operatingSystem: "Web Browser",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description:
      "Privacy-first open-source platform for AI character viewing, P2P sharing, and multi-character chat. View CharX files locally, share via WebRTC, and chat with multiple AI characters.",
    featureList: [
      "CharX file viewer with lorebook support",
      "P2P file sharing via WebRTC",
      "Multi-character AI chat sessions",
      "100% browser-based processing",
      "Multi-language support (EN, KO, JA)",
      "Password-protected sharing",
      "QR code sharing",
    ],
    screenshot: "https://open.tamago.chat/og-image.png",
    softwareVersion: "1.0.0",
    author: {
      "@type": "Organization",
      name: "OpenTamago",
      url: "https://open.tamago.chat",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function OrganizationJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "OpenTamago",
    url: "https://open.tamago.chat",
    logo: "https://open.tamago.chat/favicon.ico",
    sameAs: ["https://github.com/opentamago"],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function WebsiteJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "OpenTamago",
    url: "https://open.tamago.chat",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://open.tamago.chat/charx?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
    inLanguage: ["en", "ko", "ja"],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
