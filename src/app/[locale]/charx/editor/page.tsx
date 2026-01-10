"use client";

import { useState, memo } from "react";
import { useSearchParams } from "next/navigation";
import { Wand2, ArrowLeft, Save, Download, FolderInput } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { useCharacters } from "~/lib/db/hooks/useCharacters";
import {
  EditorProvider,
  useFormContext,
  useLorebookContext,
  useAssetsContext,
  useActionsContext,
} from "./_components/editor-context";
import { AssistantPanelContainer } from "./_components/assistant-panel";
import { EditorPanelContainer } from "./_components/editor-panel";
import { ImportPokeboxDialog } from "./_components/import-pokebox-dialog";
import { ExportDialog } from "./_components/export-dialog";

// Main page component
export default function CharxEditorPage() {
  const searchParams = useSearchParams();
  const editCharacterId = searchParams.get("characterId");

  return (
    <EditorProvider initialCharacterId={editCharacterId}>
      <EditorLayout />
    </EditorProvider>
  );
}

// Layout component - handles mobile/desktop view switching
const EditorLayout = memo(function EditorLayout() {
  const t = useTranslations("charxEditor");
  const [showMobileAssistant, setShowMobileAssistant] = useState(false);

  return (
    <div className="container max-w-7xl py-4 md:py-8 px-4 md:px-6">
      {/* Header */}
      <EditorHeader
        showMobileAssistant={showMobileAssistant}
        onShowImport={() => {}}
      />

      {/* Mobile Back Button */}
      {showMobileAssistant && (
        <div className="flex items-center gap-3 mb-4 md:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMobileAssistant(false)}
            className="h-9 px-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t("back")}
          </Button>
          <span className="font-medium">{t("assistant.title")}</span>
        </div>
      )}

      {/* Two Panel Layout */}
      <div className="flex gap-6 h-[calc(100vh-180px)] md:h-[calc(100vh-200px)] min-h-[400px] md:min-h-[600px]">
        {/* Left Panel - AI Assistant */}
        <div
          className={cn(
            "w-full md:w-96 flex-shrink-0 overflow-hidden flex flex-col",
            !showMobileAssistant && "hidden md:flex"
          )}
        >
          <AssistantPanelContainer />
        </div>

        {/* Right Panel - Editor */}
        <div
          className={cn("flex-1 overflow-hidden", showMobileAssistant && "hidden md:block")}
        >
          <EditorPanelContainer onShowAssistant={() => setShowMobileAssistant(true)} />
        </div>
      </div>
    </div>
  );
});

// Header component - memoized
const EditorHeader = memo(function EditorHeader({
  showMobileAssistant,
  onShowImport,
}: {
  showMobileAssistant: boolean;
  onShowImport: () => void;
}) {
  const t = useTranslations("charxEditor");
  const { form } = useFormContext();
  const { save, isSaving, isDirty } = useActionsContext();
  const { entries: lorebookEntries } = useLorebookContext();
  const { assets } = useAssetsContext();
  const { characters, isLoading: charactersLoading, getCharacter } = useCharacters();

  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const handleImportFromPokebox = async (characterId: string) => {
    const character = await getCharacter(characterId);
    if (character) {
      form.reset({
        name: character.name,
        description: character.description,
        personality: character.personality,
        scenario: character.scenario,
        firstMessage: character.firstMessage,
        exampleDialogue: character.exampleDialogue,
        systemPrompt: character.systemPrompt,
        postHistoryInstructions: character.postHistoryInstructions,
        alternateGreetings: character.alternateGreetings,
        groupOnlyGreetings: character.groupOnlyGreetings,
        creatorNotes: character.creatorNotes,
        tags: character.tags,
        creator: character.creator,
        characterVersion: character.characterVersion,
        nickname: character.nickname,
        avatarData: character.avatarData,
      });
      setShowImportDialog(false);
    }
  };

  return (
    <>
      <div className={cn("mb-4 md:mb-8", showMobileAssistant && "hidden md:block")}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Wand2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">{t("title")}</h1>
              <p className="text-xs md:text-sm text-muted-foreground">{t("subtitle")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImportDialog(true)}
              className="hidden sm:flex"
            >
              <FolderInput className="h-4 w-4 mr-2" />
              {t("editExisting")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExportDialog(true)}
              disabled={!form.getValues("name")}
            >
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t("editor.export")}</span>
            </Button>
            <Button size="sm" onClick={save} disabled={isSaving || !isDirty}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? t("editor.saving") : t("editor.save")}
            </Button>
          </div>
        </div>
      </div>

      {/* Import from Pokebox Dialog */}
      <ImportPokeboxDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        characters={characters}
        onSelect={handleImportFromPokebox}
        isLoading={charactersLoading}
      />

      {/* Export Dialog */}
      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        character={form.getValues()}
        lorebookEntries={lorebookEntries}
        assets={assets}
      />
    </>
  );
});
