import { useSyncExternalStore, useCallback } from "react";
import type { DataConnection } from "peerjs";
import type { Participant, ChatItemType } from "~/app/_components/connect/hooks/use-connect-peers";
import type { CharacterData } from "~/lib/connect/messages";

export interface ConnectSessionInfo {
  sessionId: string;
  slug: string;
  hostPeerId: string;
  isHost: boolean;
  myPeerId: string;
  myCharacter: CharacterData;
  wasInChat?: boolean; // Track if user was in chat (for rejoin banner)
  createdAt?: number;
  updatedAt?: number;
}

export interface ConnectStoreState {
  // Active session info
  sessionInfo: ConnectSessionInfo | null;

  // Connections (non-serializable - memory only)
  // Map of peerId → DataConnection
  activeConnections: Map<string, DataConnection>;

  // Participants state
  // Map of peerId → Participant
  participants: Map<string, Participant>;

  // Chat state
  chatHistory: ChatItemType[]; // All chat messages for current session
  bufferedMessages: ChatItemType[]; // Messages received while away from chat
  thinkingPeers: Set<string>; // Peers currently generating AI responses

  // UI state
  isComponentAttached: boolean; // Is ChatRoom component currently mounted?
}

type Listener = () => void;

const listeners = new Set<Listener>();

