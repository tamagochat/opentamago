"use client";

import { useCallback, useEffect, useRef } from "react";
import { FileArchive } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/components/ui/tabs";
import { MainLayout } from "~/components/layout";
import { FileUpload, parseRealmUUID } from "./_components/file-upload";
import { RealmDownloader } from "./_components/realm-downloader";
import { CharacterList } from "./_components/character-list";
import { CharacterCardDisplay } from "./_components/character-card-display";
import { LorebookDisplay } from "./_components/lorebook-display";
import { AssetsDisplay } from "./_components/assets-display";
import { ModuleDisplay } from "./_components/module-display";
import {
  SaveToDatabaseDialog,
  type SaveToDatabaseDialogRef,
} from "./_components/save-to-database-dialog";
import { parseCharXAsync, getCategorizedAssets } from "~/lib/charx";
import {
  useCharXStore,
  setPendingFile,
  type CharacterItem,
} from "~/lib/stores";
import { useRouter } from "~/i18n/routing";
import { ExperimentalDisclaimer } from "~/components/experimental-disclaimer";

export default function CharXPage() {
  const t = useTranslations("charx");
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    items,
    selectedId,
    selectedItem,
    addItems,
    selectItem,
    updateItem,
    removeItem,
  } = useCharXStore();
  const isProcessingRef = useRef(false);
  const realmDownloadTriggeredRef = useRef(false);
  const saveToDatabaseDialogRef = useRef<SaveToDatabaseDialogRef>(null);

  const parsedData = selectedItem?.parsed ?? null;

  // Get realm param from URL to pre-fill the input (only trigger auto-download once)
  const realmParam = searchParams.get("realm");
  const initialRealmId = !realmDownloadTriggeredRef.current
    ? (realmParam ? parseRealmUUID(realmParam) ?? undefined : undefined)
    : undefined;

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current) return;

    const pendingItem = items.find((item) => item.status === "pending");
    if (!pendingItem) return;

    isProcessingRef.current = true;

    updateItem(pendingItem.id, { status: "parsing" });

    try {
      const data = await parseCharXAsync(pendingItem.file);
      updateItem(pendingItem.id, { status: "done", parsed: data });
    } catch (e) {
      console.error("Failed to parse charx file:", e);
      updateItem(pendingItem.id, {
        status: "error",
        error: e instanceof Error ? e.message : "Failed to parse file",
      });
    } finally {
      isProcessingRef.current = false;
    }
  }, [items, updateItem]);

  useEffect(() => {
    void processQueue();
  }, [processQueue]);

  const handleFilesSelect = useCallback(
    (files: File[]) => {
      const newItems = addItems(files);
      if (newItems.length > 0 && !selectedId) {
        selectItem(newItems[0]!.id);
      }
    },
    [selectedId, addItems, selectItem]
  );

  const handleSelect = useCallback(
    (id: string) => {
      selectItem(id);
    },
    [selectItem]
  );

  const handleShareP2P = useCallback(
    (item: CharacterItem) => {
      if (item.file) {
        setPendingFile(item.file);
        router.push("/p2p/share");
      }
    },
    [router]
  );

  const handleSaveToDatabase = useCallback((item: CharacterItem) => {
    saveToDatabaseDialogRef.current?.open(item);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      removeItem(id);
    },
    [removeItem]
  );

  const categorizedAssets = parsedData ? getCategorizedAssets(parsedData) : null;
  const isLoading = items.some((item) => item.status === "parsing");

  return (
    <MainLayout showFooter={false}>
      <div className="container max-w-6xl py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileArchive className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t("title")}</h1>
              <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
            </div>
          </div>
        </div>

        <ExperimentalDisclaimer type="charx" />

        <div className="space-y-6">
          {items.length === 0 && (
            <>
              <FileUpload
                onFilesSelect={handleFilesSelect}
                isLoading={isLoading}
              />

              <div className="relative flex items-center">
                <div className="flex-grow border-t border-muted" />
                <span className="px-3 text-xs text-muted-foreground uppercase">
                  or
                </span>
                <div className="flex-grow border-t border-muted" />
              </div>

              <RealmDownloader
                onFilesSelect={handleFilesSelect}
                initialRealmId={initialRealmId}
                onInitialDownloadTriggered={() => {
                  realmDownloadTriggeredRef.current = true;
                }}
              />
            </>
          )}

          <CharacterList
            items={items}
            selectedId={selectedId}
            onSelect={handleSelect}
            onFilesSelect={handleFilesSelect}
            onShareP2P={handleShareP2P}
            onSaveToDatabase={handleSaveToDatabase}
            onDelete={handleDelete}
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

        <SaveToDatabaseDialog ref={saveToDatabaseDialogRef} />
      </div>
    </MainLayout>
  );
}
