"use client";

import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Check } from "lucide-react";
import {
  VOICE_PROVIDERS,
  PROVIDER_CONFIGS,
  VOICE_MODEL_CONFIGS,
  GEMINI_TTS_VOICES,
  GEMINI_TTS_LANGUAGES,
  DEFAULT_GEMINI_VOICE,
  DEFAULT_TTS_LANGUAGE,
  DEFAULT_ELEVENLABS_VOICE_ID,
  type VoiceProvider,
} from "~/lib/ai";

export interface VoiceTabSaveData {
  enabled: boolean;
  provider: VoiceProvider;
  model: string;
  voiceName?: string;
  voiceLanguage?: string;
}

export interface VoiceTabRef {
  getSaveData: () => VoiceTabSaveData;
}

interface VoiceTabProps {
  initialEnabled: boolean;
  initialProvider: VoiceProvider;
  initialModel: string;
  initialVoiceName?: string;
  initialVoiceLanguage?: string;
  isProviderReady: (providerId: VoiceProvider) => boolean;
}

export const VoiceTab = forwardRef<VoiceTabRef, VoiceTabProps>(
  function VoiceTab({
    initialEnabled,
    initialProvider,
    initialModel,
    initialVoiceName,
    initialVoiceLanguage,
    isProviderReady
  }, ref) {
    const [enabled, setEnabled] = useState(initialEnabled);
    const [voiceProvider, setVoiceProvider] = useState<VoiceProvider>(initialProvider);
    const [voiceModel, setVoiceModel] = useState(initialModel);
    const [voiceName, setVoiceName] = useState(initialVoiceName ?? DEFAULT_GEMINI_VOICE);
    const [voiceLanguage, setVoiceLanguage] = useState(initialVoiceLanguage ?? DEFAULT_TTS_LANGUAGE);
    // ElevenLabs uses voiceName field for voice ID
    const [elevenLabsVoiceId, setElevenLabsVoiceId] = useState(
      initialProvider === "elevenlabs" ? (initialVoiceName ?? DEFAULT_ELEVENLABS_VOICE_ID) : DEFAULT_ELEVENLABS_VOICE_ID
    );

    // Sync with initial values when they change
    useEffect(() => {
      setEnabled(initialEnabled);
    }, [initialEnabled]);

    useEffect(() => {
      setVoiceProvider(initialProvider);
    }, [initialProvider]);

    useEffect(() => {
      setVoiceModel(initialModel);
    }, [initialModel]);

    useEffect(() => {
      if (initialProvider === "gemini") {
        setVoiceName(initialVoiceName ?? DEFAULT_GEMINI_VOICE);
      } else if (initialProvider === "elevenlabs") {
        setElevenLabsVoiceId(initialVoiceName ?? DEFAULT_ELEVENLABS_VOICE_ID);
      }
    }, [initialVoiceName, initialProvider]);

    useEffect(() => {
      setVoiceLanguage(initialVoiceLanguage ?? DEFAULT_TTS_LANGUAGE);
    }, [initialVoiceLanguage]);

    const isGemini = voiceProvider === "gemini";
    const isElevenLabs = voiceProvider === "elevenlabs";

    useImperativeHandle(ref, () => ({
      getSaveData: () => ({
        enabled,
        provider: voiceProvider,
        model: voiceModel,
        voiceName: isGemini ? voiceName : isElevenLabs ? elevenLabsVoiceId : undefined,
        voiceLanguage: isGemini ? voiceLanguage : undefined,
      }),
    }));

    return (
      <div className="p-4 space-y-4">
        <div>
          <h3 className="font-medium mb-1">Text-to-Speech</h3>
          <p className="text-muted-foreground text-xs">
            Configure AI providers and models for voice synthesis.
          </p>
        </div>

        <div className="space-y-4 p-3 border rounded-lg bg-muted/20">
          {/* Enabled Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="voice-enabled">Enabled</Label>
              <p className="text-xs text-muted-foreground">Enable or disable voice synthesis</p>
            </div>
            <Switch
              id="voice-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="voice-provider">Provider</Label>
            <Select value={voiceProvider} onValueChange={(v) => setVoiceProvider(v as VoiceProvider)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VOICE_PROVIDERS.map((providerId) => {
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

          <div className="grid gap-2">
            <Label htmlFor="voice-model">Model</Label>
            <Input
              id="voice-model"
              list="voice-models"
              value={voiceModel}
              onChange={(e) => setVoiceModel(e.target.value)}
              placeholder="Enter or select a model"
            />
            <datalist id="voice-models">
              {VOICE_MODEL_CONFIGS[voiceProvider]?.models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </datalist>
          </div>

          {/* Gemini-specific TTS settings */}
          {isGemini && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="voice-name">Voice</Label>
                <Select value={voiceName} onValueChange={setVoiceName}>
                  <SelectTrigger id="voice-name">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GEMINI_TTS_VOICES.map((voice) => (
                      <SelectItem key={voice.id} value={voice.id}>
                        <span className="flex items-center gap-2">
                          {voice.name}
                          <span className="text-muted-foreground text-xs">
                            ({voice.description})
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select a prebuilt voice for Gemini TTS
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="voice-language">Language</Label>
                <Select value={voiceLanguage} onValueChange={setVoiceLanguage}>
                  <SelectTrigger id="voice-language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GEMINI_TTS_LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Language for text-to-speech output
                </p>
              </div>
            </>
          )}

          {/* ElevenLabs-specific TTS settings */}
          {isElevenLabs && (
            <div className="grid gap-2">
              <Label htmlFor="elevenlabs-voice-id">Voice ID</Label>
              <Input
                id="elevenlabs-voice-id"
                value={elevenLabsVoiceId}
                onChange={(e) => setElevenLabsVoiceId(e.target.value)}
                placeholder={DEFAULT_ELEVENLABS_VOICE_ID}
              />
              <p className="text-xs text-muted-foreground">
                Enter an ElevenLabs voice ID. Find voices at{" "}
                <a
                  href="https://elevenlabs.io/app/voice-library"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Voice Library
                </a>
                . Default: George ({DEFAULT_ELEVENLABS_VOICE_ID})
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }
);
