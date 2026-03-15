"use client";

import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { useTranslations } from "next-intl";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import { Switch } from "~/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { Check, ChevronDown } from "lucide-react";
import {
  HARM_CATEGORIES,
  BLOCK_THRESHOLDS,
  HARM_CATEGORY_LABELS,
  DEFAULT_SAFETY_SETTINGS,
  TEXT_PROVIDERS,
  PROVIDER_CONFIGS,
  TEXT_MODEL_CONFIGS,
  type SafetySettings,
  type HarmCategory,
  type BlockThreshold,
  type TextProvider,
} from "~/lib/ai";
import { cn } from "~/lib/utils";
import { locales, localeNames } from "~/i18n/config";

/** Text scenario settings state */
export interface TextScenarioState {
  enabled: boolean;
  provider: TextProvider;
  model: string;
  temperature: string;
  maxTokens: string;
  thinking: boolean;
  safetySettings: SafetySettings;
  targetLanguage?: string;
}

export interface TextScenarioSectionRef {
  getSaveData: () => TextScenarioState;
}

interface TextScenarioSectionProps {
  title: string;
  description: string;
  idPrefix: string;
  initialState: TextScenarioState;
  defaultOpen?: boolean;
  isProviderReady: (providerId: TextProvider) => boolean;
  /** Whether this scenario can be disabled. Defaults to true. */
  canBeDisabled?: boolean;
  /** Hide the thinking mode toggle */
  hideThinking?: boolean;
}

export const TextScenarioSection = forwardRef<TextScenarioSectionRef, TextScenarioSectionProps>(
  function TextScenarioSection({ title, description, idPrefix, initialState, defaultOpen = false, isProviderReady, canBeDisabled = true, hideThinking = false }, ref) {
    const t = useTranslations("chat.settings");
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const [state, setState] = useState<TextScenarioState>(initialState);

    // Sync with initial values when they change
    useEffect(() => {
      setState(initialState);
    }, [initialState]);

    useImperativeHandle(ref, () => ({
      getSaveData: () => state,
    }));

    const updateState = (updates: Partial<TextScenarioState>) => {
      setState((prev) => ({ ...prev, ...updates }));
    };

    const handleSafetyChange = (category: HarmCategory, threshold: BlockThreshold) => {
      updateState({
        safetySettings: {
          ...state.safetySettings,
          [category]: threshold,
        },
      });
    };

    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between p-3 border rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors">
          <div className="text-left">
            <h4 className="font-medium text-sm">{title}</h4>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-4">
          {/* Enabled Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor={`${idPrefix}-enabled`}>Enabled</Label>
              <p className="text-xs text-muted-foreground">
                {canBeDisabled ? "Enable or disable this scenario" : "This scenario cannot be disabled"}
              </p>
            </div>
            <Switch
              id={`${idPrefix}-enabled`}
              checked={state.enabled}
              onCheckedChange={(checked) => updateState({ enabled: checked })}
              disabled={!canBeDisabled}
            />
          </div>

          {/* Provider Selection */}
          <div className="grid gap-2">
            <Label htmlFor={`${idPrefix}-provider`}>Provider</Label>
            <Select
              value={state.provider}
              onValueChange={(v) => updateState({ provider: v as TextProvider, model: "" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEXT_PROVIDERS.map((providerId) => {
                  const config = PROVIDER_CONFIGS[providerId];
                  const isReady = isProviderReady(providerId);
                  return (
                    <SelectItem key={providerId} value={providerId}>
                      <span className="flex items-center gap-2">
                        {config.name}
                        {isReady && <Check className="h-3 w-3 text-green-500" />}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Model Selection */}
          <div className="grid gap-2">
            <Label htmlFor={`${idPrefix}-model`}>Model</Label>
            <Input
              id={`${idPrefix}-model`}
              list={`${idPrefix}-models`}
              value={state.model}
              onChange={(e) => updateState({ model: e.target.value })}
              placeholder="Enter or select a model"
            />
            <datalist id={`${idPrefix}-models`}>
              {TEXT_MODEL_CONFIGS[state.provider]?.models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </datalist>
          </div>

          {/* Generation Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor={`${idPrefix}-temperature`}>{t("temperature")}</Label>
              <Input
                id={`${idPrefix}-temperature`}
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={state.temperature}
                onChange={(e) => updateState({ temperature: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${idPrefix}-maxTokens`}>{t("maxTokens")}</Label>
              <Input
                id={`${idPrefix}-maxTokens`}
                type="number"
                min="1"
                max="65536"
                value={state.maxTokens}
                onChange={(e) => updateState({ maxTokens: e.target.value })}
              />
            </div>
          </div>

          {/* Thinking Mode Toggle */}
          {!hideThinking && (
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor={`${idPrefix}-thinking`}>Thinking Mode</Label>
                <p className="text-xs text-muted-foreground">Enable reasoning for supported models</p>
              </div>
              <Checkbox
                id={`${idPrefix}-thinking`}
                checked={state.thinking}
                onCheckedChange={(checked) => updateState({ thinking: checked === true })}
              />
            </div>
          )}

          {/* Target Language (Translation only) */}
          {idPrefix === "translation" && (
            <div className="grid gap-2">
              <Label htmlFor={`${idPrefix}-targetLanguage`}>Target Language</Label>
              <Select
                value={state.targetLanguage ?? "en"}
                onValueChange={(v) => updateState({ targetLanguage: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select target language" />
                </SelectTrigger>
                <SelectContent>
                  {locales.map((locale) => (
                    <SelectItem key={locale} value={locale}>
                      {localeNames[locale]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Default language for message translation</p>
            </div>
          )}

          {/* Safety Settings (Gemini only) */}
          {state.provider === "gemini" && (
            <div className="space-y-3 pt-2 border-t">
              <p className="text-muted-foreground text-xs">{t("safetyDescription")}</p>
              {HARM_CATEGORIES.map((category) => (
                <div key={category} className="grid gap-2">
                  <Label htmlFor={`${idPrefix}-${category}`}>{HARM_CATEGORY_LABELS[category]}</Label>
                  <Select
                    value={state.safetySettings[category]}
                    onValueChange={(value: BlockThreshold) => handleSafetyChange(category, value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BLOCK_THRESHOLDS.map((threshold) => (
                        <SelectItem key={threshold.id} value={threshold.id}>
                          {threshold.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    );
  }
);
