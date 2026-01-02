"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Download,
  Loader2,
  Lock,
  CheckCircle2,
  AlertCircle,
  FileArchive,
  Share2,
  Save,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Progress } from "~/components/ui/progress";
import { MainLayout } from "~/components/layout";
import { WebRTCProvider, useWebRTCPeer, useDownloader } from "~/app/_components/p2p";
import { Link, useRouter } from "~/i18n/routing";
import { parseCharXAsync } from "~/lib/charx";
import { useCharacters } from "~/lib/db/hooks/useCharacters";
import { useDatabase } from "~/lib/db/hooks/useDatabase";
import type { CharacterCardV3 } from "~/lib/charx/types";
import type { CharacterDocument } from "~/lib/db/schemas";

interface DownloadClientProps {
  uploaderPeerId: string;
  fileName: string | null;
  fileSize: number | null;
  hasPassword: boolean;
  slug: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function convertCardToDocument(card: CharacterCardV3): Omit<CharacterDocument, "id" | "createdAt" | "updatedAt"> {
  const data = card.data;
  
  return {
    name: data.name || "Unnamed Character",
    description: data.description || "",
    personality: data.personality || "",
    scenario: data.scenario || "",
    firstMessage: data.first_mes || "",
    exampleDialogue: data.mes_example || "",
    systemPrompt: data.system_prompt || "",
    creatorNotes: data.creator_notes || "",
    tags: data.tags || [],
    avatarData: undefined, // TODO: Extract avatar from assets if available
  };
}

function DownloadContent({
  uploaderPeerId,
  fileName,
  fileSize,
  hasPassword,
}: Omit<DownloadClientProps, "slug">) {
  const t = useTranslations("p2p.download");
  const tCharx = useTranslations("charx.export");
  const { peer, isConnecting: peerConnecting, error: peerError } = useWebRTCPeer();
  const [password, setPassword] = useState("");
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const { createCharacter } = useCharacters();
  const { db, isLoading: dbLoading, error: dbError } = useDatabase();

  const {
    state,
    error,
    fileInfo,
    progress,
    downloadedBlob,
    submitPassword,
    startDownload,
    reconnect,
  } = useDownloader({
    peer,
    uploaderPeerId,
  });

  // Show troubleshooting after 5 seconds of connecting
  useEffect(() => {
    if (state === "connecting") {
      const timer = setTimeout(() => setShowTroubleshooting(true), 5000);
      return () => clearTimeout(timer);
    }
    setShowTroubleshooting(false);
  }, [state]);

  const displayFileName = fileInfo?.name || fileName || "Unknown file";
  const displayFileSize = fileInfo?.size || fileSize || 0;
  const isCharXFile = displayFileName.toLowerCase().endsWith(".charx");

  const handleSaveToDatabase = useCallback(async () => {
    if (!downloadedBlob || !fileInfo) return;

    // Check for database errors
    if (dbError) {
      console.error("Database error:", dbError);
      toast.error(tCharx("error.title"), {
        description: tCharx("error.databaseInitFailed"),
      });
      return;
    }

    // Don't proceed if database is still loading
    if (!db || dbLoading) {
      toast.error(tCharx("error.title"), {
        description: tCharx("error.databaseNotReady"),
      });
      return;
    }

    setIsSaving(true);
    try {
      // Convert blob to File for parsing
      const file = new File([downloadedBlob], fileInfo.name, {
        type: fileInfo.type || "application/octet-stream",
      });

      // Parse the charx file
      const parsed = await parseCharXAsync(file);

      if (!parsed.card) {
        throw new Error("No character card found in .charx file");
      }

      // Convert and save character
      const characterData = convertCardToDocument(parsed.card);
      const savedCharacter = await createCharacter(characterData);

      if (!savedCharacter) {
        throw new Error("createCharacter returned null - database may not be initialized");
      }

      const characterName = parsed.card.data.name || "Unnamed Character";
      toast.success(tCharx("success.title"), {
        description: tCharx("success.description", { name: characterName }),
        action: {
          label: tCharx("success.goToChat"),
          onClick: () => {
            router.push("/chat");
          },
        },
      });
    } catch (error) {
      console.error("Failed to save character:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(tCharx("error.title"), {
        description: tCharx("error.description") + (errorMessage ? `: ${errorMessage}` : ""),
      });
    } finally {
      setIsSaving(false);
    }
  }, [downloadedBlob, fileInfo, db, dbLoading, dbError, createCharacter, router, tCharx]);

