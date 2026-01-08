"use client";

import { useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { Save, Loader2, Book, User } from "lucide-react";
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
import type { CharacterBook, ParsedCharX } from "~/lib/charx/types";
import type { CharacterAssetDocument, LorebookEntryDocument } from "~/lib/db/schemas";
import { useCharacters } from "~/lib/db/hooks/useCharacters";
import { useDatabase } from "~/lib/db/hooks/useDatabase";
import { useRouter } from "~/i18n/routing";
import { extractAvatarAsBlob, convertCardToCharacter } from "~/lib/charx/hooks";
import type { CharacterItem } from "~/lib/stores";

export interface SaveToDatabaseDialogRef {
  open: (item: CharacterItem) => void;
}

/**
 * Convert ParsedCharX data to the format needed for saveCharacterWithAssets
 */
async function convertParsedCharXToSaveData(parsed: ParsedCharX) {
  if (!parsed.card) {
    throw new Error("No character card found");
  }

  const avatarBlob = await extractAvatarAsBlob(parsed);
  const character = convertCardToCharacter(parsed.card);

  // Extract lorebook entries
  const lorebookEntries: Array<Omit<LorebookEntryDocument, "id" | "characterId" | "createdAt" | "updatedAt">> = [];
  if (parsed.card.data.character_book) {
    const book = parsed.card.data.character_book;
    for (const entry of book.entries) {
      lorebookEntries.push({
        keys: entry.keys,
        content: entry.content,
        enabled: entry.enabled,
        insertionOrder: entry.insertion_order,
        caseSensitive: entry.case_sensitive ?? false,
        priority: entry.priority ?? 10,
        selective: entry.selective ?? false,
        secondaryKeys: entry.secondary_keys ?? [],
        constant: entry.constant ?? false,
        position: entry.position || "before_char",
        useRegex: entry.use_regex ?? false,
        extensions: entry.extensions || {},
        name: entry.name,
        comment: entry.comment,
      });
    }
  }

  // Extract assets (excluding icon which is used as avatar)
  const assets: Array<{
    data: Uint8Array;
    metadata: Omit<CharacterAssetDocument, "id" | "characterId" | "createdAt" | "updatedAt">;
  }> = [];

  for (const [uri, data] of parsed.assets) {
    // Skip the icon asset (it's the avatar)
    const assetInfo = parsed.card.data.assets?.find((a) => a.uri.replace("embeded://", "") === uri);
    if (assetInfo?.type === "icon") continue;

    // Determine asset type
    let assetType: "icon" | "emotion" | "background" | "other" = "other";
    if (uri.includes("/emotion/")) {
      assetType = "emotion";
    } else if (uri.includes("/background/")) {
      assetType = "background";
    } else if (uri.includes("/icon/")) {
      assetType = "icon";
    }

    const name = assetInfo?.name || uri.split("/").pop() || uri;
    const ext = assetInfo?.ext || uri.split(".").pop() || "";

    assets.push({
      data,
      metadata: {
        assetType,
        name,
        uri,
        ext,
      },
    });
  }

  return {
    character,
    avatarBlob,
    lorebookEntries,
    assets,
  };
}

export const SaveToDatabaseDialog = forwardRef<SaveToDatabaseDialogRef>(
  function SaveToDatabaseDialog(_, ref) {
    const t = useTranslations("charx.export");
    const { saveCharacterWithAssets } = useCharacters();
    const { db, isLoading: dbLoading, error: dbError } = useDatabase();
    const router = useRouter();

    const [isOpen, setIsOpen] = useState(false);
    const [item, setItem] = useState<CharacterItem | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useImperativeHandle(ref, () => ({
      open: (newItem: CharacterItem) => {
        setItem(newItem);
        setIsOpen(true);
      },
    }), []);

    const handleOpenChange = useCallback((open: boolean) => {
      setIsOpen(open);
      if (!open) {
        setItem(null);
      }
    }, []);

    const card = item?.parsed?.card ?? null;
    const lorebook = card?.data.character_book ?? null;
    const characterName = card?.data.name || "";
    const parsedData = item?.parsed ?? null;

    const handleSave = useCallback(async () => {
      if (!parsedData || !card) return;

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
        // Convert ParsedCharX to save data format
        const saveData = await convertParsedCharXToSaveData(parsedData);

        console.log("Saving character with assets:", {
          characterName,
          hasAvatar: !!saveData.avatarBlob,
          lorebookEntriesCount: saveData.lorebookEntries.length,
          assetsCount: saveData.assets.length,
        });

        const savedCharacter = await saveCharacterWithAssets(saveData);

        if (!savedCharacter) {
          throw new Error("saveCharacterWithAssets returned null - database may not be initialized");
        }

        toast.success(t("success.title"), {
          description: t("success.description", { name: characterName }),
          action: {
            label: t("success.goToChat"),
            onClick: () => {
              router.push("/chat");
            },
          },
        });

        handleOpenChange(false);
      } catch (error) {
        console.error("Failed to export character:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        toast.error(t("error.title"), {
          description: t("error.description") + (errorMessage ? `: ${errorMessage}` : ""),
        });
      } finally {
        setIsSaving(false);
      }
    }, [parsedData, card, characterName, saveCharacterWithAssets, router, t, handleOpenChange, db, dbLoading, dbError]);

    const hasLorebook = lorebook && lorebook.entries.length > 0;
    const lorebookEntryCount = lorebook?.entries.length ?? 0;

    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
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
              onClick={() => handleOpenChange(false)}
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
);
