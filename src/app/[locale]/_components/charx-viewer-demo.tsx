"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileArchive,
  User,
  Image,
  Code,
  Tag,
  MessageSquare,
  Smile,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";

type DemoState = "idle" | "dragging" | "dropping" | "processing" | "viewing";

interface DemoTab {
  id: string;
  icon: React.ReactNode;
  label: string;
}

const DEMO_CHARACTER = {
  name: "Luna",
  creator: "OpenTamago",
  tags: ["Fantasy", "Magic", "Adventure"],
  description: "A mysterious mage with ancient knowledge and a gentle heart. She travels the realms seeking lost artifacts.",
};

const DEMO_ASSETS = [
  { name: "happy", color: "from-yellow-200 to-orange-200" },
  { name: "sad", color: "from-blue-200 to-indigo-200" },
  { name: "angry", color: "from-red-200 to-pink-200" },
  { name: "neutral", color: "from-gray-200 to-slate-200" },
  { name: "avatar", color: "from-purple-200 to-violet-200" },
  { name: "bg_forest", color: "from-green-200 to-emerald-200" },
];

const DEMO_JSON = `{
  "spec": "chara_card_v3",
  "data": {
    "name": "Luna",
    "description": "A mysterious mage...",
    "personality": "Wise, gentle",
    "first_mes": "Hello, traveler...",
    "tags": ["Fantasy", "Magic"]
  }
}`;

