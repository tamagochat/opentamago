"use client";

import { useState, useEffect, useCallback } from "react";
import { useCharacterAssets } from "~/lib/db/hooks";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Card, CardContent } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Info, Trash2 } from "lucide-react";
import { AssetDetailDialog } from "./asset-detail-dialog";

interface ImageAssetsListProps {
  characterId: string;
}

type AssetType = "all" | "icon" | "emotion" | "background" | "other";

export function ImageAssetsList({ characterId }: ImageAssetsListProps) {
  const { assets, isLoading, deleteAsset, getAssetDataUrl } = useCharacterAssets(characterId);
  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({});
  const [selectedType, setSelectedType] = useState<AssetType>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleCloseDialog = useCallback(() => {
    setSelectedId(null);
  }, []);

  // Load asset data URLs
  useEffect(() => {
    const loadAssetUrls = async () => {
      const urls: Record<string, string> = {};
      for (const asset of assets) {
        const url = await getAssetDataUrl(asset.id);
        if (url) {
          urls[asset.id] = url;
        }
      }
      setAssetUrls(urls);
    };

    if (assets.length > 0) {
      void loadAssetUrls();
    }
  }, [assets, getAssetDataUrl]);

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Delete image "${name}"?`)) {
      await deleteAsset(id);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="text-muted-foreground text-center py-8 text-sm">
        No image assets yet
      </div>
    );
  }

  // Filter assets by selected type
  const filteredAssets = selectedType === "all"
    ? assets
    : assets.filter(asset => asset.assetType === selectedType);

  // Group by asset type
  const assetsByType = filteredAssets.reduce(
    (acc, asset) => {
      if (!acc[asset.assetType]) {
        acc[asset.assetType] = [];
      }
      acc[asset.assetType]!.push(asset);
      return acc;
    },
    {} as Record<string, typeof assets>
  );

  return (
    <>
      {/* Type Filter */}
      <div className="shrink-0 mb-3">
        <Select value={selectedType} onValueChange={(value) => setSelectedType(value as AssetType)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="icon">Icons</SelectItem>
            <SelectItem value="emotion">Emotions</SelectItem>
            <SelectItem value="background">Backgrounds</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Scrollable Asset Grid */}
      <ScrollArea className="h-full -mx-4 px-4">
        <div className="space-y-4 pb-4">
          {Object.entries(assetsByType).map(([type, typeAssets]) => (
            <div key={type}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium capitalize">{type}s</h4>
                <Badge variant="secondary" className="text-xs">
                  {typeAssets.length}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {typeAssets.map((asset) => (
                  <Card key={asset.id} className="p-0 overflow-hidden">
                    <CardContent className="p-0">
                      {/* Image Preview */}
                      <div className="aspect-square bg-muted relative group">
                        {assetUrls[asset.id] ? (
                          <img
                            src={assetUrls[asset.id]}
                            alt={asset.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Skeleton className="w-full h-full" />
                          </div>
                        )}
                        {/* Overlay with buttons on hover */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setSelectedId(asset.id)}
                          >
                            <Info className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDelete(asset.id, asset.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {/* Name */}
                      <div className="p-2">
                        <p className="text-xs truncate font-medium">{asset.name}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <AssetDetailDialog
        assets={filteredAssets}
        assetUrls={assetUrls}
        selectedId={selectedId}
        onClose={handleCloseDialog}
      />
    </>
  );
}
