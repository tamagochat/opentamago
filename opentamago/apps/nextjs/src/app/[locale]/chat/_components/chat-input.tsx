"use client";

import { memo, useState, useRef, useCallback } from "react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Send, Loader2, UserCircle, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import type { PersonaDocument } from "~/lib/db/schemas";
import { cn } from "~/lib/utils";

interface ChatInputProps {
  onSubmit: (message: string) => void;
  isLoading: boolean;
  placeholder: string;
  personas: PersonaDocument[];
  selectedPersona: PersonaDocument | null;
  onPersonaSelect: (persona: PersonaDocument) => void;
  onCreatePersona: () => void;
  translations: {
    selectPersona: string;
    noPersonas: string;
    createPersona: string;
  };
}

export const ChatInput = memo(function ChatInput({
  onSubmit,
  isLoading,
  placeholder,
  personas,
  selectedPersona,
  onPersonaSelect,
  onCreatePersona,
  translations: t,
}: ChatInputProps) {
  const [inputValue, setInputValue] = useState("");
  const isComposingRef = useRef(false);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      // Don't submit while IME composition is active (CJK input)
      if (isComposingRef.current) return;
      if (!inputValue.trim() || isLoading) return;

      const message = inputValue.trim();
      setInputValue("");
      onSubmit(message);
    },
    [inputValue, isLoading, onSubmit]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey && !isComposingRef.current) {
        e.preventDefault();
        handleSubmit(e);
      }
    },
    [handleSubmit]
  );

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback(() => {
    isComposingRef.current = false;
  }, []);

  return (
    <div className="shrink-0 border-t bg-background p-4">
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        {/* Persona Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "shrink-0 h-[44px] w-[44px] p-0",
                !selectedPersona && "text-muted-foreground"
              )}
              title={selectedPersona?.name ?? t.selectPersona}
            >
              {selectedPersona ? (
                <Avatar className="h-6 w-6">
                  {selectedPersona.avatarData ? (
                    <AvatarImage src={selectedPersona.avatarData} />
                  ) : null}
                  <AvatarFallback className="text-xs">
                    {selectedPersona.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <UserCircle className="h-5 w-5" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {personas.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                {t.noPersonas}
              </div>
            ) : (
              personas.map((persona) => (
                <DropdownMenuItem
                  key={persona.id}
                  onClick={() => onPersonaSelect(persona)}
                  className={cn(
                    "flex items-center gap-2",
                    selectedPersona?.id === persona.id && "bg-accent"
                  )}
                >
                  <Avatar className="h-6 w-6 shrink-0">
                    {persona.avatarData ? (
                      <AvatarImage src={persona.avatarData} />
                    ) : null}
                    <AvatarFallback className="text-xs">
                      {persona.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{persona.name}</span>
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onCreatePersona}>
              <Plus className="mr-2 h-4 w-4" />
              {t.createPersona}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder={placeholder}
          className="max-h-32 min-h-[44px] resize-none"
          rows={1}
        />
        <Button
          type="submit"
          className="shrink-0 h-[44px] w-[44px] p-0"
          disabled={!inputValue.trim() || isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
});