  // Connecting State
  if (peerConnecting || state === "connecting") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <div>
          <h2 className="text-xl font-semibold">{t("connecting")}</h2>
          {showTroubleshooting && (
            <p className="mt-2 text-sm text-muted-foreground">
              {t("troubleshooting")}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Error State
  if (state === "error" || peerError) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div>
          <h2 className="text-xl font-semibold">{t("connectionFailed")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {error || peerError}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={reconnect}>
            {t("submit")}
          </Button>
          <Link href="/p2p">
            <Button>{t("goHome")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Password Required State
  if (state === "password-required" || state === "password-error") {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">{t("passwordRequired")}</h2>
          {state === "password-error" && (
            <p className="mt-2 text-sm text-destructive">{t("passwordError")}</p>
          )}
        </div>

        <div className="w-full max-w-xs space-y-4">
          <Input
            type="password"
            placeholder={t("passwordPlaceholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && password) {
                submitPassword(password);
              }
            }}
          />
          <Button
            onClick={() => submitPassword(password)}
            disabled={!password}
            className="w-full"
          >
            {t("submit")}
          </Button>
        </div>
      </div>
    );
  }

  // Ready to Download State
  if (state === "ready") {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <FileArchive className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">{t("readyTitle")}</h2>
          <p className="mt-2 text-muted-foreground">{t("readyDescription")}</p>
        </div>

        <div className="w-full max-w-md rounded-lg border bg-muted/50 p-4">
          <div className="flex items-center gap-3">
            <FileArchive className="h-10 w-10 text-primary" />
            <div className="flex-1 text-left">
              <p className="font-medium truncate">{displayFileName}</p>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(displayFileSize)}
              </p>
            </div>
          </div>
        </div>

        <Button onClick={startDownload} size="lg">
          <Download className="mr-2 h-5 w-5" />
          {t("startDownload")}
        </Button>
      </div>
    );
  }

  // Downloading State
  if (state === "downloading") {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">{t("downloading")}</h2>
          <p className="mt-2 text-muted-foreground">{displayFileName}</p>
        </div>

        <div className="w-full max-w-md space-y-2">
          <Progress value={progress} className="h-3" />
          <p className="text-sm text-muted-foreground">
            {Math.round(progress)}%
          </p>
        </div>
      </div>
    );
  }

  // Complete State
  if (state === "complete") {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
          <CheckCircle2 className="h-8 w-8 text-green-500" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">{t("complete")}</h2>
          <p className="mt-2 text-muted-foreground">{t("completeDescription")}</p>
        </div>

        {isCharXFile && (
          <div className="w-full max-w-md rounded-lg border bg-muted/50 p-4">
            <p className="text-sm font-medium mb-2">{t("charxDetected")}</p>
            <p className="text-xs text-muted-foreground mb-4">
              {t("charxDescription")}
            </p>
            <Button
              onClick={handleSaveToDatabase}
              disabled={isSaving || dbLoading || !db || !!dbError}
              className="w-full gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {tCharx("saving")}
                </>
              ) : dbLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {tCharx("initializing")}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {t("saveToDatabase")}
                </>
              )}
            </Button>
            {dbError && (
              <p className="text-xs text-destructive mt-2">
                {tCharx("error.databaseInitFailed")}
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <Link href="/p2p">
            <Button variant="outline">{t("downloadAnother")}</Button>
          </Link>
          <Link href="/">
            <Button>{t("goHome")}</Button>
          </Link>
        </div>

        <div className="mt-4 pt-4 border-t w-full max-w-md">
          <p className="text-sm text-muted-foreground mb-3">{t("sharePrompt")}</p>
          <Link href="/p2p">
            <Button variant="secondary" className="gap-2">
              <Share2 className="h-4 w-4" />
              {t("startSharing")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return null;
}

export function DownloadClient(props: DownloadClientProps) {
  const t = useTranslations("p2p.download");

  return (
    <MainLayout showFooter={false}>
      <div className="container max-w-4xl py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Share2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t("title")}</h1>
              {props.fileName && (
                <p className="text-sm text-muted-foreground">{props.fileName}</p>
              )}
            </div>
          </div>
        </div>

        <WebRTCProvider>
          <DownloadContent {...props} />
        </WebRTCProvider>
      </div>
    </MainLayout>
  );
}
