"use client";

import { memo, useState, useCallback } from "react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Loader2, Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import type { MemoryDocument } from "~/lib/db/schemas";
import type { Database } from "~/lib/db";

interface MemoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memories: MemoryDocument[];
  memoriesLoading: boolean;
  chatId: string;
  characterId: string;
  db: Database | null;
  onCreateMemory: (data: { chatId: string; characterId: string; content: string }) => Promise<unknown>;
  onDeleteMemory: (memoryId: string) => Promise<void>;
}

function formatTimeAgo(createdAt: number): string {
  const createdDate = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - createdDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

export const MemoryDialog = memo(function MemoryDialog({
  open,
  onOpenChange,
  memories,
  memoriesLoading,
  chatId,
  characterId,
  db,
  onCreateMemory,
  onDeleteMemory,
}: MemoryDialogProps) {
  const [newMemory, setNewMemory] = useState("");
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [editingMemoryContent, setEditingMemoryContent] = useState("");

  const handleAddMemory = useCallback(async () => {
    if (!newMemory.trim() || !chatId || !characterId) return;

    try {
      await onCreateMemory({
        chatId,
        characterId,
        content: newMemory.trim(),
      });
      toast.success("Memory added!");
      setNewMemory("");
    } catch (error) {
      console.error("Failed to add memory:", error);
      toast.error("Failed to add memory");
    }
  }, [newMemory, chatId, characterId, onCreateMemory]);

  const handleStartEdit = useCallback((memoryId: string, content: string) => {
    setEditingMemoryId(memoryId);
    setEditingMemoryContent(content);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMemoryId(null);
    setEditingMemoryContent("");
  }, []);

  const handleSaveEdit = useCallback(async (memoryId: string) => {
    if (!editingMemoryContent.trim() || !db?.memories) return;

    try {
      const memoryDoc = await db.memories.findOne(memoryId).exec();
      if (memoryDoc) {
        await memoryDoc.patch({ content: editingMemoryContent.trim() });
        toast.success("Memory updated!");
        setEditingMemoryId(null);
        setEditingMemoryContent("");
      }
    } catch (error) {
      console.error("Failed to update memory:", error);
      toast.error("Failed to update memory");
    }
  }, [editingMemoryContent, db]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Chat Memory</DialogTitle>
          <DialogDescription>
            Important facts and context that the AI remembers about this conversation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Memories List */}
          <ScrollArea className="h-[300px] w-full rounded-md border p-4">
            <div className="space-y-2">
              {memoriesLoading ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                  Loading memories...
                </div>
              ) : memories.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No memories saved yet.
                  <br />
                  <span className="text-xs">
                    Memories will be automatically extracted from your conversations when using Messenger mode.
                  </span>
                </div>
              ) : (
                memories.map((memory) => {
                  const isEditing = editingMemoryId === memory.id;
                  const timeAgo = formatTimeAgo(memory.createdAt);

                  return (
                    <div key={memory.id} className="group rounded-lg border p-3 hover:bg-accent/50 transition-colors">
                      {isEditing ? (
                        // Edit mode
                        <div className="space-y-2">
                          <Textarea
                            value={editingMemoryContent}
                            onChange={(e) => setEditingMemoryContent(e.target.value)}
                            className="min-h-[80px] resize-none"
                            autoFocus
                          />
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleCancelEdit}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleSaveEdit(memory.id)}
                              disabled={!editingMemoryContent.trim()}
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // View mode
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm flex-1">{memory.content}</p>
                            <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleStartEdit(memory.id, memory.content)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => onDeleteMemory(memory.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {/* Add New Memory */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Add New Memory</label>
            <div className="flex gap-2">
              <Textarea
                value={newMemory}
                onChange={(e) => setNewMemory(e.target.value)}
                placeholder="Type a fact or context to remember..."
                className="min-h-[80px] resize-none flex-1"
              />
            </div>
            <Button
              onClick={handleAddMemory}
              disabled={!newMemory.trim() || !chatId || !characterId}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Memory
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});
