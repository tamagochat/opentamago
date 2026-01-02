"use client";

import { useState, useCallback, useEffect } from "react";
import { Save, Loader2, Check, Book, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import type { CharacterCardV3, CharacterBook } from "~/lib/charx/types";
import type { CharacterDocument } from "~/lib/db/schemas";
import { useCharacters } from "~/lib/db/hooks/useCharacters";
import { useDatabase } from "~/lib/db/hooks/useDatabase";
import { useRouter } from "~/i18n/routing";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: CharacterCardV3 | null;
  lorebook: CharacterBook | null;
  characterName: string;
}

function convertCardToDocument(card: CharacterCardV3): Omit<CharacterDocument, "id" | "createdAt" | "updatedAt"> {
  const data = card.data;
  
  return {
    name: data.name || "Unnamed Character",
    description: data.description || "",
    personality: data.personality || "",
    scenario: data.scenario || "",
    firstMessage: data.first_mes || "",
    exampleDialogue: data.mes_example || "",
    systemPrompt: data.system_prompt || "",
    creatorNotes: data.creator_notes || "",
    tags: data.tags || [],
    avatarData: undefined, // TODO: Extract avatar from assets if available
  };
}

export function ExportDialog({
  open,
  onOpenChange,
  card,
  lorebook,
  characterName,
}: ExportDialogProps) {
  const t = useTranslations("charx.export");
  const { createCharacter } = useCharacters();
  const { db, isLoading: dbLoading, error: dbError } = useDatabase();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!card) return;

    // Check for database errors
    if (dbError) {
      console.error("Database error:", dbError);
      toast.error(t("error.title"), {
        description: t("error.databaseInitFailed"),
      });
      return;
    }

    // Don't proceed if database is still loading
    if (!db || dbLoading) {
      toast.error(t("error.title"), {
        description: t("error.databaseNotReady"),
      });
      return;
    }

    setIsSaving(true);
    try {
      const characterData = convertCardToDocument(card);
      console.log("Saving character data:", characterData);
      
      const savedCharacter = await createCharacter(characterData);

      if (!savedCharacter) {
        throw new Error("createCharacter returned null - database may not be initialized");
      }

      // TODO: Save lorebook separately if needed
      // For now, we'll just save the character

      toast.success(t("success.title"), {
        description: t("success.description", { name: characterName }),
        action: {
          label: t("success.goToChat"),
          onClick: () => {
            router.push("/chat");
          },
        },
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Failed to export character:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(t("error.title"), {
        description: t("error.description") + (errorMessage ? `: ${errorMessage}` : ""),
      });
    } finally {
      setIsSaving(false);
    }
  }, [card, characterName, createCharacter, router, t, onOpenChange, db, dbLoading, dbError]);

  const hasLorebook = lorebook && lorebook.entries.length > 0;
  const lorebookEntryCount = lorebook?.entries.length ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-md bg-primary/10 p-1.5">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{t("character.title")}</span>
                  <Badge variant="outline" className="text-xs">
                    {characterName || t("character.unnamed")}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("character.description")}
                </p>
                {card?.data.tags && card.data.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {card.data.tags.slice(0, 5).map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {card.data.tags.length > 5 && (
                      <Badge variant="secondary" className="text-xs">
                        +{card.data.tags.length - 5} {t("character.moreTags")}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>

            {hasLorebook && (
              <div className="flex items-start gap-3 pt-2 border-t">
                <div className="mt-0.5 rounded-md bg-primary/10 p-1.5">
                  <Book className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{t("lorebook.title")}</span>
                    <Badge variant="outline" className="text-xs">
                      {lorebookEntryCount} {t("lorebook.entries")}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("lorebook.description")}
                  </p>
                </div>
              </div>
            )}

            {!hasLorebook && (
              <div className="flex items-start gap-3 pt-2 border-t">
                <div className="mt-0.5 rounded-md bg-muted p-1.5">
                  <Book className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground italic">
                    {t("lorebook.noLorebook")}
                  </p>
                </div>
              </div>
            )}
          </div>

          {dbError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-xs text-destructive font-medium">
                {t("error.databaseInitFailed")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {dbError.message}
              </p>
            </div>
          )}

          {!dbError && (
            <div className="rounded-lg border border-blue-500/50 bg-blue-500/10 p-3">
              <p className="text-xs text-blue-600 dark:text-blue-400">
                {t("info")}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            {t("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isSaving || dbLoading || !db || !!dbError}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("saving")}
              </>
            ) : dbLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("initializing")}
              </>
            ) : dbError ? (
              <>
                <Save className="h-4 w-4" />
                {t("save")} (Error)
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {t("save")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

