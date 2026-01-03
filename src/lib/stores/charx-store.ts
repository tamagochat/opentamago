import { useSyncExternalStore, useCallback } from "react";
import type { ParsedCharX } from "~/lib/charx";

export interface CharacterItem {
  id: string;
  file: File;
  parsed: ParsedCharX | null;
  status: "pending" | "parsing" | "done" | "error";
  error?: string;
}

interface CharXState {
  items: CharacterItem[];
  selectedId: string | null;
}

type Listener = () => void;

const listeners = new Set<Listener>();

let state: CharXState = {
  items: [],
  selectedId: null,
};

function emitChange() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

function getServerSnapshot(): CharXState {
  return { items: [], selectedId: null };
}

export function setCharXItems(items: CharacterItem[]) {
  state = { ...state, items };
  emitChange();
}

export function addCharXItems(newItems: CharacterItem[]) {
  state = { ...state, items: [...state.items, ...newItems] };
  emitChange();
}

export function updateCharXItem(
  id: string,
  update: Partial<Omit<CharacterItem, "id" | "file">>
) {
  state = {
    ...state,
    items: state.items.map((item) =>
      item.id === id ? { ...item, ...update } : item
    ),
  };
  emitChange();
}

export function setSelectedId(selectedId: string | null) {
  state = { ...state, selectedId };
  emitChange();
}

export function removeCharXItem(id: string) {
  const newItems = state.items.filter((item) => item.id !== id);
  const newSelectedId =
    state.selectedId === id
      ? newItems.length > 0
        ? newItems[0]!.id
        : null
      : state.selectedId;
  state = { items: newItems, selectedId: newSelectedId };
  emitChange();
}

export function clearCharXStore() {
  state = { items: [], selectedId: null };
  emitChange();
}

export function useCharXStore() {
  const currentState = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const addItems = useCallback((files: File[]) => {
    const newItems: CharacterItem[] = files.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      file,
      parsed: null,
      status: "pending" as const,
    }));
    addCharXItems(newItems);
    return newItems;
  }, []);

  const selectItem = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  const updateItem = useCallback(
    (id: string, update: Partial<Omit<CharacterItem, "id" | "file">>) => {
      updateCharXItem(id, update);
    },
    []
  );

  const removeItem = useCallback((id: string) => {
    removeCharXItem(id);
  }, []);

  const clear = useCallback(() => {
    clearCharXStore();
  }, []);

  return {
    items: currentState.items,
    selectedId: currentState.selectedId,
    selectedItem: currentState.items.find(
      (item) => item.id === currentState.selectedId
    ),
    addItems,
    selectItem,
    updateItem,
    removeItem,
    clear,
  };
}
