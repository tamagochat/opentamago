"use client";

import { memo, useState, useRef, useCallback } from "react";
import { Send } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

interface ChatRoomInputProps {
  placeholder: string;
  onSendMessage: (content: string, isHuman: boolean) => void;
}

/**
 * Isolated input component for the ChatRoom.
 * Memoized and manages its own input state to prevent re-renders
 * of the parent ChatRoom component (messages, participants, etc.) when typing.
 */
export const ChatRoomInput = memo(function ChatRoomInput({
  placeholder,
  onSendMessage,
}: ChatRoomInputProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const isComposingRef = useRef(false);

  const handleSend = useCallback(() => {
    // Don't submit while IME composition is active (CJK input)
    if (isComposingRef.current) return;
    if (!input.trim()) return;

    onSendMessage(input.trim(), true);
    setInput("");
    inputRef.current?.focus();
  }, [input, onSendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && !isComposingRef.current) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback(() => {
    isComposingRef.current = false;
  }, []);

  return (
    <div className="p-4 border-t">
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button onClick={handleSend} disabled={!input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});
