"use client";

import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { Eye, EyeOff, Check, ExternalLink } from "lucide-react";
import {
  ALL_PROVIDERS,
  PROVIDER_CONFIGS,
  type Provider,
} from "~/lib/ai";
import { cn } from "~/lib/utils";

export interface ApiKeysTabRef {
  getSaveData: () => Record<Provider, string>;
}

interface ApiKeysTabProps {
  initialApiKeys: Record<Provider, string>;
  isProviderReady: (providerId: Provider) => boolean;
}

export const ApiKeysTab = forwardRef<ApiKeysTabRef, ApiKeysTabProps>(
  function ApiKeysTab({ initialApiKeys, isProviderReady }, ref) {
    const [providerApiKeys, setProviderApiKeys] = useState<Record<Provider, string>>(initialApiKeys);
    const [showApiKey, setShowApiKey] = useState(false);
    const [activeProviderTab, setActiveProviderTab] = useState<Provider>("gemini");

    // Sync with initial values when they change
    useEffect(() => {
      setProviderApiKeys(initialApiKeys);
    }, [initialApiKeys]);

    useImperativeHandle(ref, () => ({
      getSaveData: () => providerApiKeys,
    }));

    const handleProviderApiKeyChange = (providerId: Provider, value: string) => {
      setProviderApiKeys((prev) => ({ ...prev, [providerId]: value }));
    };

    const config = PROVIDER_CONFIGS[activeProviderTab];

    return (
      <div className="p-4 space-y-4">
        <div>
          <h3 className="font-medium mb-1">Configure API Keys</h3>
          <p className="text-muted-foreground text-xs">
            Add your API keys for each provider. Keys are stored locally in your browser.
          </p>
        </div>

        {/* Provider Tabs */}
        <div className="flex flex-wrap gap-1">
          {ALL_PROVIDERS.map((providerId) => {
            const providerConfig = PROVIDER_CONFIGS[providerId];
            const isReady = isProviderReady(providerId);
            return (
              <button
                key={providerId}
                type="button"
                onClick={() => setActiveProviderTab(providerId)}
                className={cn(
                  "px-3 py-1.5 text-xs rounded-md transition-colors relative",
                  activeProviderTab === providerId
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80",
                  isReady && activeProviderTab !== providerId && "ring-1 ring-green-500"
                )}
              >
                {providerConfig.name}
                {isReady && (
                  <Check className="absolute -top-1 -right-1 h-3 w-3 text-green-500" />
                )}
              </button>
            );
          })}
        </div>
        <p className="text-muted-foreground text-xs">
          Want to use a different AI provider?{" "}
          <a
            href="https://github.com/tamagochat/opentamago/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Create a GitHub issue
          </a>{" "}
          to request support.
        </p>

        {/* Provider-specific settings (API Key only) */}
        <div className="space-y-4 p-3 border rounded-lg bg-muted/20">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">{config.name}</h4>
            <a
              href={config.apiKeyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary flex items-center gap-1 hover:underline"
            >
              Get API Key <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* API Key Input */}
          <div className="grid gap-2">
            <Label htmlFor={`apiKey-${activeProviderTab}`}>API Key</Label>
            <div className="relative">
              <Input
                id={`apiKey-${activeProviderTab}`}
                type={showApiKey ? "text" : "password"}
                value={providerApiKeys[activeProviderTab]}
                onChange={(e) => handleProviderApiKeyChange(activeProviderTab, e.target.value)}
                placeholder={config.apiKeyPlaceholder}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
