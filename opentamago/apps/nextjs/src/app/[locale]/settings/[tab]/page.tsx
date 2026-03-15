"use client";

import { useState } from "react";
import { notFound } from "next/navigation";
import { use } from "react";
import { useTranslations } from "next-intl";
import { SettingsTabNav } from "../_components/tab-nav";
import { SettingsLeftPanel } from "../_components/left-panel";
import { PersonasTab } from "../_components/personas-tab";
import { ContactTab } from "../_components/contact-tab";
import { ApiKeysTab } from "~/components/settings";
import { DatabaseTab } from "~/components/database-tab";
import { useProviderSettings } from "~/lib/db/hooks";
import { ModelsTab } from "../_components/models-tab";
import { ALL_PROVIDERS, isValidProvider, type Provider } from "~/lib/ai";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Link } from "~/i18n/routing";

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

  const isProviderReady = (providerId: Provider) => {
    if (isLoading) return false;
    return checkProviderReady(providerId);
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
  isProviderReady: (providerId: Provider) => boolean;
}) {
  const t = useTranslations("settings");
  const { providers, setApiKey } = useProviderSettings();
  const [showModelPrompt, setShowModelPrompt] = useState(false);

  // Initialize all providers with empty strings to avoid uncontrolled → controlled transition
  const initialApiKeys = ALL_PROVIDERS.reduce(
    (acc, providerId) => {
      const providerSettings = providers.get(providerId);
      acc[providerId] = providerSettings?.apiKey ?? "";
      return acc;
    },
    {} as Record<Provider, string>
  );

  const handleSave = async (apiKeys: Record<Provider, string>) => {
    let hasNewKey = false;

    // Save each provider's API key
    for (const providerId of ALL_PROVIDERS) {
      const newKey = apiKeys[providerId];
      const currentKey = initialApiKeys[providerId];
      // Only update if the key changed
      if (newKey !== currentKey) {
        await setApiKey(providerId, newKey);
        // A key was added or changed (not just removed)
        if (newKey) {
          hasNewKey = true;
        }
      }
    }

    // Show modal prompting to configure models if a key was added/updated
    if (hasNewKey) {
      setShowModelPrompt(true);
    }
  };

  return (
    <div className="p-6">
      <ApiKeysTab
        initialApiKeys={initialApiKeys}
        isProviderReady={isProviderReady}
        onSave={handleSave}
      />

      <Dialog open={showModelPrompt} onOpenChange={setShowModelPrompt}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("apiKeysSaved.title")}</DialogTitle>
            <DialogDescription>
              {t("apiKeysSaved.description")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModelPrompt(false)}>
              {t("apiKeysSaved.later")}
            </Button>
            <Button asChild>
              <Link href="/settings/models" onClick={() => setShowModelPrompt(false)}>
                {t("apiKeysSaved.configureModels")}
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
