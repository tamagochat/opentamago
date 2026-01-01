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
} from "lucide-react";
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
import type { Asset } from "~/lib/charx/types";

type SortMode = "none" | "asc" | "desc";

interface AssetItem {
  path: string;
  name: string;
  dataUrl: string;
}

interface AssetsDisplayProps {
  emotions: AssetItem[];
  icons: AssetItem[];
  backgrounds: AssetItem[];
  other: AssetItem[];
  cardAssets?: Asset[];
}

function getPrefix(name: string): string {
  // Remove extension, all digits, and trailing -/_ from filename to get prefix
  const withoutExt = name.replace(/\.[^/.]+$/, "");
  const withoutDigits = withoutExt.replace(/\d+/g, "");
  // Replace subsequent -/_ with single -/_
  const normalized = withoutDigits.replace(/-+/g, "-").replace(/_+/g, "_");
  const withoutTrailing = normalized.replace(/[-_]+$/, "");
  return withoutTrailing.trim() || "Other";
}

function LazyImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
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

  return (
    <div ref={imgRef} className={className}>
      {isVisible ? (
        <>
          {!isLoaded && (
            <div className="absolute inset-0 bg-muted animate-pulse" />
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className={`w-full h-full object-cover transition-opacity ${isLoaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setIsLoaded(true)}
          />
        </>
      ) : (
        <div className="w-full h-full bg-muted" />
      )}
    </div>
  );
}

function sortAssets(assets: AssetItem[], mode: SortMode): AssetItem[] {
  if (mode === "none") return assets;
  return [...assets].sort((a, b) => {
    const cmp = a.name.localeCompare(b.name, undefined, { numeric: true });
    return mode === "asc" ? cmp : -cmp;
  });
}

function groupAssetsByPrefix(assets: AssetItem[]): Map<string, AssetItem[]> {
  const groups = new Map<string, AssetItem[]>();
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
}: {
  assets: AssetItem[];
  onSelect: (assets: AssetItem[], index: number) => void;
}) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
      {assets.map((asset, index) => (
        <button
          key={asset.path}
          onClick={() => onSelect(assets, index)}
          className="group relative aspect-square rounded-lg border bg-muted/50 overflow-hidden hover:ring-2 hover:ring-primary transition-all"
        >
          <LazyImage
            src={asset.dataUrl}
            alt={asset.name}
            className="w-full h-full"
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
}: {
  assets: AssetItem[];
  onSelect: (assets: AssetItem[], index: number) => void;
  sortMode: SortMode;
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
}: {
  assets: AssetItem[];
  onSelect: (assets: AssetItem[], index: number) => void;
  groupByPrefix: boolean;
  sortMode: SortMode;
}) {
  if (assets.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No assets in this category
      </div>
    );
  }

  if (groupByPrefix) {
    return <GroupedAssetGrid assets={assets} onSelect={onSelect} sortMode={sortMode} />;
  }

  return <AssetGridItems assets={assets} onSelect={onSelect} />;
}

function downloadAsset(asset: AssetItem) {
  const link = document.createElement("a");
  link.href = asset.dataUrl;
  const ext = asset.path.split(".").pop() || "png";
  link.download = `${asset.name}.${ext}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function getFileSizeFromDataUrl(dataUrl: string): number {
  // Remove the data URL prefix to get base64 string
  const base64 = dataUrl.split(",")[1] ?? "";
  // Calculate size: base64 is ~4/3 of original size
  return Math.round((base64.length * 3) / 4);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface ImageInfo {
  width: number;
  height: number;
  fileSize: number;
}

export function AssetsDisplay({
  emotions,
  icons,
  backgrounds,
  other,
  cardAssets = [],
}: AssetsDisplayProps) {
  const [currentList, setCurrentList] = useState<AssetItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [sortMode, setSortMode] = useState<SortMode>("none");
  const [groupByPrefix, setGroupByPrefix] = useState(false);
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);

  const selectedAsset = currentIndex >= 0 ? currentList[currentIndex] ?? null : null;

  // Load image info when selected asset changes
  useEffect(() => {
    if (!selectedAsset) {
      setImageInfo(null);
      return;
    }

    const img = new window.Image();
    img.onload = () => {
      setImageInfo({
        width: img.naturalWidth,
        height: img.naturalHeight,
        fileSize: getFileSizeFromDataUrl(selectedAsset.dataUrl),
      });
    };
    img.src = selectedAsset.dataUrl;

    return () => {
      img.onload = null;
    };
  }, [selectedAsset]);

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
    if (sortMode === "asc") return "Sorted A-Z";
    if (sortMode === "desc") return "Sorted Z-A";
    return "Sort by filename";
  };

  // Apply sorting to each category
  const sortedEmotions = sortAssets(emotions, sortMode);
  const sortedIcons = sortAssets(icons, sortMode);
  const sortedBackgrounds = sortAssets(backgrounds, sortMode);
  const sortedOther = sortAssets(other, sortMode);

  const getMatchingCardAssets = useCallback(
    (assetPath: string): Asset[] => {
      if (!cardAssets.length) return [];
      // Match by checking if the card asset's URI contains the file path
      // e.g., "embeded://assets/icon/image/1.png" should match "assets/icon/image/1.png"
      return cardAssets.filter((cardAsset) => {
        const uri = cardAsset.uri;
        // Handle embeded:// URIs
        if (uri.startsWith("embeded://")) {
          const embeddedPath = uri.replace("embeded://", "");
          return assetPath === embeddedPath || assetPath.endsWith(embeddedPath) || embeddedPath.endsWith(assetPath);
        }
        return false;
      });
    },
    [cardAssets]
  );

  const selectedAssetMetadata = selectedAsset ? getMatchingCardAssets(selectedAsset.path) : [];

  const totalAssets =
    emotions.length + icons.length + backgrounds.length + other.length;

  const getActiveTab = () => {
    if (emotions.length > 0) return "emotions";
    if (icons.length > 0) return "icons";
    if (backgrounds.length > 0) return "backgrounds";
    if (other.length > 0) return "other";
    return "emotions";
  };

  const openAsset = useCallback((assets: AssetItem[], index: number) => {
    setCurrentList(assets);
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

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Assets
              </CardTitle>
              <CardDescription>{totalAssets} total assets extracted</CardDescription>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant={sortMode !== "none" ? "secondary" : "outline"}
                size="sm"
                className="h-8 gap-1.5"
                onClick={cycleSortMode}
              >
                {getSortIcon()}
                <span className="hidden sm:inline">{getSortLabel()}</span>
              </Button>
              <Button
                variant={groupByPrefix ? "secondary" : "outline"}
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => setGroupByPrefix((prev) => !prev)}
              >
                <Group className="h-4 w-4" />
                <span className="hidden sm:inline">Group by filename</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {totalAssets === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No assets found in this character file</p>
            </div>
          ) : (
            <Tabs defaultValue={getActiveTab()} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="emotions" className="gap-1">
                  <Smile className="h-4 w-4" />
                  <span className="hidden sm:inline">Emotions</span>
                  <Badge variant="secondary" className="ml-1">
                    {emotions.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="icons" className="gap-1">
                  <UserCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Icons</span>
                  <Badge variant="secondary" className="ml-1">
                    {icons.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="backgrounds" className="gap-1">
                  <Wallpaper className="h-4 w-4" />
                  <span className="hidden sm:inline">Backgrounds</span>
                  <Badge variant="secondary" className="ml-1">
                    {backgrounds.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="other" className="gap-1">
                  <FolderOpen className="h-4 w-4" />
                  <span className="hidden sm:inline">Other</span>
                  <Badge variant="secondary" className="ml-1">
                    {other.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[350px] mt-4">
                <TabsContent value="emotions" className="mt-0">
                  <AssetGrid assets={groupByPrefix ? emotions : sortedEmotions} onSelect={openAsset} groupByPrefix={groupByPrefix} sortMode={sortMode} />
                </TabsContent>
                <TabsContent value="icons" className="mt-0">
                  <AssetGrid assets={groupByPrefix ? icons : sortedIcons} onSelect={openAsset} groupByPrefix={groupByPrefix} sortMode={sortMode} />
                </TabsContent>
                <TabsContent value="backgrounds" className="mt-0">
                  <AssetGrid assets={groupByPrefix ? backgrounds : sortedBackgrounds} onSelect={openAsset} groupByPrefix={groupByPrefix} sortMode={sortMode} />
                </TabsContent>
                <TabsContent value="other" className="mt-0">
                  <AssetGrid assets={groupByPrefix ? other : sortedOther} onSelect={openAsset} groupByPrefix={groupByPrefix} sortMode={sortMode} />
                </TabsContent>
              </ScrollArea>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedAsset} onOpenChange={closeModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-8">
              <span>{selectedAsset?.name}</span>
              {currentList.length > 1 && (
                <span className="text-sm font-normal text-muted-foreground">
                  {currentIndex + 1} / {currentList.length}
                </span>
              )}
            </DialogTitle>
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedAsset.dataUrl}
                alt={selectedAsset.name}
                className="max-w-full max-h-[60vh] object-contain rounded-lg"
              />
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
                <span>{selectedAsset.path}</span>
                {imageInfo && (
                  <>
                    <span>•</span>
                    <span>{imageInfo.width} × {imageInfo.height}</span>
                    <span>•</span>
                    <span>{formatFileSize(imageInfo.fileSize)}</span>
                  </>
                )}
              </div>
              {selectedAssetMetadata.length > 0 && (
                <div className="w-full rounded-md border bg-muted/30 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Card Metadata ({selectedAssetMetadata.length} reference{selectedAssetMetadata.length !== 1 ? "s" : ""})
                  </p>
                  <div className="space-y-2">
                    {selectedAssetMetadata.map((meta, i) => (
                      <div key={i} className="rounded bg-background p-2 text-xs font-mono">
                        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                          <span className="text-muted-foreground">type:</span>
                          <span>{meta.type}</span>
                          <span className="text-muted-foreground">name:</span>
                          <span>{meta.name}</span>
                          <span className="text-muted-foreground">ext:</span>
                          <span>{meta.ext}</span>
                          <span className="text-muted-foreground">uri:</span>
                          <span className="truncate">{meta.uri}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => downloadAsset(selectedAsset)}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
