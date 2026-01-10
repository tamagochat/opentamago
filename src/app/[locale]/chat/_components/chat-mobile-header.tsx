"use client";

import { useState, useEffect } from "react";
import { Egg, Menu, PanelRight, Settings } from "lucide-react";
import { Link } from "~/i18n/routing";
import { Button } from "~/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { ThemeToggle } from "~/components/theme-toggle";
import { Skeleton } from "~/components/ui/skeleton";
import { Sheet, SheetTrigger } from "~/components/ui/sheet";
import type { CharacterDocument, ChatDocument } from "~/lib/db/schemas";
import { cn } from "~/lib/utils";

interface ChatMobileHeaderProps {
  character: CharacterDocument | null;
  chat: ChatDocument | null;
  onMenuClick: () => void;
  onSettingsClick: () => void;
  rightPanelOpen?: boolean;
  onRightPanelOpenChange?: (open: boolean) => void;
  className?: string;
}

export function ChatMobileHeader({
  character,
  chat,
  onMenuClick,
  onSettingsClick,
  rightPanelOpen,
  onRightPanelOpenChange,
  className,
}: ChatMobileHeaderProps) {
  const [mounted, setMounted] = useState(false);

  // Three states: no character, character only, character + chat
  const hasCharacter = !!character;
  const hasChat = !!chat;

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header
      className={cn(
        "flex shrink-0 items-center justify-between border-b bg-background px-2 h-14 md:hidden",
        className
      )}
    >
      {/* Left Section */}
      <div className="flex items-center gap-2 min-w-0">
        <Button variant="ghost" size="icon" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>

        {hasCharacter ? (
          // Character selected: show character info
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarImage src={character.avatarData} />
              <AvatarFallback className="text-xs">
                {character.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{character.name}</p>
              {hasChat && (
                <p className="text-xs text-muted-foreground truncate">{chat.title}</p>
              )}
            </div>
          </div>
        ) : (
          // No character: show branding
          <Link href="/" className="flex items-center gap-2">
            <Egg className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold">OpenTamago</span>
          </Link>
        )}
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Settings and theme - show when no chat is active */}
        {!hasChat && (
          <>
            <Button variant="ghost" size="icon" onClick={onSettingsClick}>
              <Settings className="h-4 w-4" />
            </Button>
            {mounted ? (
              <ThemeToggle variant="ghost" />
            ) : (
              <Skeleton className="h-9 w-9 rounded-md" />
            )}
          </>
        )}

        {/* Right panel toggle - show when character is selected (rightmost) */}
        {hasCharacter && onRightPanelOpenChange && (
          <Sheet open={rightPanelOpen} onOpenChange={onRightPanelOpenChange}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <PanelRight className="h-4 w-4" />
              </Button>
            </SheetTrigger>
          </Sheet>
        )}
      </div>
    </header>
  );
}
