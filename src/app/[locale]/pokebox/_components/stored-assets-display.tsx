"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Image,
  Smile,
  UserCircle,
  Wallpaper,
  Download,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUpAZ,
  ArrowDownAZ,
  Group,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { useCharacterAssets } from "~/lib/db/hooks/useCharacterAssets";
import type { CharacterAssetDocument } from "~/lib/db/schemas/character-asset";

type SortMode = "none" | "asc" | "desc";

interface AssetItem {
  id: string;
  path: string;
  name: string;
  dataUrl: string | null;
  assetType: string;
}

interface StoredAssetsDisplayProps {
  characterId: string;
  assets: CharacterAssetDocument[];
  isLoading?: boolean;
}

function getPrefix(name: string): string {
  const withoutExt = name.replace(/\.[^/.]+$/, "");
  const withoutDigits = withoutExt.replace(/\d+/g, "");
  const normalized = withoutDigits.replace(/-+/g, "-").replace(/_+/g, "_");
  const withoutTrailing = normalized.replace(/[-_]+$/, "");
  return withoutTrailing.trim() || "Other";
}

function LazyAssetImage({
  assetId,
  name,
  className,
  getAssetDataUrl,
}: {
  assetId: string;
  name: string;
  className?: string;
  getAssetDataUrl: (assetId: string) => Promise<string | null>;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let cancelled = false;
    void getAssetDataUrl(assetId).then((url) => {
      if (!cancelled && url) {
        setDataUrl(url);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isVisible, assetId, getAssetDataUrl]);

  return (
    <div ref={imgRef} className={className}>
      {isVisible && dataUrl ? (
        <>
          {!isLoaded && <div className="absolute inset-0 bg-muted animate-pulse" />}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={dataUrl}
            alt={name}
            className={`w-full h-full object-cover transition-opacity ${isLoaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setIsLoaded(true)}
          />
        </>
      ) : (
        <div className="w-full h-full bg-muted flex items-center justify-center">
          {isVisible && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      )}
    </div>
  );
}

function sortAssets(assets: CharacterAssetDocument[], mode: SortMode): CharacterAssetDocument[] {
  if (mode === "none") return assets;
  return [...assets].sort((a, b) => {
    const cmp = a.name.localeCompare(b.name, undefined, { numeric: true });
    return mode === "asc" ? cmp : -cmp;
  });
}

function groupAssetsByPrefix(assets: CharacterAssetDocument[]): Map<string, CharacterAssetDocument[]> {
  const groups = new Map<string, CharacterAssetDocument[]>();
  for (const asset of assets) {
    const prefix = getPrefix(asset.name);
    const group = groups.get(prefix) ?? [];
    group.push(asset);
    groups.set(prefix, group);
  }
  return groups;
}

function AssetGridItems({
  assets,
  onSelect,
  getAssetDataUrl,
}: {
  assets: CharacterAssetDocument[];
  onSelect: (assets: CharacterAssetDocument[], index: number) => void;
  getAssetDataUrl: (assetId: string) => Promise<string | null>;
}) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 p-1">
      {assets.map((asset, index) => (
        <button
          key={asset.id}
          onClick={() => onSelect(assets, index)}
          className="group relative aspect-square rounded-lg border bg-muted/50 overflow-hidden hover:ring-2 hover:ring-primary transition-all"
        >
          <LazyAssetImage
            assetId={asset.id}
            name={asset.name}
            className="w-full h-full"
            getAssetDataUrl={getAssetDataUrl}
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-xs text-white truncate">{asset.name}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

function GroupedAssetGrid({
  assets,
  onSelect,
  sortMode,
  getAssetDataUrl,
}: {
  assets: CharacterAssetDocument[];
  onSelect: (assets: CharacterAssetDocument[], index: number) => void;
  sortMode: SortMode;
  getAssetDataUrl: (assetId: string) => Promise<string | null>;
}) {
  const groups = groupAssetsByPrefix(assets);
  const sortedPrefixes = Array.from(groups.keys()).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );

  return (
    <div className="space-y-4">
      {sortedPrefixes.map((prefix) => {
        const groupAssets = groups.get(prefix) ?? [];
        const sortedGroupAssets = sortAssets(groupAssets, sortMode);
        return (
          <Collapsible key={prefix} defaultOpen>
            <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md bg-muted/50 px-3 py-2 hover:bg-muted transition-colors group">
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90" />
              <span className="text-sm font-medium">{prefix}</span>
              <Badge variant="secondary" className="ml-auto">
                {groupAssets.length}
              </Badge>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <AssetGridItems
                assets={sortedGroupAssets}
                onSelect={onSelect}
                getAssetDataUrl={getAssetDataUrl}
              />
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}

function AssetGrid({
  assets,
  onSelect,
  groupByPrefix,
  sortMode,
  emptyMessage,
  getAssetDataUrl,
}: {
  assets: CharacterAssetDocument[];
  onSelect: (assets: CharacterAssetDocument[], index: number) => void;
  groupByPrefix: boolean;
  sortMode: SortMode;
  emptyMessage: string;
  getAssetDataUrl: (assetId: string) => Promise<string | null>;
}) {
  if (assets.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">{emptyMessage}</div>
    );
  }

  if (groupByPrefix) {
    return (
      <GroupedAssetGrid
        assets={assets}
        onSelect={onSelect}
        sortMode={sortMode}
        getAssetDataUrl={getAssetDataUrl}
      />
    );
  }

  return (
    <AssetGridItems
      assets={assets}
      onSelect={onSelect}
      getAssetDataUrl={getAssetDataUrl}
    />
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function StoredAssetsDisplay({
  characterId,
  assets,
  isLoading,
}: StoredAssetsDisplayProps) {
  const t = useTranslations("pokebox");
  const tActions = useTranslations("actions");
  const { getAssetDataUrl, getAssetBlob } = useCharacterAssets(characterId);
  const [currentList, setCurrentList] = useState<CharacterAssetDocument[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [sortMode, setSortMode] = useState<SortMode>("none");
  const [groupByPrefix, setGroupByPrefix] = useState(false);
  const [selectedDataUrl, setSelectedDataUrl] = useState<string | null>(null);
  const [imageInfo, setImageInfo] = useState<{ width: number; height: number } | null>(null);

  const selectedAsset = currentIndex >= 0 ? currentList[currentIndex] ?? null : null;

  // Load selected asset data URL
  useEffect(() => {
    if (!selectedAsset) {
      setSelectedDataUrl(null);
      setImageInfo(null);
      return;
    }

    let cancelled = false;
    void getAssetDataUrl(selectedAsset.id).then((url) => {
      if (!cancelled && url) {
        setSelectedDataUrl(url);

        // Get image dimensions
        const img = new window.Image();
        img.onload = () => {
          if (!cancelled) {
            setImageInfo({
              width: img.naturalWidth,
              height: img.naturalHeight,
            });
          }
        };
        img.src = url;
      }
    });

    return () => {
      cancelled = true;
    };
  }, [selectedAsset, getAssetDataUrl]);

  const emotions = assets.filter((a) => a.assetType === "emotion");
  const icons = assets.filter((a) => a.assetType === "icon");
  const backgrounds = assets.filter((a) => a.assetType === "background");
  const other = assets.filter((a) => a.assetType === "other");

  const cycleSortMode = useCallback(() => {
    setSortMode((prev) => {
      if (prev === "none") return "asc";
      if (prev === "asc") return "desc";
      return "none";
    });
  }, []);

  const getSortIcon = () => {
    if (sortMode === "asc") return <ArrowUpAZ className="h-4 w-4" />;
    if (sortMode === "desc") return <ArrowDownAZ className="h-4 w-4" />;
    return <ArrowUpDown className="h-4 w-4" />;
  };

  const getSortLabel = () => {
    if (sortMode === "asc") return t("assets.sortAZ");
    if (sortMode === "desc") return t("assets.sortZA");
    return t("assets.sortByFilename");
  };

  const sortedEmotions = sortAssets(emotions, sortMode);
  const sortedIcons = sortAssets(icons, sortMode);
  const sortedBackgrounds = sortAssets(backgrounds, sortMode);
  const sortedOther = sortAssets(other, sortMode);

  const totalAssets = assets.length;

  const getActiveTab = () => {
    if (emotions.length > 0) return "emotions";
    if (icons.length > 0) return "icons";
    if (backgrounds.length > 0) return "backgrounds";
    if (other.length > 0) return "other";
    return "emotions";
  };

  const openAsset = useCallback((assetList: CharacterAssetDocument[], index: number) => {
    setCurrentList(assetList);
    setCurrentIndex(index);
  }, []);

  const closeModal = useCallback(() => {
    setCurrentIndex(-1);
  }, []);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : currentList.length - 1));
  }, [currentList.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < currentList.length - 1 ? prev + 1 : 0));
  }, [currentList.length]);

  const downloadAsset = useCallback(async () => {
    if (!selectedAsset) return;

    const blob = await getAssetBlob(selectedAsset.id);
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedAsset.name}.${selectedAsset.ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [selectedAsset, getAssetBlob]);

  useEffect(() => {
    if (currentIndex < 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, goToPrevious, goToNext]);

  if (isLoading) {
    return (
      <Card className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                {t("assets.title")}
              </CardTitle>
              <CardDescription>
                {t("assets.totalExtracted", { count: totalAssets })}
              </CardDescription>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant={sortMode !== "none" ? "secondary" : "outline"}
                size="sm"
                className="h-8 gap-1.5"
                onClick={cycleSortMode}
              >
                {getSortIcon()}
                <span className="sm:hidden">{t("assets.sort")}</span>
                <span className="hidden sm:inline">{getSortLabel()}</span>
              </Button>
              <Button
                variant={groupByPrefix ? "secondary" : "outline"}
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => setGroupByPrefix((prev) => !prev)}
              >
                <Group className="h-4 w-4" />
                <span className="sm:hidden">{t("assets.group")}</span>
                <span className="hidden sm:inline">{t("assets.groupByFilename")}</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden">
          {totalAssets === 0 ? (
            <div className="text-center py-8 text-muted-foreground h-full flex flex-col items-center justify-center">
              <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{t("assets.noAssets")}</p>
            </div>
          ) : (
            <Tabs defaultValue={getActiveTab()} className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
                <TabsTrigger value="emotions" className="gap-1 text-xs sm:text-sm">
                  <Smile className="hidden sm:block h-4 w-4" />
                  <span>{t("assets.emotions")}</span>
                  <Badge variant="secondary" className="hidden sm:inline-flex ml-1">
                    {emotions.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="icons" className="gap-1 text-xs sm:text-sm">
                  <UserCircle className="hidden sm:block h-4 w-4" />
                  <span>{t("assets.icons")}</span>
                  <Badge variant="secondary" className="hidden sm:inline-flex ml-1">
                    {icons.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="backgrounds" className="gap-1 text-xs sm:text-sm">
                  <Wallpaper className="hidden sm:block h-4 w-4" />
                  <span>{t("assets.backgrounds")}</span>
                  <Badge variant="secondary" className="hidden sm:inline-flex ml-1">
                    {backgrounds.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="other" className="gap-1 text-xs sm:text-sm">
                  <FolderOpen className="hidden sm:block h-4 w-4" />
                  <span>{t("assets.other")}</span>
                  <Badge variant="secondary" className="hidden sm:inline-flex ml-1">
                    {other.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 mt-4">
                <TabsContent value="emotions" className="mt-0">
                  <AssetGrid
                    assets={groupByPrefix ? emotions : sortedEmotions}
                    onSelect={openAsset}
                    groupByPrefix={groupByPrefix}
                    sortMode={sortMode}
                    emptyMessage={t("assets.noAssets")}
                    getAssetDataUrl={getAssetDataUrl}
                  />
                </TabsContent>
                <TabsContent value="icons" className="mt-0">
                  <AssetGrid
                    assets={groupByPrefix ? icons : sortedIcons}
                    onSelect={openAsset}
                    groupByPrefix={groupByPrefix}
                    sortMode={sortMode}
                    emptyMessage={t("assets.noAssets")}
                    getAssetDataUrl={getAssetDataUrl}
                  />
                </TabsContent>
                <TabsContent value="backgrounds" className="mt-0">
                  <AssetGrid
                    assets={groupByPrefix ? backgrounds : sortedBackgrounds}
                    onSelect={openAsset}
                    groupByPrefix={groupByPrefix}
                    sortMode={sortMode}
                    emptyMessage={t("assets.noAssets")}
                    getAssetDataUrl={getAssetDataUrl}
                  />
                </TabsContent>
                <TabsContent value="other" className="mt-0">
                  <AssetGrid
                    assets={groupByPrefix ? other : sortedOther}
                    onSelect={openAsset}
                    groupByPrefix={groupByPrefix}
                    sortMode={sortMode}
                    emptyMessage={t("assets.noAssets")}
                    getAssetDataUrl={getAssetDataUrl}
                  />
                </TabsContent>
              </ScrollArea>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedAsset} onOpenChange={closeModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedAsset?.name}</DialogTitle>
          </DialogHeader>
          {selectedAsset && (
            <div className="relative flex items-center justify-center p-4">
              {currentList.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-0 h-10 w-10 rounded-full bg-background/80 hover:bg-background shadow-md"
                  onClick={goToPrevious}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
              )}
              {selectedDataUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={selectedDataUrl}
                  alt={selectedAsset.name}
                  className="max-w-full max-h-[60vh] object-contain rounded-lg"
                />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
              {currentList.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 h-10 w-10 rounded-full bg-background/80 hover:bg-background shadow-md"
                  onClick={goToNext}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              )}
            </div>
          )}
          {selectedAsset && (
            <div className="flex flex-col gap-3 w-full">
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                {currentList.length > 1 && (
                  <>
                    <span>
                      {currentIndex + 1} / {currentList.length}
                    </span>
                    <span>•</span>
                  </>
                )}
                <span>{selectedAsset.uri}</span>
                {imageInfo && (
                  <>
                    <span>•</span>
                    <span>
                      {imageInfo.width} x {imageInfo.height}
                    </span>
                  </>
                )}
              </div>
              <Button variant="outline" className="w-full" onClick={downloadAsset}>
                <Download className="h-4 w-4 mr-2" />
                {tActions("download")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
