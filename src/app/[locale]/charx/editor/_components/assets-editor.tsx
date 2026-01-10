"use client";

import { useCallback, useRef, useState, memo } from "react";
import { Upload, Trash2, Image as ImageIcon, ChevronDown, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { nanoid } from "nanoid";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import type { AssetFormData, AssetType } from "~/lib/editor/assistant-types";
import { useAssetsContext } from "./editor-context";

const ASSET_TYPE_COLORS: Record<AssetType, string> = {
  icon: "bg-blue-500/10 text-blue-500",
  emotion: "bg-purple-500/10 text-purple-500",
  background: "bg-green-500/10 text-green-500",
  other: "bg-gray-500/10 text-gray-500",
};

// Container component - connects to context
export const AssetsEditorContainer = memo(function AssetsEditorContainer() {
  const { assets, addAsset, deleteAsset } = useAssetsContext();
  return (
    <AssetsEditor
      assets={assets}
      onAdd={addAsset}
      onDelete={deleteAsset}
    />
  );
});

// Main component - memoized
interface AssetsEditorProps {
  assets: AssetFormData[];
  onAdd: (asset: AssetFormData) => void;
  onDelete: (id: string) => void;
}

const AssetsEditor = memo(function AssetsEditor({
  assets,
  onAdd,
  onDelete,
}: AssetsEditorProps) {
  const t = useTranslations("charxEditor.editor.assets");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedType, setSelectedType] = useState<AssetType>("emotion");
  const [previewAsset, setPreviewAsset] = useState<AssetFormData | null>(null);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;

        const arrayBuffer = await file.arrayBuffer();
        const data = new Uint8Array(arrayBuffer);
        const dataUrl = URL.createObjectURL(file);

        const ext = file.name.split(".").pop()?.toLowerCase() || "png";
        const name = file.name.replace(/\.[^.]+$/, "");

        onAdd({
          id: nanoid(),
          assetType: selectedType,
          name,
          ext,
          data,
          dataUrl,
        });
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [onAdd, selectedType]
  );

  const handleDeleteAsset = useCallback(
    (id: string) => {
      const asset = assets.find((a) => a.id === id);
      if (asset?.dataUrl) {
        URL.revokeObjectURL(asset.dataUrl);
      }
      onDelete(id);
    },
    [assets, onDelete]
  );

  // Group assets by type
  const groupedAssets = assets.reduce(
    (acc, asset) => {
      if (!acc[asset.assetType]) {
        acc[asset.assetType] = [];
      }
      acc[asset.assetType].push(asset);
      return acc;
    },
    {} as Record<AssetType, AssetFormData[]>
  );

  if (assets.length === 0) {
    return (
      <EmptyAssetsState
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        onUpload={() => fileInputRef.current?.click()}
        fileInputRef={fileInputRef}
        onFileChange={handleFileUpload}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Controls */}
      <AssetsHeader
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        onUpload={() => fileInputRef.current?.click()}
        fileInputRef={fileInputRef}
        onFileChange={handleFileUpload}
      />

      {/* Asset Groups */}
      {(["icon", "emotion", "background", "other"] as AssetType[]).map((type) => {
        const typeAssets = groupedAssets[type];
        if (!typeAssets || typeAssets.length === 0) return null;

        return (
          <AssetGroup
            key={type}
            type={type}
            assets={typeAssets}
            onPreview={setPreviewAsset}
            onDelete={handleDeleteAsset}
          />
        );
      })}

      {/* Preview Dialog */}
      <Dialog open={!!previewAsset} onOpenChange={() => setPreviewAsset(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewAsset?.name}
              <Badge className={ASSET_TYPE_COLORS[previewAsset?.assetType ?? "other"]}>
                {previewAsset?.assetType}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-4">
            {previewAsset?.dataUrl && (
              <img
                src={previewAsset.dataUrl}
                alt={previewAsset.name}
                className="max-w-full max-h-[60vh] object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});

// Empty state component - memoized
const EmptyAssetsState = memo(function EmptyAssetsState({
  selectedType,
  onTypeChange,
  onUpload,
  fileInputRef,
  onFileChange,
}: {
  selectedType: AssetType;
  onTypeChange: (type: AssetType) => void;
  onUpload: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const t = useTranslations("charxEditor.editor.assets");

  return (
    <div className="h-full flex flex-col items-center justify-center py-12">
      <ImageIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <p className="text-muted-foreground mb-2">{t("empty")}</p>
      <p className="text-sm text-muted-foreground/70 mb-4">{t("emptyHint")}</p>
      <div className="flex items-center gap-2">
        <Select
          value={selectedType}
          onValueChange={(v) => onTypeChange(v as AssetType)}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="icon">{t("types.icon")}</SelectItem>
            <SelectItem value="emotion">{t("types.emotion")}</SelectItem>
            <SelectItem value="background">{t("types.background")}</SelectItem>
            <SelectItem value="other">{t("types.other")}</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={onUpload}>
          <Upload className="h-4 w-4 mr-2" />
          {t("upload")}
        </Button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onFileChange}
      />
    </div>
  );
});

// Header component - memoized
const AssetsHeader = memo(function AssetsHeader({
  selectedType,
  onTypeChange,
  onUpload,
  fileInputRef,
  onFileChange,
}: {
  selectedType: AssetType;
  onTypeChange: (type: AssetType) => void;
  onUpload: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const t = useTranslations("charxEditor.editor.assets");

  return (
    <div className="flex items-center justify-between">
      <h3 className="font-medium">{t("title")}</h3>
      <div className="flex items-center gap-2">
        <Select
          value={selectedType}
          onValueChange={(v) => onTypeChange(v as AssetType)}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="icon">{t("types.icon")}</SelectItem>
            <SelectItem value="emotion">{t("types.emotion")}</SelectItem>
            <SelectItem value="background">{t("types.background")}</SelectItem>
            <SelectItem value="other">{t("types.other")}</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={onUpload}
        >
          <Upload className="h-4 w-4 mr-2" />
          {t("upload")}
        </Button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onFileChange}
      />
    </div>
  );
});

// Asset group component - memoized
const AssetGroup = memo(function AssetGroup({
  type,
  assets,
  onPreview,
  onDelete,
}: {
  type: AssetType;
  assets: AssetFormData[];
  onPreview: (asset: AssetFormData) => void;
  onDelete: (id: string) => void;
}) {
  const t = useTranslations("charxEditor.editor.assets");
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-3">
      <CollapsibleTrigger className="flex items-center gap-2 w-full hover:opacity-80 transition-opacity">
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <Badge className={ASSET_TYPE_COLORS[type]}>
          {t(`types.${type}`)}
        </Badge>
        <span className="text-sm text-muted-foreground">
          ({assets.length})
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-6">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {assets.map((asset) => (
            <AssetItem
              key={asset.id}
              asset={asset}
              onPreview={() => onPreview(asset)}
              onDelete={() => onDelete(asset.id)}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
});

// Asset item component - memoized
const AssetItem = memo(function AssetItem({
  asset,
  onPreview,
  onDelete,
}: {
  asset: AssetFormData;
  onPreview: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("charxEditor.editor.assets");
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div
      className="group relative aspect-square rounded-lg border overflow-hidden bg-muted/50 cursor-pointer"
      onClick={onPreview}
    >
      {asset.dataUrl && (
        <img
          src={asset.dataUrl}
          alt={asset.name}
          className="w-full h-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <span className="text-white text-xs px-2 text-center truncate">
          {asset.name}
        </span>
      </div>
      <Popover open={deleteOpen} onOpenChange={setDeleteOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("deleteAsset")}</p>
            <p className="text-xs text-muted-foreground">{t("deleteConfirm")}</p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteOpen(false)}
              >
                {t("cancel")}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  onDelete();
                  setDeleteOpen(false);
                }}
              >
                {t("delete")}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
});
