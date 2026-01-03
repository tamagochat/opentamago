export function WebApplicationJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "OpenTamago",
    url: "https://opentamago.com",
    applicationCategory: "EntertainmentApplication",
    operatingSystem: "Web Browser",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description:
      "Open source AI character viewer and P2P sharing platform. View CharX files, share characters, and chat with AI.",
    featureList: [
      "CharX file viewer",
      "P2P file sharing",
      "AI character chat",
      "Multi-language support",
    ],
    screenshot: "https://opentamago.com/og-image.png",
    softwareVersion: "1.0.0",
    author: {
      "@type": "Organization",
      name: "OpenTamago",
      url: "https://opentamago.com",
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
    url: "https://opentamago.com",
    logo: "https://opentamago.com/favicon.ico",
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
    url: "https://opentamago.com",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://opentamago.com/charx?q={search_term_string}",
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
