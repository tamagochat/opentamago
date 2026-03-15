"use client";

import { memo } from "react";
import { Wand2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import type { EditorTab } from "~/lib/editor/assistant-types";
import {
  useFormContext,
  useLorebookContext,
  useAssetsContext,
  useTabContext,
} from "./editor-context";
import { CharacterFormContainer } from "./character-form";
import { LorebookEditorContainer } from "./lorebook-editor";
import { AssetsEditorContainer } from "./assets-editor";

// Container component - connects to context
export const EditorPanelContainer = memo(function EditorPanelContainer({
  onShowAssistant,
}: {
  onShowAssistant: () => void;
}) {
  const { activeTab, setActiveTab } = useTabContext();
  const { entries: lorebookEntries } = useLorebookContext();
  const { assets } = useAssetsContext();

  return (
    <EditorPanel
      activeTab={activeTab}
      onTabChange={setActiveTab}
      lorebookCount={lorebookEntries.length}
      assetsCount={assets.length}
      onShowAssistant={onShowAssistant}
    />
  );
});

// Presentational component - memoized
interface EditorPanelProps {
  activeTab: EditorTab;
  onTabChange: (tab: EditorTab) => void;
  lorebookCount: number;
  assetsCount: number;
  onShowAssistant: () => void;
}

const EditorPanel = memo(function EditorPanel({
  activeTab,
  onTabChange,
  lorebookCount,
  assetsCount,
  onShowAssistant,
}: EditorPanelProps) {
  const t = useTranslations("charxEditor");

  return (
    <div className="h-full flex flex-col rounded-lg border bg-card">
      <Tabs
        value={activeTab}
        onValueChange={(v) => onTabChange(v as EditorTab)}
        className="h-full flex flex-col"
      >
        {/* Tab Header */}
        <EditorTabHeader
          lorebookCount={lorebookCount}
          assetsCount={assetsCount}
          onShowAssistant={onShowAssistant}
        />

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          <TabsContent value="character" className="mt-0 h-full">
            <ScrollArea className="h-full">
              <div className="p-4">
                <CharacterFormContainer />
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="lorebook" className="mt-0 h-full">
            <ScrollArea className="h-full">
              <div className="p-4">
                <LorebookEditorContainer />
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="assets" className="mt-0 h-full">
            <ScrollArea className="h-full">
              <div className="p-4">
                <AssetsEditorContainer />
              </div>
            </ScrollArea>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
});

// Tab header component - memoized
const EditorTabHeader = memo(function EditorTabHeader({
  lorebookCount,
  assetsCount,
  onShowAssistant,
}: {
  lorebookCount: number;
  assetsCount: number;
  onShowAssistant: () => void;
}) {
  const t = useTranslations("charxEditor");

  return (
    <div className="border-b px-4 py-2 space-y-2">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="character" className="text-xs md:text-sm">
          {t("editor.tabs.character")}
        </TabsTrigger>
        <TabsTrigger value="lorebook" className="text-xs md:text-sm">
          {t("editor.tabs.lorebook")}
          {lorebookCount > 0 && (
            <span className="ml-1 text-xs">({lorebookCount})</span>
          )}
        </TabsTrigger>
        <TabsTrigger value="assets" className="text-xs md:text-sm">
          {t("editor.tabs.assets")}
          {assetsCount > 0 && (
            <span className="ml-1 text-xs">({assetsCount})</span>
          )}
        </TabsTrigger>
      </TabsList>
      <Button
        variant="outline"
        size="sm"
        onClick={onShowAssistant}
        className="w-full md:hidden"
      >
        <Wand2 className="h-4 w-4 mr-2" />
        {t("editor.askAssistant")}
      </Button>
    </div>
  );
});
