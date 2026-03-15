"use client";

import { useState, memo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Wand2, ArrowLeft, Save, Download, FolderInput, FileUp, FileJson, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "~/components/ui/dropdown-menu";
import { cn } from "~/lib/utils";
import { useCharacters } from "~/lib/db/hooks/useCharacters";
import { parseCharXToCharacter, parseJsonToCharacter } from "~/lib/charx/hooks";
import type { LorebookEntryFormData } from "~/lib/editor/assistant-types";
import {
  EditorProvider,
  useFormContext,
  useLorebookContext,
  useAssetsContext,
  useActionsContext,
} from "./_components/editor-context";
import { AssistantProvider } from "./_components/assistant-context";
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

      {/* Two Panel Layout - Wrapped in AssistantProvider so editor tabs can trigger assistant */}
      <AssistantProvider>
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
      </AssistantProvider>
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
  const { entries: lorebookEntries, setEntries: setLorebookEntries } = useLorebookContext();
  const { assets, setAssets } = useAssetsContext();
  const { characters, isLoading: charactersLoading, getCharacter, getLorebookEntries } = useCharacters();

  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const charxInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

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

      // Also load lorebook entries for this character
      const entries = await getLorebookEntries(characterId);
      if (entries.length > 0) {
        const formEntries: LorebookEntryFormData[] = entries.map((entry) => ({
          id: crypto.randomUUID(), // Generate new IDs for the form
          keys: entry.keys,
          content: entry.content,
          enabled: entry.enabled,
          priority: entry.priority,
          position: entry.position,
          insertionOrder: entry.insertionOrder,
          caseSensitive: entry.caseSensitive,
          selective: entry.selective,
          secondaryKeys: entry.secondaryKeys,
          constant: entry.constant,
          useRegex: entry.useRegex,
          name: entry.name,
          comment: entry.comment,
        }));
        setLorebookEntries(formEntries);
      } else {
        setLorebookEntries([]);
      }

      setShowImportDialog(false);
    }
  };

  const handleImportCharx = () => {
    charxInputRef.current?.click();
  };

  const handleImportJson = () => {
    jsonInputRef.current?.click();
  };

  const handleCharxFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (charxInputRef.current) {
      charxInputRef.current.value = "";
    }

    setIsImporting(true);
    try {
      const data = await parseCharXToCharacter(file);

      // Update form with character data
      form.reset({
        name: data.character.name,
        description: data.character.description,
        personality: data.character.personality,
        scenario: data.character.scenario,
        firstMessage: data.character.firstMessage,
        exampleDialogue: data.character.exampleDialogue,
        systemPrompt: data.character.systemPrompt,
        postHistoryInstructions: data.character.postHistoryInstructions,
        alternateGreetings: data.character.alternateGreetings,
        groupOnlyGreetings: data.character.groupOnlyGreetings,
        creatorNotes: data.character.creatorNotes,
        tags: data.character.tags,
        creator: data.character.creator,
        characterVersion: data.character.characterVersion,
        nickname: data.character.nickname,
        avatarData: data.character.avatarData,
      });

      // Update lorebook entries
      if (data.lorebookEntries.length > 0) {
        const formEntries: LorebookEntryFormData[] = data.lorebookEntries.map((entry) => ({
          id: crypto.randomUUID(),
          keys: entry.keys,
          content: entry.content,
          enabled: entry.enabled,
          priority: entry.priority,
          position: entry.position,
          insertionOrder: entry.insertionOrder,
          caseSensitive: entry.caseSensitive,
          selective: entry.selective,
          secondaryKeys: entry.secondaryKeys,
          constant: entry.constant,
          useRegex: entry.useRegex,
          name: entry.name,
          comment: entry.comment,
        }));
        setLorebookEntries(formEntries);
      } else {
        setLorebookEntries([]);
      }

      // Update assets
      if (data.assets.length > 0) {
        setAssets(data.assets.map((asset, index) => ({
          id: `imported-${index}`,
          data: asset.data,
          ...asset.metadata,
        })));
      } else {
        setAssets([]);
      }

      toast.success(t("import.success"), { description: data.character.name });
    } catch (error) {
      console.error("Failed to import CharX:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(t("import.error"), { description: errorMessage });
    } finally {
      setIsImporting(false);
    }
  };

  const handleJsonFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (jsonInputRef.current) {
      jsonInputRef.current.value = "";
    }

    setIsImporting(true);
    try {
      const data = await parseJsonToCharacter(file);

      // Update form with character data
      form.reset({
        name: data.character.name,
        description: data.character.description,
        personality: data.character.personality,
        scenario: data.character.scenario,
        firstMessage: data.character.firstMessage,
        exampleDialogue: data.character.exampleDialogue,
        systemPrompt: data.character.systemPrompt,
        postHistoryInstructions: data.character.postHistoryInstructions,
        alternateGreetings: data.character.alternateGreetings,
        groupOnlyGreetings: data.character.groupOnlyGreetings,
        creatorNotes: data.character.creatorNotes,
        tags: data.character.tags,
        creator: data.character.creator,
        characterVersion: data.character.characterVersion,
        nickname: data.character.nickname,
        avatarData: data.character.avatarData,
      });

      // Update lorebook entries
      if (data.lorebookEntries.length > 0) {
        const formEntries: LorebookEntryFormData[] = data.lorebookEntries.map((entry) => ({
          id: crypto.randomUUID(),
          keys: entry.keys,
          content: entry.content,
          enabled: entry.enabled,
          priority: entry.priority,
          position: entry.position,
          insertionOrder: entry.insertionOrder,
          caseSensitive: entry.caseSensitive,
          selective: entry.selective,
          secondaryKeys: entry.secondaryKeys,
          constant: entry.constant,
          useRegex: entry.useRegex,
          name: entry.name,
          comment: entry.comment,
        }));
        setLorebookEntries(formEntries);
      } else {
        setLorebookEntries([]);
      }

      // JSON doesn't have assets, clear them
      setAssets([]);

      toast.success(t("import.success"), { description: data.character.name });
    } catch (error) {
      console.error("Failed to import JSON:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(t("import.error"), { description: errorMessage });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      {/* Hidden file inputs */}
      <input
        ref={charxInputRef}
        type="file"
        accept=".charx"
        onChange={handleCharxFileChange}
        className="hidden"
        disabled={isImporting}
      />
      <input
        ref={jsonInputRef}
        type="file"
        accept=".json"
        onChange={handleJsonFileChange}
        className="hidden"
        disabled={isImporting}
      />

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
            {/* Import Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden sm:flex"
                  disabled={isImporting}
                >
                  {isImporting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <FolderInput className="h-4 w-4 mr-2" />
                  )}
                  {t("import.title")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowImportDialog(true)}>
                  <FolderInput className="mr-2 h-4 w-4" />
                  {t("import.fromPokebox")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleImportCharx}>
                  <FileUp className="mr-2 h-4 w-4" />
                  {t("import.charx")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleImportJson}>
                  <FileJson className="mr-2 h-4 w-4" />
                  {t("import.json")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
