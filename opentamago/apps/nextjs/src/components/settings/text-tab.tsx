"use client";

import { useRef, useImperativeHandle, forwardRef } from "react";
import {
  TextScenarioSection,
  type TextScenarioSectionRef,
  type TextScenarioState,
} from "./text-scenario-section";
import type { TextProvider } from "~/lib/ai";

export type { TextScenarioState };

export interface TextTabSaveData {
  chat: TextScenarioState;
  translation: TextScenarioState;
  hitmeup: TextScenarioState;
  aibot: TextScenarioState;
}

export interface TextTabRef {
  getSaveData: () => TextTabSaveData;
}

interface TextTabProps {
  initialChat: TextScenarioState;
  initialTranslation: TextScenarioState;
  initialHitmeup: TextScenarioState;
  initialAibot: TextScenarioState;
  isProviderReady: (providerId: TextProvider) => boolean;
  /** Hide specific scenarios (e.g., ["translation"] to hide translation) */
  hideScenarios?: string[];
  /** Hide thinking toggle in all scenarios */
  hideThinking?: boolean;
}

export const TextTab = forwardRef<TextTabRef, TextTabProps>(
  function TextTab({ initialChat, initialTranslation, initialHitmeup, initialAibot, isProviderReady, hideScenarios = [], hideThinking = false }, ref) {
    const chatRef = useRef<TextScenarioSectionRef>(null);
    const translationRef = useRef<TextScenarioSectionRef>(null);
    const hitmeupRef = useRef<TextScenarioSectionRef>(null);
    const aibotRef = useRef<TextScenarioSectionRef>(null);

    useImperativeHandle(ref, () => ({
      getSaveData: () => ({
        chat: chatRef.current?.getSaveData() ?? initialChat,
        translation: translationRef.current?.getSaveData() ?? initialTranslation,
        hitmeup: hitmeupRef.current?.getSaveData() ?? initialHitmeup,
        aibot: aibotRef.current?.getSaveData() ?? initialAibot,
      }),
    }));

    const showChat = !hideScenarios.includes("chat");
    const showTranslation = !hideScenarios.includes("translation");
    const showHitmeup = !hideScenarios.includes("hitmeup");
    const showAibot = !hideScenarios.includes("aibot");

    return (
      <div className="p-4 space-y-4">
        <div>
          <h3 className="font-medium mb-1">Text Generation Settings</h3>
          <p className="text-muted-foreground text-xs">
            Configure AI providers and models for different text generation scenarios.
          </p>
        </div>

        {showChat && (
          <TextScenarioSection
            ref={chatRef}
            title="Chat"
            description="Main roleplay and conversation generation"
            idPrefix="chat"
            initialState={initialChat}
            defaultOpen={true}
            isProviderReady={isProviderReady}
            canBeDisabled={false}
            hideThinking={hideThinking}
          />
        )}

        {showTranslation && (
          <TextScenarioSection
            ref={translationRef}
            title="Translation"
            description="Message translation and language tasks"
            idPrefix="translation"
            initialState={initialTranslation}
            isProviderReady={isProviderReady}
            hideThinking={hideThinking}
          />
        )}

        {showHitmeup && (
          <TextScenarioSection
            ref={hitmeupRef}
            title="HitMeUp"
            description="Quick auto-reply and message generation"
            idPrefix="hitmeup"
            initialState={initialHitmeup}
            isProviderReady={isProviderReady}
            hideThinking={hideThinking}
          />
        )}

        {showAibot && (
          <TextScenarioSection
            ref={aibotRef}
            title="AI Bot"
            description="Automated bot responses with low creativity"
            idPrefix="aibot"
            initialState={initialAibot}
            isProviderReady={isProviderReady}
            canBeDisabled={false}
            hideThinking={hideThinking}
          />
        )}
      </div>
    );
  }
);
