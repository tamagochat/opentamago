"use client";

import { memo } from "react";
import { AssistantProvider } from "./assistant-context";
import { AssistantHeader } from "./assistant-header";
import { AssistantApiKeyWarning, AssistantErrorAlert } from "./assistant-alerts";
import { AssistantMessagesArea } from "./assistant-messages-area";
import { AssistantChatInput } from "./assistant-chat-input";

/**
 * AssistantPanelContainer - Main entry point for the assistant panel.
 *
 * This component wraps everything in the AssistantProvider, which:
 * - Uses selective form watching (only name, description, personality, scenario, tags)
 * - Provides separate contexts for messages, loading, error, apiKey, and actions
 * - Each sub-component subscribes only to the state it needs
 *
 * Component hierarchy and their subscriptions:
 * - AssistantHeader: hasMessages, clearMessages
 * - AssistantApiKeyWarning: missingApiKey
 * - AssistantMessagesArea: messages, isLoading, missingApiKey (for example prompts)
 * - AssistantErrorAlert: error
 * - AssistantChatInput: isLoading, missingApiKey, sendMessage, abortGeneration
 */
export const AssistantPanelContainer = memo(function AssistantPanelContainer() {
  return (
    <AssistantProvider>
      <AssistantPanelLayout />
    </AssistantProvider>
  );
});

// Layout component - just renders the structure, no state subscriptions
const AssistantPanelLayout = memo(function AssistantPanelLayout() {
  return (
    <div className="h-full flex flex-col min-h-0 rounded-lg border bg-card">
      {/* Header - subscribes to hasMessages, clearMessages */}
      <AssistantHeader />

      {/* Missing API Key Warning - subscribes to missingApiKey */}
      <AssistantApiKeyWarning />

      {/* Messages - subscribes to messages, isLoading */}
      <AssistantMessagesArea />

      {/* Error - subscribes to error */}
      <AssistantErrorAlert />

      {/* Input - subscribes to isLoading, missingApiKey, actions */}
      <AssistantChatInput />
    </div>
  );
});