let state: ConnectStoreState = {
  sessionInfo: null,
  activeConnections: new Map(),
  participants: new Map(),
  chatHistory: [],
  bufferedMessages: [],
  thinkingPeers: new Set(),
  isComponentAttached: false,
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

// Cache server snapshot to avoid infinite loops
const serverSnapshot: ConnectStoreState = {
  sessionInfo: null,
  activeConnections: new Map(),
  participants: new Map(),
  chatHistory: [],
  bufferedMessages: [],
  thinkingPeers: new Set(),
  isComponentAttached: false,
};

function getServerSnapshot(): ConnectStoreState {
  return serverSnapshot;
}

// Session management
export function setSession(info: ConnectSessionInfo) {
  state = { ...state, sessionInfo: info };
  emitChange();
}

export function clearSession() {
  state = {
    ...state,
    sessionInfo: null,
    activeConnections: new Map(),
    participants: new Map(),
    chatHistory: [],
    bufferedMessages: [],
    thinkingPeers: new Set(),
    isComponentAttached: false,
  };
  emitChange();
}

export function updateSessionInfo(updates: Partial<ConnectSessionInfo>) {
  if (!state.sessionInfo) return;
  state = {
    ...state,
    sessionInfo: {
      ...state.sessionInfo,
      ...updates,
      updatedAt: Date.now(),
    },
  };
  emitChange();
}

// Connection management
export function addConnection(peerId: string, connection: DataConnection) {
  const newConnections = new Map(state.activeConnections);
  newConnections.set(peerId, connection);
  state = { ...state, activeConnections: newConnections };
  emitChange();
}

export function removeConnection(peerId: string) {
  const newConnections = new Map(state.activeConnections);
  newConnections.delete(peerId);
  state = { ...state, activeConnections: newConnections };
  emitChange();
}

export function getConnection(peerId: string): DataConnection | undefined {
  return state.activeConnections.get(peerId);
}

// Participant management
export function setParticipants(participants: Map<string, Participant>) {
  state = { ...state, participants: new Map(participants) };
  emitChange();
}

export function addParticipant(peerId: string, participant: Participant) {
  const newParticipants = new Map(state.participants);
  newParticipants.set(peerId, participant);
  state = { ...state, participants: newParticipants };
  emitChange();
}

export function updateParticipant(peerId: string, data: Partial<Participant>) {
  const newParticipants = new Map(state.participants);
  const existing = newParticipants.get(peerId);
  if (existing) {
    newParticipants.set(peerId, { ...existing, ...data });
    state = { ...state, participants: newParticipants };
    emitChange();
  }
}

export function removeParticipant(peerId: string) {
  const newParticipants = new Map(state.participants);
  newParticipants.delete(peerId);
  state = { ...state, participants: newParticipants };
  emitChange();
}

// Chat history management
export function addChatMessage(message: ChatItemType) {
  const newHistory = [...state.chatHistory, message];
  state = { ...state, chatHistory: newHistory };
  emitChange();
}

export function addChatMessages(messages: ChatItemType[]) {
  const newHistory = [...state.chatHistory, ...messages];
  state = { ...state, chatHistory: newHistory };
  emitChange();
}

export function setChatHistory(messages: ChatItemType[]) {
  state = { ...state, chatHistory: messages };
  emitChange();
}

export function clearChatHistory() {
  state = { ...state, chatHistory: [] };
  emitChange();
}

// Message buffering
export function bufferMessage(message: ChatItemType) {
  // Limit buffered messages to 100 to prevent memory issues
  const newBuffered = [...state.bufferedMessages, message].slice(-100);
  state = { ...state, bufferedMessages: newBuffered };
  emitChange();
}

export function clearBufferedMessages() {
  state = { ...state, bufferedMessages: [] };
  emitChange();
}

export function getBufferedMessages(): ChatItemType[] {
  return [...state.bufferedMessages];
}

// Thinking peers management
export function addThinkingPeer(peerId: string) {
  const newThinkingPeers = new Set(state.thinkingPeers);
  newThinkingPeers.add(peerId);
  state = { ...state, thinkingPeers: newThinkingPeers };
  emitChange();
}

export function removeThinkingPeer(peerId: string) {
  const newThinkingPeers = new Set(state.thinkingPeers);
  newThinkingPeers.delete(peerId);
  state = { ...state, thinkingPeers: newThinkingPeers };
  emitChange();
}

// Component attachment
export function attachComponent() {
  state = { ...state, isComponentAttached: true };
  emitChange();
}

export function detachComponent() {
  state = { ...state, isComponentAttached: false };
  emitChange();
}

// Direct state access (for non-reactive use)
export function getState(): ConnectStoreState {
  return state;
}

// React hook
export function useConnectStore() {
  const currentState = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const setSessionAction = useCallback((info: ConnectSessionInfo) => {
    setSession(info);
  }, []);

  const clearSessionAction = useCallback(() => {
    clearSession();
  }, []);

  const addConnectionAction = useCallback(
    (peerId: string, connection: DataConnection) => {
      addConnection(peerId, connection);
    },
    []
  );

  const removeConnectionAction = useCallback((peerId: string) => {
    removeConnection(peerId);
  }, []);

  const addParticipantAction = useCallback(
    (peerId: string, participant: Participant) => {
      addParticipant(peerId, participant);
    },
    []
  );

  const updateParticipantAction = useCallback(
    (peerId: string, data: Partial<Participant>) => {
      updateParticipant(peerId, data);
    },
    []
  );

  const removeParticipantAction = useCallback((peerId: string) => {
    removeParticipant(peerId);
  }, []);

  const bufferMessageAction = useCallback((message: ChatItemType) => {
    bufferMessage(message);
  }, []);

  const clearBufferedMessagesAction = useCallback(() => {
    clearBufferedMessages();
  }, []);

  const attachComponentAction = useCallback(() => {
    attachComponent();
  }, []);

  const detachComponentAction = useCallback(() => {
    detachComponent();
  }, []);

  const updateSessionInfoAction = useCallback(
    (updates: Partial<ConnectSessionInfo>) => {
      updateSessionInfo(updates);
    },
    []
  );

  const addChatMessageAction = useCallback((message: ChatItemType) => {
    addChatMessage(message);
  }, []);

  const addChatMessagesAction = useCallback((messages: ChatItemType[]) => {
    addChatMessages(messages);
  }, []);

  const setChatHistoryAction = useCallback((messages: ChatItemType[]) => {
    setChatHistory(messages);
  }, []);

  const clearChatHistoryAction = useCallback(() => {
    clearChatHistory();
  }, []);

  return {
    // State
    sessionInfo: currentState.sessionInfo,
    activeConnections: currentState.activeConnections,
    participants: currentState.participants,
    chatHistory: currentState.chatHistory,
    bufferedMessages: currentState.bufferedMessages,
    thinkingPeers: currentState.thinkingPeers,
    isComponentAttached: currentState.isComponentAttached,

    // Actions
    setSession: setSessionAction,
    clearSession: clearSessionAction,
    updateSessionInfo: updateSessionInfoAction,
    addConnection: addConnectionAction,
    removeConnection: removeConnectionAction,
    addParticipant: addParticipantAction,
    updateParticipant: updateParticipantAction,
    removeParticipant: removeParticipantAction,
    addChatMessage: addChatMessageAction,
    addChatMessages: addChatMessagesAction,
    setChatHistory: setChatHistoryAction,
    clearChatHistory: clearChatHistoryAction,
    bufferMessage: bufferMessageAction,
    clearBufferedMessages: clearBufferedMessagesAction,
    attachComponent: attachComponentAction,
    detachComponent: detachComponentAction,
  };
}
