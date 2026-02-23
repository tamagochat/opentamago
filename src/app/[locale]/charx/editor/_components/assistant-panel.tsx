"use client";

import { memo } from "react";
import { AssistantHeader } from "./assistant-header";
import { AssistantApiKeyWarning, AssistantErrorAlert } from "./assistant-alerts";
import { AssistantMessagesArea } from "./assistant-messages-area";
import { AssistantChatInput } from "./assistant-chat-input";

/**
 * AssistantPanelContainer - Main entry point for the assistant panel.
 *
 * Note: AssistantProvider is now wrapped at a higher level (EditorLayout in page.tsx)
 * to allow the editor tabs (assets-editor, lorebook-editor) to trigger assistant actions.
 *
 * Component hierarchy and their subscriptions:
 * - AssistantHeader: hasMessages, clearMessages
 * - AssistantApiKeyWarning: missingApiKey
 * - AssistantMessagesArea: messages, isLoading, missingApiKey (for example prompts)
 * - AssistantErrorAlert: error
 * - AssistantChatInput: isLoading, missingApiKey, sendMessage, abortGeneration
 */
export const AssistantPanelContainer = memo(function AssistantPanelContainer() {
  return <AssistantPanelLayout />;
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
