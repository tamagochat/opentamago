"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileArchive,
  User,
  Book,
  Image,
  Tag,
  MessageSquare,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";

type DemoState = "idle" | "dragging" | "dropped" | "viewing";

interface DemoTab {
  id: string;
  icon: React.ReactNode;
  label: string;
}

const DEMO_CHARACTER = {
  name: "Luna",
  creator: "OpenTamago",
  tags: ["Fantasy", "Magic", "Adventure"],
  description: "A mysterious mage with ancient knowledge...",
};

const DEMO_LOREBOOK_ENTRIES = [
  { keys: ["magic", "spell"], preview: "Ancient arcane arts..." },
  { keys: ["history", "kingdom"], preview: "The old kingdom fell..." },
  { keys: ["artifact", "staff"], preview: "The legendary staff..." },
];

const DEMO_ASSETS = [
  { type: "emotion", name: "happy" },
  { type: "emotion", name: "sad" },
  { type: "emotion", name: "angry" },
  { type: "icon", name: "avatar" },
];

export function CharxViewerDemo() {
  const t = useTranslations("home");
  const [state, setState] = useState<DemoState>("idle");
  const [activeTab, setActiveTab] = useState(0);
  const [autoPlayPaused, setAutoPlayPaused] = useState(false);

  const tabs: DemoTab[] = [
    { id: "character", icon: <User className="h-3 w-3" />, label: t("demo.charx.tabs.character") },
    { id: "lorebook", icon: <Book className="h-3 w-3" />, label: t("demo.charx.tabs.lorebook") },
    { id: "assets", icon: <Image className="h-3 w-3" />, label: t("demo.charx.tabs.assets") },
  ];

  const resetDemo = useCallback(() => {
    setState("idle");
    setActiveTab(0);
  }, []);

  useEffect(() => {
    if (autoPlayPaused) return;
    if (state !== "idle") return;

    let cancelled = false;

    const sequence = async () => {
      // Initial pause - show empty dropzone
      await new Promise((r) => setTimeout(r, 2500));
      if (cancelled) return;
      setState("dragging");

      // File dragging animation
      await new Promise((r) => setTimeout(r, 2000));
      if (cancelled) return;
      setState("dropped");

      // Processing pause
      await new Promise((r) => setTimeout(r, 1200));
      if (cancelled) return;
      setState("viewing");

      // View character tab
      await new Promise((r) => setTimeout(r, 3500));
      if (cancelled) return;
      setActiveTab(1);

      // View lorebook tab
      await new Promise((r) => setTimeout(r, 3500));
      if (cancelled) return;
      setActiveTab(2);

      // View assets tab
      await new Promise((r) => setTimeout(r, 3500));
      if (cancelled) return;

      // Reset after viewing all
      resetDemo();
    };

    sequence();

    return () => {
      cancelled = true;
    };
  }, [state, autoPlayPaused, resetDemo]);

  return (
    <div
      className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border bg-gradient-to-br from-muted to-muted/50 shadow-xl"
      onMouseEnter={() => setAutoPlayPaused(true)}
      onMouseLeave={() => {
        setAutoPlayPaused(false);
        resetDemo();
      }}
    >
      {/* Window Chrome */}
      <div className="absolute inset-x-0 top-0 z-10 flex h-8 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur-sm sm:h-10 sm:px-4">
        <div className="flex gap-1 sm:gap-1.5">
          <div className="h-2 w-2 rounded-full bg-red-500/80 sm:h-3 sm:w-3" />
          <div className="h-2 w-2 rounded-full bg-yellow-500/80 sm:h-3 sm:w-3" />
          <div className="h-2 w-2 rounded-full bg-green-500/80 sm:h-3 sm:w-3" />
        </div>
        <span className="ml-2 text-[10px] text-muted-foreground sm:text-xs">
          {t("showcase.badge")}
        </span>
      </div>

      {/* Content Area */}
      <div className="absolute inset-0 pt-8 sm:pt-10">
        <AnimatePresence mode="wait">
          {(state === "idle" || state === "dragging") && (
            <motion.div
              key="dropzone"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="flex h-full items-center justify-center p-4"
            >
              {/* Drop Zone */}
              <motion.div
                animate={{
                  borderColor: state === "dragging" ? "hsl(var(--primary))" : "hsl(var(--border))",
                  backgroundColor: state === "dragging" ? "hsl(var(--primary) / 0.05)" : "transparent",
                }}
                className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 sm:gap-4 sm:p-8"
              >
                <motion.div
                  animate={{
                    scale: state === "dragging" ? 1.1 : 1,
                  }}
                  className="rounded-xl bg-primary/10 p-3 sm:p-4"
                >
                  <FileArchive className="h-8 w-8 text-primary sm:h-12 sm:w-12" />
                </motion.div>
                <div className="text-center">
                  <p className="text-sm font-medium sm:text-base">{t("showcase.dropzone.title")}</p>
                  <p className="text-xs text-muted-foreground sm:text-sm">{t("showcase.dropzone.subtitle")}</p>
                </div>
              </motion.div>

              {/* Floating File */}
              <AnimatePresence>
                {state === "dragging" && (
                  <motion.div
                    initial={{ x: 150, y: -100, opacity: 0, rotate: 5 }}
                    animate={{
                      x: 0,
                      y: 0,
                      opacity: 1,
                      rotate: 0,
                    }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 120, duration: 0.8 }}
                    className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
                  >
                    <Card className="flex items-center gap-2 border-primary bg-background/95 p-2 shadow-lg backdrop-blur sm:gap-3 sm:p-3">
                      <FileArchive className="h-6 w-6 text-primary sm:h-8 sm:w-8" />
                      <div className="text-left">
                        <p className="text-xs font-medium sm:text-sm">Luna.charx</p>
                        <p className="text-[10px] text-muted-foreground sm:text-xs">2.4 MB</p>
                      </div>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {(state === "dropped" || state === "viewing") && (
            <motion.div
              key="content"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="flex h-full flex-col p-3 sm:p-4"
            >
              {/* Tabs */}
              <div className="mb-3 flex gap-1 rounded-lg bg-muted/50 p-1">
                {tabs.map((tab, index) => (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(index)}
                    animate={{
                      backgroundColor: activeTab === index ? "hsl(var(--background))" : "transparent",
                    }}
                    className="flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs transition-colors sm:gap-1.5 sm:px-3 sm:text-sm"
                  >
                    {tab.icon}
                    <span className="hidden sm:inline">{tab.label}</span>
                  </motion.button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="relative flex-1 overflow-hidden rounded-lg border bg-background/50">
                <AnimatePresence mode="wait">
                  {activeTab === 0 && (
                    <motion.div
                      key="character"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.35, ease: "easeInOut" }}
                      className="absolute inset-0 overflow-auto p-3 sm:p-4"
                    >
                      {/* Character Card Preview */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 sm:h-12 sm:w-12">
                            <User className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold sm:text-base">{DEMO_CHARACTER.name}</h4>
                            <p className="text-xs text-muted-foreground">by {DEMO_CHARACTER.creator}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {DEMO_CHARACTER.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="gap-1 text-xs">
                              <Tag className="h-2.5 w-2.5" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <div className="rounded-md bg-muted/50 p-2 sm:p-3">
                          <p className="text-xs text-muted-foreground sm:text-sm">{DEMO_CHARACTER.description}</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MessageSquare className="h-3 w-3" />
                          <span>3 {t("demo.charx.greetings")}</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 1 && (
                    <motion.div
                      key="lorebook"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.35, ease: "easeInOut" }}
                      className="absolute inset-0 overflow-auto p-3 sm:p-4"
                    >
                      {/* Lorebook Preview */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Book className="h-4 w-4" />
                          <span>{t("demo.charx.lorebookEntries", { count: DEMO_LOREBOOK_ENTRIES.length })}</span>
                        </div>
                        {DEMO_LOREBOOK_ENTRIES.map((entry, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="rounded-md border bg-muted/30 p-2 sm:p-3"
                          >
                            <div className="mb-1 flex flex-wrap gap-1">
                              {entry.keys.map((key) => (
                                <Badge key={key} variant="outline" className="text-xs">
                                  {key}
                                </Badge>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground">{entry.preview}</p>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 2 && (
                    <motion.div
                      key="assets"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.35, ease: "easeInOut" }}
                      className="absolute inset-0 overflow-auto p-3 sm:p-4"
                    >
                      {/* Assets Preview */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Image className="h-4 w-4" />
                          <span>{t("demo.charx.assetsFound", { count: DEMO_ASSETS.length })}</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {DEMO_ASSETS.map((asset, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.08 }}
                              className="aspect-square overflow-hidden rounded-lg border bg-gradient-to-br from-muted to-muted/30"
                            >
                              <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-1">
                                <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 sm:h-8 sm:w-8">
                                  <Image className="h-3 w-3 text-primary sm:h-4 sm:w-4" />
                                </div>
                                <span className="text-[8px] text-muted-foreground sm:text-[10px]">{asset.name}</span>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
