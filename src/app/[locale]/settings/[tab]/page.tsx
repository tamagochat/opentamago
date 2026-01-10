"use client";

import { notFound } from "next/navigation";
import { use } from "react";
import { SettingsTabNav } from "../_components/tab-nav";
import { SettingsLeftPanel } from "../_components/left-panel";
import { PersonasTab } from "../_components/personas-tab";
import { ContactTab } from "../_components/contact-tab";
import { ApiKeysTab } from "~/components/settings";
import { DatabaseTab } from "~/components/database-tab";
import { useProviderSettings } from "~/lib/db/hooks";
import { ModelsTab } from "../_components/models-tab";
import { ALL_PROVIDERS, type Provider } from "~/lib/ai";

const VALID_TABS = ["personas", "api-keys", "models", "database", "contact"] as const;
type TabType = (typeof VALID_TABS)[number];

type Props = {
  params: Promise<{ locale: string; tab: string }>;
};

export default function SettingsTabPage({ params }: Props) {
  const { tab } = use(params);

  // Validate tab
  if (!VALID_TABS.includes(tab as TabType)) {
    notFound();
  }

  const currentTab = tab as TabType;

  return (
    <>
      {/* Tab navigation */}
      <SettingsTabNav currentTab={currentTab} />

      {/* Mobile left panel - shown only on mobile */}
      <div className="lg:hidden mb-6">
        <SettingsLeftPanel compact />
      </div>

      {/* Tab content */}
      <div className="mt-6">
        <TabContent tab={currentTab} />
      </div>
    </>
  );
}

function TabContent({ tab }: { tab: TabType }) {
  const { providers, isLoading, isProviderReady: checkProviderReady } = useProviderSettings();

  const isProviderReady = (providerId: string) => {
    if (isLoading) return false;
    return checkProviderReady(providerId as any);
  };

  switch (tab) {
    case "personas":
      return <PersonasTab />;
    case "api-keys":
      return (
        <ApiKeysTabWrapper isProviderReady={isProviderReady} />
      );
    case "models":
      return <ModelsTab isProviderReady={isProviderReady} />;
    case "database":
      return <DatabaseTab />;
    case "contact":
      return <ContactTab />;
    default:
      return null;
  }
}

function ApiKeysTabWrapper({
  isProviderReady,
}: {
  isProviderReady: (providerId: string) => boolean;
}) {
  const { providers } = useProviderSettings();

  // Initialize all providers with empty strings to avoid uncontrolled → controlled transition
  const initialApiKeys = ALL_PROVIDERS.reduce(
    (acc, providerId) => {
      const providerSettings = providers.get(providerId);
      acc[providerId] = providerSettings?.apiKey ?? "";
      return acc;
    },
    {} as Record<Provider, string>
  );

  return (
    <div className="p-6">
      <ApiKeysTab
        initialApiKeys={initialApiKeys}
        isProviderReady={isProviderReady as any}
      />
    </div>
  );
}
