"use client";

import { useState } from "react";
import { Brain, ChevronDown, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { cn } from "~/lib/utils";

interface ReasoningCollapsibleProps {
  reasoning: string;
  className?: string;
}

export function ReasoningCollapsible({
  reasoning,
  className,
}: ReasoningCollapsibleProps) {
  const t = useTranslations("chat.centerPanel");
  const [isOpen, setIsOpen] = useState(false);

  if (!reasoning) return null;

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn("mb-2", className)}
    >
      <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group">
        <Brain className="h-3.5 w-3.5" />
        <span>{t("reasoning")}</span>
        {isOpen ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <div className="rounded-lg bg-muted/50 border border-border/50 p-3 text-xs text-muted-foreground whitespace-pre-wrap max-h-[200px] overflow-y-auto">
          {reasoning}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
