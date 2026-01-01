"use client";

import { useState } from "react";
import { Code, Puzzle, ChevronDown, ChevronRight, Regex, Zap } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/components/ui/tabs";
import type { RisuModule } from "~/lib/charx/types";

interface ModuleDisplayProps {
  module: RisuModule;
}

function TriggerItem({
  trigger,
  index,
}: {
  trigger: Record<string, unknown>;
  index: number;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const name = (trigger.name as string) || `Trigger ${index + 1}`;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md bg-muted/50 p-3 hover:bg-muted transition-colors">
        <div className="flex items-center gap-3">
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <Zap className="h-4 w-4 text-yellow-500" />
          <span className="font-medium text-sm">{name}</span>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 rounded-md border p-4">
          <pre className="whitespace-pre-wrap text-xs font-mono overflow-auto max-h-[200px]">
            {JSON.stringify(trigger, null, 2)}
          </pre>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function RegexItem({
  regex,
  index,
}: {
  regex: Record<string, unknown>;
  index: number;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const name = (regex.name as string) || `Regex ${index + 1}`;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md bg-muted/50 p-3 hover:bg-muted transition-colors">
        <div className="flex items-center gap-3">
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <Regex className="h-4 w-4 text-blue-500" />
          <span className="font-medium text-sm">{name}</span>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 rounded-md border p-4">
          <pre className="whitespace-pre-wrap text-xs font-mono overflow-auto max-h-[200px]">
            {JSON.stringify(regex, null, 2)}
          </pre>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function ModuleDisplay({ module }: ModuleDisplayProps) {
  const hasContent =
    module.trigger.length > 0 ||
    module.regex.length > 0 ||
    module.cjs ||
    module.lorebook.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Puzzle className="h-5 w-5" />
          Module: {module.name || "Unnamed"}
        </CardTitle>
        <CardDescription>
          {module.description || "No description"}
        </CardDescription>
        <div className="flex flex-wrap gap-2 pt-2">
          {module.trigger.length > 0 && (
            <Badge variant="secondary">
              <Zap className="h-3 w-3 mr-1" />
              {module.trigger.length} Triggers
            </Badge>
          )}
          {module.regex.length > 0 && (
            <Badge variant="secondary">
              <Regex className="h-3 w-3 mr-1" />
              {module.regex.length} Regex
            </Badge>
          )}
          {module.cjs && (
            <Badge variant="secondary">
              <Code className="h-3 w-3 mr-1" />
              CJS Code
            </Badge>
          )}
          {module.low_level_access && (
            <Badge variant="destructive">Low Level Access</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!hasContent ? (
          <div className="text-center py-8 text-muted-foreground">
            <Puzzle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No module content found</p>
          </div>
        ) : (
          <Tabs defaultValue="triggers" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="triggers">
                Triggers ({module.trigger.length})
              </TabsTrigger>
              <TabsTrigger value="regex">
                Regex ({module.regex.length})
              </TabsTrigger>
              <TabsTrigger value="code">Code</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[350px] mt-4">
              <TabsContent value="triggers" className="mt-0 space-y-2">
                {module.trigger.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No trigger scripts
                  </div>
                ) : (
                  module.trigger.map((trigger, i) => (
                    <TriggerItem key={i} trigger={trigger} index={i} />
                  ))
                )}
              </TabsContent>

              <TabsContent value="regex" className="mt-0 space-y-2">
                {module.regex.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No regex scripts
                  </div>
                ) : (
                  module.regex.map((regex, i) => (
                    <RegexItem key={i} regex={regex} index={i} />
                  ))
                )}
              </TabsContent>

              <TabsContent value="code" className="mt-0">
                {module.cjs ? (
                  <div className="rounded-md bg-muted/50 p-4">
                    <pre className="whitespace-pre-wrap text-xs font-mono overflow-auto">
                      {module.cjs}
                    </pre>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No CommonJS code
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        )}

        {(module.id || module.namespace) && (
          <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 text-xs text-muted-foreground">
            {module.id && <span>ID: {module.id}</span>}
            {module.namespace && <span>Namespace: {module.namespace}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
