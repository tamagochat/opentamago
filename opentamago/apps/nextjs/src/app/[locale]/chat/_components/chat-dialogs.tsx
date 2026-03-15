"use client";

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import type { PersonaDocument, MemoryDocument, CharacterDocument, ChatDocument } from "~/lib/db/schemas";
import type { Database } from "~/lib/db";
import { EditMessageDialog } from "./edit-message-dialog";
import { MemoryDialog } from "./memory-dialog";
import { PersonaEditor } from "./persona-editor";

// Context types
interface ChatDialogsContextValue {
  openEditDialog: (messageId: string, content: string) => void;
  openMemoryDialog: () => void;
  openPersonaEditor: (options?: { persona?: PersonaDocument; onSave?: (persona: PersonaDocument) => void }) => void;
}

const ChatDialogsContext = createContext<ChatDialogsContextValue | null>(null);

// Provider props
interface ChatDialogsProviderProps {
  children: ReactNode;
  // Data needed for dialogs
  character: CharacterDocument | null;
  chat: ChatDocument | null;
  memories: MemoryDocument[];
  memoriesLoading: boolean;
  db: Database | null;
  // Callbacks
  onSaveEditedMessage: (messageId: string, newContent: string) => Promise<void>;
  onCreateMemory: (data: { chatId: string; characterId: string; content: string }) => Promise<unknown>;
  onDeleteMemory: (memoryId: string) => Promise<void>;
  onPersonaCreated?: (persona: PersonaDocument) => void;
}

export function ChatDialogsProvider({
  children,
  character,
  chat,
  memories,
  memoriesLoading,
  db,
  onSaveEditedMessage,
  onCreateMemory,
  onDeleteMemory,
  onPersonaCreated,
}: ChatDialogsProviderProps) {
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageContent, setEditingMessageContent] = useState("");

  // Memory dialog state
  const [memoryDialogOpen, setMemoryDialogOpen] = useState(false);

  // Persona editor state
  const [personaEditorOpen, setPersonaEditorOpen] = useState(false);
  const [personaToEdit, setPersonaToEdit] = useState<PersonaDocument | undefined>(undefined);
  const [personaOnSave, setPersonaOnSave] = useState<((persona: PersonaDocument) => void) | undefined>(undefined);

  // Open edit dialog
  const openEditDialog = useCallback((messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditingMessageContent(content);
    setEditDialogOpen(true);
  }, []);

  // Open memory dialog
  const openMemoryDialog = useCallback(() => {
    setMemoryDialogOpen(true);
  }, []);

  // Open persona editor
  const openPersonaEditor = useCallback((options?: { persona?: PersonaDocument; onSave?: (persona: PersonaDocument) => void }) => {
    setPersonaToEdit(options?.persona);
    // Store the callback in a way that doesn't cause unnecessary re-renders
    setPersonaOnSave(() => options?.onSave);
    setPersonaEditorOpen(true);
  }, []);

  // Handle edit save
  const handleEditSave = useCallback(async (newContent: string) => {
    if (editingMessageId) {
      await onSaveEditedMessage(editingMessageId, newContent);
    }
  }, [editingMessageId, onSaveEditedMessage]);

  // Handle edit dialog close
  const handleEditDialogClose = useCallback((open: boolean) => {
    setEditDialogOpen(open);
    if (!open) {
      setEditingMessageId(null);
      setEditingMessageContent("");
    }
  }, []);

  // Handle persona save
  const handlePersonaSave = useCallback((persona: PersonaDocument) => {
    personaOnSave?.(persona);
    onPersonaCreated?.(persona);
  }, [personaOnSave, onPersonaCreated]);

  // Handle persona editor close
  const handlePersonaEditorClose = useCallback((open: boolean) => {
    setPersonaEditorOpen(open);
    if (!open) {
      setPersonaToEdit(undefined);
      setPersonaOnSave(undefined);
    }
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<ChatDialogsContextValue>(() => ({
    openEditDialog,
    openMemoryDialog,
    openPersonaEditor,
  }), [openEditDialog, openMemoryDialog, openPersonaEditor]);

  return (
    <ChatDialogsContext.Provider value={contextValue}>
      {children}

      {/* Edit Message Dialog - renders outside message list */}
      <EditMessageDialog
        open={editDialogOpen}
        onOpenChange={handleEditDialogClose}
        initialContent={editingMessageContent}
        onSave={handleEditSave}
      />

      {/* Memory Dialog - renders outside message list */}
      {chat && character && (
        <MemoryDialog
          open={memoryDialogOpen}
          onOpenChange={setMemoryDialogOpen}
          memories={memories}
          memoriesLoading={memoriesLoading}
          chatId={chat.id}
          characterId={character.id}
          db={db}
          onCreateMemory={onCreateMemory}
          onDeleteMemory={onDeleteMemory}
        />
      )}

      {/* Persona Editor - renders outside message list */}
      <PersonaEditor
        open={personaEditorOpen}
        onOpenChange={handlePersonaEditorClose}
        persona={personaToEdit}
        onSave={handlePersonaSave}
      />
    </ChatDialogsContext.Provider>
  );
}

// Hook to use dialog functions
export function useChatDialogs() {
  const context = useContext(ChatDialogsContext);
  if (!context) {
    throw new Error("useChatDialogs must be used within a ChatDialogsProvider");
  }
  return context;
}
