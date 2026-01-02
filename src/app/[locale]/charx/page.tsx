"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { FileArchive, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/components/ui/tabs";
import { Button } from "~/components/ui/button";
import { MainLayout } from "~/components/layout";
import { FileUpload } from "./_components/file-upload";
import { CharacterList, type CharacterItem } from "./_components/character-list";
import { CharacterCardDisplay } from "./_components/character-card-display";
import { LorebookDisplay } from "./_components/lorebook-display";
import { AssetsDisplay } from "./_components/assets-display";
import { ModuleDisplay } from "./_components/module-display";
import { ExportDialog } from "./_components/export-dialog";
import { parseCharXAsync, getCategorizedAssets } from "~/lib/charx";

export default function CharXPage() {
  const t = useTranslations("charx");
  const [items, setItems] = useState<CharacterItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const isProcessingRef = useRef(false);

  const selectedItem = items.find((item) => item.id === selectedId);
  const parsedData = selectedItem?.parsed ?? null;

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current) return;

    const pendingItem = items.find((item) => item.status === "pending");
    if (!pendingItem) return;

    isProcessingRef.current = true;

    setItems((prev) =>
      prev.map((item) =>
        item.id === pendingItem.id ? { ...item, status: "parsing" as const } : item
      )
    );

    try {
      const data = await parseCharXAsync(pendingItem.file);
      setItems((prev) =>
        prev.map((item) =>
          item.id === pendingItem.id
            ? { ...item, status: "done" as const, parsed: data }
            : item
        )
      );
    } catch (e) {
      console.error("Failed to parse charx file:", e);
      setItems((prev) =>
        prev.map((item) =>
          item.id === pendingItem.id
            ? {
                ...item,
                status: "error" as const,
                error: e instanceof Error ? e.message : "Failed to parse file",
              }
            : item
        )
      );
    } finally {
      isProcessingRef.current = false;
    }
  }, [items]);

  useEffect(() => {
    void processQueue();
  }, [processQueue]);

  const handleFilesSelect = useCallback((files: File[]) => {
    const newItems: CharacterItem[] = files.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      file,
      parsed: null,
      status: "pending" as const,
    }));

    setItems((prev) => [...prev, ...newItems]);

    if (newItems.length > 0 && !selectedId) {
      setSelectedId(newItems[0]!.id);
    }
  }, [selectedId]);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const categorizedAssets = parsedData ? getCategorizedAssets(parsedData) : null;
  const isLoading = items.some((item) => item.status === "parsing");

  return (
    <MainLayout showFooter={false}>
      <div className="container max-w-6xl py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileArchive className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{t("title")}</h1>
                <p className="text-sm text-muted-foreground">
                  {t("subtitle")}
                </p>
              </div>
            </div>
            {parsedData && parsedData.card && selectedItem?.status === "done" && (
              <Button
                onClick={() => setExportDialogOpen(true)}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {t("export.button")}
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {items.length === 0 && (
            <FileUpload
              onFilesSelect={handleFilesSelect}
              isLoading={isLoading}
            />
          )}

          <CharacterList
            items={items}
            selectedId={selectedId}
            onSelect={handleSelect}
            onFilesSelect={handleFilesSelect}
          />

          {selectedItem?.status === "error" && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
              <p className="text-destructive font-medium">{t("error")}</p>
              <p className="text-sm text-muted-foreground">{selectedItem.error}</p>
            </div>
          )}

          {parsedData && selectedItem?.status === "done" && (
            <Tabs defaultValue="character" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="character" disabled={!parsedData.card}>
                  {t("tabs.character")}
                </TabsTrigger>
                <TabsTrigger
                  value="lorebook"
                  disabled={!parsedData.card?.data.character_book}
                >
                  {t("tabs.lorebook")}
                  {parsedData.card?.data.character_book && (
                    <span className="ml-1 text-xs">
                      ({parsedData.card.data.character_book.entries.length})
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="assets" disabled={parsedData.assets.size === 0}>
                  {t("tabs.assets")}
                  {parsedData.assets.size > 0 && (
                    <span className="ml-1 text-xs">
                      ({parsedData.assets.size})
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="module" disabled={!parsedData.module}>
                  {t("tabs.module")}
                </TabsTrigger>
              </TabsList>

              <div className="mt-6">
                <TabsContent value="character">
                  {parsedData.card ? (
                    <CharacterCardDisplay card={parsedData.card} originalFilename={selectedItem.file.name} />
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      {t("empty.noCharacterCard")}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="lorebook">
                  {parsedData.card?.data.character_book ? (
                    <LorebookDisplay
                      lorebook={parsedData.card.data.character_book}
                      characterName={parsedData.card.data.name}
                      originalFilename={selectedItem.file.name}
                    />
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      {t("empty.noLorebook")}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="assets">
                  {categorizedAssets && (
                    <AssetsDisplay
                      emotions={categorizedAssets.emotions}
                      icons={categorizedAssets.icons}
                      backgrounds={categorizedAssets.backgrounds}
                      other={categorizedAssets.other}
                      cardAssets={parsedData?.card?.data.assets}
                    />
                  )}
                </TabsContent>

                <TabsContent value="module">
                  {parsedData.module ? (
                    <ModuleDisplay module={parsedData.module} />
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      {t("empty.noModule")}
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          )}

          {parsedData && parsedData.excludedFiles.length > 0 && (
            <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
              <p className="text-yellow-600 font-medium">{t("warning")}</p>
              <p className="text-sm text-muted-foreground">
                {t("filesExcluded", { count: parsedData.excludedFiles.length })}
              </p>
              <ul className="mt-2 text-xs text-muted-foreground list-disc list-inside">
                {parsedData.excludedFiles.map((file, i) => (
                  <li key={i}>{file}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {parsedData && parsedData.card && (
          <ExportDialog
            open={exportDialogOpen}
            onOpenChange={setExportDialogOpen}
            card={parsedData.card}
            lorebook={parsedData.card.data.character_book ?? null}
            characterName={parsedData.card.data.name || ""}
          />
        )}
      </div>
    </MainLayout>
  );
}
