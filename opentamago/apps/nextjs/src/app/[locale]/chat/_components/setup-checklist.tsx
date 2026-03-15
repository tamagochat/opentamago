"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Card, CardHeader, CardContent } from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "~/components/ui/dropdown-menu";
import { Key, Cpu, UserPlus, User, Check, ChevronRight, FileUp, FileJson, Loader2 } from "lucide-react";
import { Link } from "~/i18n/routing";
import { useProviderSettings, useGenerationSettings, useCharacters, usePersonas } from "~/lib/db/hooks";
import { parseCharXToCharacter, parseJsonToCharacter } from "~/lib/charx/hooks";
import { CharacterEditor } from "./character-editor";
import { cn } from "~/lib/utils";

export function SetupChecklist() {
  const t = useTranslations("chat.setupChecklist");
  const tLeft = useTranslations("chat.leftPanel");
  const { getConfiguredProviders, isProviderReady, isLoading: providersLoading } = useProviderSettings();
  const { getChatSettings, isLoading: generationLoading } = useGenerationSettings();
  const { characters, saveCharacterWithAssets, isLoading: charactersLoading } = useCharacters();
  const { personas, isLoading: personasLoading } = usePersonas();

  const [characterEditorOpen, setCharacterEditorOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const charxInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const isLoading = providersLoading || generationLoading || charactersLoading || personasLoading;

  const handleCharxFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (charxInputRef.current) charxInputRef.current.value = "";

    setIsImporting(true);
    try {
      const saveData = await parseCharXToCharacter(file);
      const saved = await saveCharacterWithAssets(saveData);
      if (saved) toast.success(tLeft("importSuccess"), { description: saved.name });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      toast.error(tLeft("importError"), { description: msg });
    } finally {
      setIsImporting(false);
    }
  };

  const handleJsonFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (jsonInputRef.current) jsonInputRef.current.value = "";

    setIsImporting(true);
    try {
      const saveData = await parseJsonToCharacter(file);
      const saved = await saveCharacterWithAssets(saveData);
      if (saved) toast.success(tLeft("importSuccess"), { description: saved.name });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      toast.error(tLeft("importError"), { description: msg });
    } finally {
      setIsImporting(false);
    }
  };

  const steps = useMemo(() => {
    const hasProvider = getConfiguredProviders().length > 0;
    const chatSettings = getChatSettings();
    const hasValidModel = !!(
      chatSettings?.providerId &&
      chatSettings.model &&
      isProviderReady(chatSettings.providerId as Parameters<typeof isProviderReady>[0])
    );
    return [
      {
        key: "apiKey" as const,
        icon: Key,
        done: hasProvider,
        href: "/settings/api-keys",
      },
      {
        key: "models" as const,
        icon: Cpu,
        done: hasValidModel,
        href: "/settings/models",
      },
      {
        key: "character" as const,
        icon: UserPlus,
        done: characters.length > 0,
        href: null,
      },
      {
        key: "persona" as const,
        icon: User,
        done: personas.length > 0,
        href: "/settings/personas",
      },
    ];
  }, [getConfiguredProviders, getChatSettings, isProviderReady, characters.length, personas.length]);

  const completed = steps.filter((s) => s.done).length;

  if (isLoading || completed === steps.length) return null;

  const renderStepContent = (step: (typeof steps)[number], clickable: boolean) => {
    const Icon = step.icon;
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
          step.done ? "text-muted-foreground" : "",
          clickable && "hover:bg-muted cursor-pointer"
        )}
      >
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
            step.done
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
          )}
        >
          {step.done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-sm font-medium",
              step.done && "line-through"
            )}
          >
            {t(`steps.${step.key}.title`)}
          </p>
          <p className="text-muted-foreground text-xs">
            {t(`steps.${step.key}.description`)}
          </p>
        </div>
        {clickable && (
          <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0" />
        )}
      </div>
    );
  };

  return (
    <>
      <input
        ref={charxInputRef}
        type="file"
        accept=".charx"
        onChange={handleCharxFileChange}
        className="hidden"
        disabled={isImporting}
      />
      <input
        ref={jsonInputRef}
        type="file"
        accept=".json"
        onChange={handleJsonFileChange}
        className="hidden"
        disabled={isImporting}
      />
      <CharacterEditor
        open={characterEditorOpen}
        onOpenChange={setCharacterEditorOpen}
      />

      <Card className="w-full max-w-md">
        <CardHeader className="pb-3">
          <h3 className="text-lg font-semibold">{t("title")}</h3>
          <p className="text-muted-foreground text-sm">{t("description")}</p>
          <div className="flex items-center gap-3 pt-2">
            <Progress value={(completed / steps.length) * 100} className="h-2" />
            <span className="text-muted-foreground shrink-0 text-xs">
              {t("progress", { completed, total: steps.length })}
            </span>
          </div>
        </CardHeader>
        <CardContent className="grid gap-1 pt-0">
          {steps.map((step) => {
            if (step.key === "character") {
              return (
                <DropdownMenu key={step.key}>
                  <DropdownMenuTrigger asChild>
                    <div>{renderStepContent(step, true)}</div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem onClick={() => setCharacterEditorOpen(true)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      {tLeft("createCharacter")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => charxInputRef.current?.click()} disabled={isImporting}>
                      {isImporting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <FileUp className="mr-2 h-4 w-4" />
                      )}
                      {isImporting ? tLeft("importing") : tLeft("importCharx")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => jsonInputRef.current?.click()} disabled={isImporting}>
                      {isImporting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <FileJson className="mr-2 h-4 w-4" />
                      )}
                      {isImporting ? tLeft("importing") : tLeft("importJson")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }

            if (step.href) {
              return (
                <Link key={step.key} href={step.href}>
                  {renderStepContent(step, true)}
                </Link>
              );
            }

            return <div key={step.key}>{renderStepContent(step, false)}</div>;
          })}
        </CardContent>
      </Card>
    </>
  );
}
