"use client";

import { JsonView, defaultStyles } from "react-json-view-lite";
import "react-json-view-lite/dist/index.css";
import { cn } from "~/lib/utils";

interface JsonViewerProps {
  data: unknown;
  className?: string;
  defaultExpandLevel?: number;
  shouldExpandNode?: (
    level: number,
    value: unknown,
    field: string | undefined
  ) => boolean;
}

export function JsonViewer({
  data,
  className,
  defaultExpandLevel = 2,
  shouldExpandNode,
}: JsonViewerProps) {
  const expandNode = shouldExpandNode ?? ((level) => level < defaultExpandLevel);

  return (
    <div
      className={cn(
        "rounded-md bg-muted/50 p-3 text-sm",
        className
      )}
    >
      <JsonView
        data={typeof data === "object" ? JSON.parse(JSON.stringify(data)) : data}
        shouldExpandNode={expandNode}
        clickToExpandNode
        style={{
          ...defaultStyles,
          container: "font-mono text-xs leading-loose",
          basicChildStyle: "pl-4 border-l border-muted-foreground/20 ml-2",
          label: "text-blue-600 dark:text-blue-400 cursor-pointer hover:underline",
          nullValue: "text-muted-foreground",
          undefinedValue: "text-muted-foreground",
          stringValue: "text-green-600 dark:text-green-400",
          booleanValue: "text-amber-600 dark:text-amber-400",
          numberValue: "text-purple-600 dark:text-purple-400",
          otherValue: "text-foreground",
          punctuation: "text-muted-foreground",
        }}
      />
    </div>
  );
}
