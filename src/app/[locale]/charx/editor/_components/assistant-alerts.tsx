"use client";

import { memo } from "react";
import { AlertCircle, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "~/i18n/routing";
import { Button } from "~/components/ui/button";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { useApiKeyContext, useErrorContext } from "./assistant-context";

// API Key Warning - subscribes only to missingApiKey
export const AssistantApiKeyWarning = memo(function AssistantApiKeyWarning() {
  const t = useTranslations("charxEditor.assistant");
  const { missingApiKey } = useApiKeyContext();

  if (!missingApiKey) return null;

  return (
    <div className="px-4 pt-4 shrink-0">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-sm flex items-center justify-between gap-2">
          <span>
            {t("apiKeyRequired", { provider: missingApiKey.providerName })}
          </span>
          <Button variant="outline" size="sm" asChild>
            <Link href="/settings/api-keys">
              <Settings className="h-4 w-4 mr-1" />
              {t("openSettings")}
            </Link>
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
});

// Error Alert - subscribes only to error
export const AssistantErrorAlert = memo(function AssistantErrorAlert() {
  const { error } = useErrorContext();

  if (!error) return null;

  return (
    <div className="px-4 pb-2 shrink-0">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-sm">{error}</AlertDescription>
      </Alert>
    </div>
  );
});
