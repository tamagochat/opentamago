"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Folder,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { ScrollArea } from "~/components/ui/scroll-area";
import { cn } from "~/lib/utils";
import { COLLECTION_COLORS, COLLECTION_ICONS } from "~/lib/db/hooks";
import type { CollectionDocument } from "~/lib/db/schemas/collection";

// Dynamic icon rendering
const renderIcon = (iconName: string, className?: string): React.ReactNode => {
  const icons: Record<string, React.ReactNode> = {
    folder: <Folder className={className} />,
    star: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    heart: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    ),
    bookmark: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
      </svg>
    ),
    flag: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1="4" x2="4" y1="22" y2="15" />
      </svg>
    ),
    tag: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
        <path d="M7 7h.01" />
      </svg>
    ),
    crown: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
      </svg>
    ),
    sparkles: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
        <path d="M5 3v4" />
        <path d="M19 17v4" />
        <path d="M3 5h4" />
        <path d="M17 19h4" />
      </svg>
    ),
    flame: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
      </svg>
    ),
    zap: (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  };
  return icons[iconName] || <Folder className={className} />;
};

interface CollectionFormData {
  name: string;
  description: string;
  color: string;
  icon: string;
}

interface CollectionManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collections: CollectionDocument[];
  onCreateCollection: (data: Omit<CollectionDocument, "id" | "createdAt" | "updatedAt" | "order">) => Promise<CollectionDocument | null>;
  onUpdateCollection: (id: string, data: Partial<CollectionDocument>) => Promise<CollectionDocument | null>;
  onDeleteCollection: (id: string) => Promise<boolean>;
  mode?: "create" | "manage";
}

export function CollectionManagerDialog({
  open,
  onOpenChange,
  collections,
  onCreateCollection,
  onUpdateCollection,
  onDeleteCollection,
  mode = "manage",
}: CollectionManagerDialogProps) {
  const t = useTranslations("pokebox.collections");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(mode === "create");
  const [formData, setFormData] = useState<CollectionFormData>({
    name: "",
    description: "",
    color: COLLECTION_COLORS[0],
    icon: COLLECTION_ICONS[0],
  });
  const [isSaving, setIsSaving] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setIsCreating(mode === "create");
      setEditingId(null);
      setFormData({
        name: "",
        description: "",
        color: COLLECTION_COLORS[0],
        icon: COLLECTION_ICONS[0],
      });
    }
  }, [open, mode]);

  const handleStartEdit = useCallback((collection: CollectionDocument) => {
    setEditingId(collection.id);
    setIsCreating(false);
    setFormData({
      name: collection.name,
      description: collection.description,
      color: collection.color,
      icon: collection.icon,
    });
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setIsCreating(false);
    setFormData({
      name: "",
      description: "",
      color: COLLECTION_COLORS[0],
      icon: COLLECTION_ICONS[0],
    });
  }, []);

  const handleStartCreate = useCallback(() => {
    setEditingId(null);
    setIsCreating(true);
    // Pick a random color for new collections
    const randomColor = COLLECTION_COLORS[Math.floor(Math.random() * COLLECTION_COLORS.length)] ?? COLLECTION_COLORS[0];
    setFormData({
      name: "",
      description: "",
      color: randomColor,
      icon: "folder",
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!formData.name.trim()) {
      toast.error("Collection name is required");
      return;
    }

    setIsSaving(true);
    try {
      if (editingId) {
        await onUpdateCollection(editingId, formData);
        toast.success("Collection updated");
      } else if (isCreating) {
        await onCreateCollection(formData);
        toast.success("Collection created");
      }
      handleCancelEdit();
    } catch (error) {
      console.error("Error saving collection:", error);
      toast.error("Failed to save collection");
    } finally {
      setIsSaving(false);
    }
  }, [formData, editingId, isCreating, onCreateCollection, onUpdateCollection, handleCancelEdit]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm(t("deleteConfirm"))) return;

    try {
      await onDeleteCollection(id);
      toast.success("Collection deleted");
      if (editingId === id) {
        handleCancelEdit();
      }
    } catch (error) {
      console.error("Error deleting collection:", error);
      toast.error("Failed to delete collection");
    }
  }, [editingId, onDeleteCollection, handleCancelEdit, t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isCreating ? t("create") : t("manageCollections")}
          </DialogTitle>
          <DialogDescription>
            {isCreating
              ? "Create a new collection to organize your characters."
              : "Manage your character collections."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Collection List (only in manage mode) */}
          {!isCreating && collections.length > 0 && (
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-2 pr-4">
                {collections.map((collection) => (
                  <div
                    key={collection.id}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg border",
                      editingId === collection.id && "bg-muted"
                    )}
                  >
                    <div
                      className="flex-shrink-0 h-8 w-8 rounded flex items-center justify-center"
                      style={{ backgroundColor: `${collection.color}20`, color: collection.color }}
                    >
                      {renderIcon(collection.icon, "h-4 w-4")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{collection.name}</p>
                      {collection.description && (
                        <p className="text-xs text-muted-foreground truncate">{collection.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleStartEdit(collection)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(collection.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Add New button (in manage mode) */}
          {!isCreating && !editingId && (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleStartCreate}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("create")}
            </Button>
          )}

          {/* Edit/Create Form */}
          {(isCreating || editingId) && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="collection-name">{t("name")}</Label>
                <Input
                  id="collection-name"
                  placeholder={t("namePlaceholder")}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="collection-description">{t("description")}</Label>
                <Textarea
                  id="collection-description"
                  placeholder={t("descriptionPlaceholder")}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>

              {/* Color */}
              <div className="space-y-2">
                <Label>{t("color")}</Label>
                <div className="flex flex-wrap gap-2">
                  {COLLECTION_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={cn(
                        "h-7 w-7 rounded-full border-2 transition-all",
                        formData.color === color
                          ? "border-foreground scale-110"
                          : "border-transparent hover:scale-105"
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, color })}
                    />
                  ))}
                </div>
              </div>

              {/* Icon */}
              <div className="space-y-2">
                <Label>{t("icon")}</Label>
                <div className="flex flex-wrap gap-2">
                  {COLLECTION_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      className={cn(
                        "h-8 w-8 rounded flex items-center justify-center border transition-all",
                        formData.icon === icon
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted hover:bg-muted/80 border-transparent"
                      )}
                      onClick={() => setFormData({ ...formData, icon })}
                    >
                      {renderIcon(icon, "h-4 w-4")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCancelEdit}
                >
                  <X className="h-4 w-4 mr-2" />
                  {t("cancel")}
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSave}
                  disabled={isSaving || !formData.name.trim()}
                >
                  <Check className="h-4 w-4 mr-2" />
                  {t("save")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
