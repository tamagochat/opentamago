import { useSyncExternalStore, useCallback } from "react";

interface P2PConnectState {
  pendingCharacterId: string | null;
}

type Listener = () => void;

const listeners = new Set<Listener>();

let state: P2PConnectState = {
  pendingCharacterId: null,
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

function getServerSnapshot(): P2PConnectState {
  return { pendingCharacterId: null };
}

export function setPendingCharacterId(characterId: string | null) {
  state = { ...state, pendingCharacterId: characterId };
  emitChange();
}

function clearPendingCharacterId() {
  state = { pendingCharacterId: null };
  emitChange();
}

export function useP2PConnectStore() {
  const currentState = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const setCharacterId = useCallback((characterId: string | null) => {
    setPendingCharacterId(characterId);
  }, []);

  const clearCharacterId = useCallback(() => {
    clearPendingCharacterId();
  }, []);

  const consumeCharacterId = useCallback(() => {
    const characterId = currentState.pendingCharacterId;
    if (characterId) {
      clearPendingCharacterId();
    }
    return characterId;
  }, [currentState.pendingCharacterId]);

  return {
    pendingCharacterId: currentState.pendingCharacterId,
    setCharacterId,
    clearCharacterId,
    consumeCharacterId,
  };
}


export function consumePendingCharacterId(): string | null {
  const characterId = state.pendingCharacterId;
  if (characterId) {
    clearPendingCharacterId();
  }
  return characterId;
}