export function CharxViewerDemo() {
  const t = useTranslations("home");
  const [state, setState] = useState<DemoState>("idle");
  const [activeTab, setActiveTab] = useState(0);

  const tabs: DemoTab[] = [
    { id: "character", icon: <User className="h-3 w-3" />, label: t("demo.charx.tabs.character") },
    { id: "assets", icon: <Image className="h-3 w-3" />, label: t("demo.charx.tabs.assets") },
    { id: "json", icon: <Code className="h-3 w-3" />, label: "JSON" },
  ];

  useEffect(() => {
    let cancelled = false;

    const runSequence = async () => {
      while (!cancelled) {
        // Initial pause - show empty dropzone
        setState("idle");
        setActiveTab(0);
        await new Promise((r) => setTimeout(r, 2000));
        if (cancelled) return;

        // File dragging animation
        setState("dragging");
        await new Promise((r) => setTimeout(r, 1200));
        if (cancelled) return;

        // Drop animation
        setState("dropping");
        await new Promise((r) => setTimeout(r, 600));
        if (cancelled) return;

        // Processing animation
        setState("processing");
        await new Promise((r) => setTimeout(r, 1200));
        if (cancelled) return;

        // View character tab
        setState("viewing");
        await new Promise((r) => setTimeout(r, 3000));
        if (cancelled) return;

        // View assets tab
        setActiveTab(1);
        await new Promise((r) => setTimeout(r, 3000));
        if (cancelled) return;

        // View JSON tab
        setActiveTab(2);
        await new Promise((r) => setTimeout(r, 3000));
        if (cancelled) return;
      }
    };

    runSequence();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border bg-gradient-to-br from-muted to-muted/50 shadow-xl"
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
          {(state === "idle" || state === "dragging" || state === "dropping") && (
            <motion.div
              key="dropzone"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex h-full items-center justify-center p-4"
            >
              {/* Drop Zone */}
              <motion.div
                animate={{
                  borderColor: state !== "idle" ? "hsl(var(--primary))" : "hsl(var(--border))",
                  backgroundColor: state !== "idle" ? "hsl(var(--primary) / 0.05)" : "transparent",
                  scale: state === "dropping" ? 0.98 : 1,
                }}
                transition={{ duration: 0.2 }}
                className="relative flex h-full w-full max-w-xs flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed sm:gap-4"
              >
                <motion.div
                  animate={{
                    scale: state === "dragging" ? 1.1 : 1,
                    opacity: state === "dropping" ? 0 : 1,
                  }}
                  className="rounded-xl bg-primary/10 p-3 sm:p-4"
                >
                  <FileArchive className="h-8 w-8 text-primary sm:h-10 sm:w-10" />
                </motion.div>
                <motion.div
                  animate={{ opacity: state === "dropping" ? 0 : 1 }}
                  className="text-center"
                >
                  <p className="text-sm font-medium sm:text-base">{t("showcase.dropzone.title")}</p>
                  <p className="text-xs text-muted-foreground sm:text-sm">{t("showcase.dropzone.subtitle")}</p>
                </motion.div>

                {/* Dropping file animation - inside dropzone */}
                <AnimatePresence>
                  {state === "dropping" && (
                    <motion.div
                      initial={{ scale: 1, opacity: 1 }}
                      animate={{ scale: 0.6, opacity: 0 }}
                      transition={{ duration: 0.5, ease: "easeIn" }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <Card className="flex items-center gap-2 border-primary bg-background p-2 shadow-lg sm:gap-3 sm:p-3">
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

              {/* Floating File - outside dropzone during drag */}
              <AnimatePresence>
                {state === "dragging" && (
                  <motion.div
                    initial={{ x: 100, y: -60, opacity: 0, rotate: 8, scale: 0.8 }}
                    animate={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: "spring", damping: 20, stiffness: 150 }}
                    className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
                  >
                    <Card className="flex items-center gap-2 border-primary bg-background p-2 shadow-lg sm:gap-3 sm:p-3">
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

          {state === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex h-full items-center justify-center"
            >
              <div className="flex flex-col items-center gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent sm:h-10 sm:w-10"
                />
                <p className="text-sm text-muted-foreground">{t("demo.charx.processing")}</p>
              </div>
            </motion.div>
          )}

          {state === "viewing" && (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="flex h-full flex-col p-2 sm:p-3"
            >
              {/* Tabs */}
              <div className="mb-2 flex gap-0.5 rounded-lg bg-muted/50 p-0.5 sm:gap-1 sm:p-1">
                {tabs.map((tab, index) => (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(index)}
                    animate={{
                      backgroundColor: activeTab === index ? "hsl(var(--background))" : "transparent",
                      boxShadow: activeTab === index ? "0 1px 3px 0 rgb(0 0 0 / 0.1)" : "none",
                    }}
                    className={`flex flex-1 items-center justify-center gap-1 rounded-md px-1.5 py-1 text-[10px] transition-colors sm:gap-1.5 sm:px-2 sm:py-1.5 sm:text-xs ${
                      activeTab === index ? "font-medium text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {tab.icon}
                    <span className="hidden xs:inline sm:inline">{tab.label}</span>
                  </motion.button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="relative flex-1 overflow-hidden rounded-lg border bg-background/50">
                <AnimatePresence mode="wait">
                  {activeTab === 0 && (
                    <motion.div
                      key="character"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="absolute inset-0 overflow-auto p-2 sm:p-3"
                    >
                      {/* Character Card Preview */}
                      <div className="space-y-2 sm:space-y-3">
                        <div className="flex items-start gap-2 sm:gap-3">
                          {/* Avatar placeholder */}
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-purple-200 to-violet-300 sm:h-14 sm:w-14"
                          >
                            <div className="flex h-full w-full items-center justify-center">
                              <User className="h-6 w-6 text-purple-600/60 sm:h-7 sm:w-7" />
                            </div>
                          </motion.div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-semibold sm:text-base">{DEMO_CHARACTER.name}</h4>
                            <p className="text-[10px] text-muted-foreground sm:text-xs">by {DEMO_CHARACTER.creator}</p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {DEMO_CHARACTER.tags.map((tag, i) => (
                                <motion.div
                                  key={tag}
                                  initial={{ scale: 0.8, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ delay: 0.15 + i * 0.05 }}
                                >
                                  <Badge variant="secondary" className="gap-0.5 px-1 py-0 text-[9px] sm:text-[10px]">
                                    <Tag className="h-2 w-2" />
                                    {tag}
                                  </Badge>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="rounded-md bg-muted/50 p-2"
                        >
                          <p className="text-[10px] leading-relaxed text-muted-foreground sm:text-xs">{DEMO_CHARACTER.description}</p>
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 }}
                          className="flex items-center gap-3 text-[10px] text-muted-foreground sm:text-xs"
                        >
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            3 {t("demo.charx.greetings")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Image className="h-3 w-3" />
                            6 {t("demo.charx.tabs.assets").toLowerCase()}
                          </span>
                        </motion.div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 1 && (
                    <motion.div
                      key="assets"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="absolute inset-0 overflow-auto p-2 sm:p-3"
                    >
                      {/* Assets Preview */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-1 text-[10px] font-medium sm:text-xs">
                          <Smile className="h-3 w-3" />
                          <span>Emotions (4)</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                          {DEMO_ASSETS.slice(0, 4).map((asset, i) => (
                            <motion.div
                              key={asset.name}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.06 }}
                              className="group cursor-pointer"
                            >
                              <div className={`aspect-square overflow-hidden rounded-md bg-gradient-to-br ${asset.color}`}>
                                <div className="flex h-full w-full items-center justify-center">
                                  <Image className="h-4 w-4 text-gray-500/40 sm:h-5 sm:w-5" />
                                </div>
                              </div>
                              <p className="mt-0.5 truncate text-center text-[8px] text-muted-foreground sm:text-[9px]">{asset.name}</p>
                            </motion.div>
                          ))}
                        </div>

                        <div className="flex items-center gap-1 pt-1 text-[10px] font-medium sm:text-xs">
                          <Image className="h-3 w-3" />
                          <span>Other (2)</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                          {DEMO_ASSETS.slice(4).map((asset, i) => (
                            <motion.div
                              key={asset.name}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.24 + i * 0.06 }}
                              className="group cursor-pointer"
                            >
                              <div className={`aspect-square overflow-hidden rounded-md bg-gradient-to-br ${asset.color}`}>
                                <div className="flex h-full w-full items-center justify-center">
                                  <Image className="h-4 w-4 text-gray-500/40 sm:h-5 sm:w-5" />
                                </div>
                              </div>
                              <p className="mt-0.5 truncate text-center text-[8px] text-muted-foreground sm:text-[9px]">{asset.name}</p>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 2 && (
                    <motion.div
                      key="json"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="absolute inset-0 overflow-auto p-2 sm:p-3"
                    >
                      {/* JSON Preview */}
                      <motion.pre
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="overflow-auto rounded-md bg-muted/70 p-2 text-[8px] leading-relaxed sm:text-[10px]"
                      >
                        <code className="text-muted-foreground">{DEMO_JSON}</code>
                      </motion.pre>
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
