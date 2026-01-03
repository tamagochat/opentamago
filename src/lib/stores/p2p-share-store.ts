import { useSyncExternalStore, useCallback } from "react";

interface P2PShareState {
  pendingFile: File | null;
}

type Listener = () => void;

const listeners = new Set<Listener>();

let state: P2PShareState = {
  pendingFile: null,
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

function getServerSnapshot(): P2PShareState {
  return { pendingFile: null };
}

export function setPendingFile(file: File | null) {
  state = { ...state, pendingFile: file };
  emitChange();
}

export function clearPendingFile() {
  state = { pendingFile: null };
  emitChange();
}

export function useP2PShareStore() {
  const currentState = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const setFile = useCallback((file: File | null) => {
    setPendingFile(file);
  }, []);

  const clearFile = useCallback(() => {
    clearPendingFile();
  }, []);

  const consumeFile = useCallback(() => {
    const file = currentState.pendingFile;
    if (file) {
      clearPendingFile();
    }
    return file;
  }, [currentState.pendingFile]);

  return {
    pendingFile: currentState.pendingFile,
    setFile,
    clearFile,
    consumeFile,
  };
}

export function getPendingFile(): File | null {
  return state.pendingFile;
}

export function consumePendingFile(): File | null {
  const file = state.pendingFile;
  if (file) {
    clearPendingFile();
  }
  return file;
}
