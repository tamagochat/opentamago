"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FolderHeart,
  User,
  Book,
  Image,
  MessageSquare,
  Search,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "~/components/ui/badge";

type DemoState = "idle" | "selecting" | "viewing" | "tabs" | "action";

interface DemoCharacter {
  id: number;
  name: string;
  creator: string;
  color: string;
  tags: string[];
}

const DEMO_CHARACTERS: DemoCharacter[] = [
  { id: 1, name: "Luna", creator: "OpenTamago", color: "bg-amber-100", tags: ["Fantasy", "Magic"] },
  { id: 2, name: "Kai", creator: "Creator2", color: "bg-sky-100", tags: ["Sci-Fi", "Tech"] },
  { id: 3, name: "Rose", creator: "Creator3", color: "bg-rose-100", tags: ["Romance"] },
  { id: 4, name: "Max", creator: "Creator4", color: "bg-emerald-100", tags: ["Adventure"] },
];

const SELECTED_CHARACTER = DEMO_CHARACTERS[0]!;

interface DemoTab {
  id: string;
  label: string;
  icon: React.ReactNode;
}

export function PokeboxDemo() {
  const t = useTranslations("home");
  const [state, setState] = useState<DemoState>("idle");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  const tabs: DemoTab[] = [
    { id: "character", label: t("demo.pokebox.tabs.character"), icon: <User className="h-2.5 w-2.5" /> },
    { id: "lorebook", label: t("demo.pokebox.tabs.lorebook"), icon: <Book className="h-2.5 w-2.5" /> },
    { id: "assets", label: t("demo.pokebox.tabs.assets"), icon: <Image className="h-2.5 w-2.5" /> },
  ];

  useEffect(() => {
    let cancelled = false;

    const runSequence = async () => {
      while (!cancelled) {
        // Reset state
        setState("idle");
        setSelectedId(null);
        setActiveTab(0);
        await new Promise((r) => setTimeout(r, 2000));
        if (cancelled) return;

        // Select a character
        setState("selecting");
        setSelectedId(1);
        await new Promise((r) => setTimeout(r, 1200));
        if (cancelled) return;

        // View character details
        setState("viewing");
        await new Promise((r) => setTimeout(r, 2500));
        if (cancelled) return;

        // Switch tabs
        setState("tabs");
        await new Promise((r) => setTimeout(r, 1200));
        setActiveTab(1); // Lorebook
        await new Promise((r) => setTimeout(r, 1500));
        if (cancelled) return;
        setActiveTab(2); // Assets
        await new Promise((r) => setTimeout(r, 1500));
        if (cancelled) return;

        // Show action (Chat button)
        setState("action");
        setActiveTab(0); // Back to character
        await new Promise((r) => setTimeout(r, 2500));
        if (cancelled) return;
      }
    };

    runSequence();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border bg-muted/70 shadow-xl">
      {/* Window Chrome */}
      <div className="absolute inset-x-0 top-0 z-10 flex h-8 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur-sm sm:h-10 sm:px-4">
        <div className="flex gap-1 sm:gap-1.5">
          <div className="h-2 w-2 rounded-full bg-red-500/80 sm:h-3 sm:w-3" />
          <div className="h-2 w-2 rounded-full bg-yellow-500/80 sm:h-3 sm:w-3" />
          <div className="h-2 w-2 rounded-full bg-green-500/80 sm:h-3 sm:w-3" />
        </div>
        <span className="ml-2 text-[10px] text-muted-foreground sm:text-xs">
          {t("pokeboxShowcase.badge")}
        </span>
      </div>

      {/* Content Area */}
      <div className="absolute inset-0 pt-8 sm:pt-10">
        <div className="flex h-full">
          {/* Character List (Left) */}
          <div className="flex w-[45%] flex-col border-r p-2 sm:w-[40%] sm:p-3">
            {/* Header */}
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1 text-[10px] font-medium sm:text-xs">
                <FolderHeart className="h-3 w-3 text-primary" />
                <span>{t("demo.pokebox.title")}</span>
                <Badge variant="secondary" className="ml-1 px-1 py-0 text-[8px]">
                  {DEMO_CHARACTERS.length}
                </Badge>
              </div>
            </div>

            {/* Search */}
            <div className="mb-2 flex items-center gap-1 rounded-md border bg-background/80 px-2 py-1">
              <Search className="h-2.5 w-2.5 text-muted-foreground" />
              <span className="text-[8px] text-muted-foreground sm:text-[9px]">
                {t("demo.pokebox.search")}
              </span>
            </div>

            {/* Character Grid */}
            <div className="grid flex-1 grid-cols-2 gap-1.5 overflow-hidden sm:gap-2">
              {DEMO_CHARACTERS.map((char) => (
                <motion.div
                  key={char.id}
                  animate={{
                    scale: selectedId === char.id ? 0.95 : 1,
                    borderColor: selectedId === char.id ? "hsl(var(--primary))" : "hsl(var(--border))",
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className={`relative cursor-pointer overflow-hidden rounded-lg border-2 bg-background/80 ${
                    selectedId === char.id ? "ring-2 ring-primary ring-offset-1" : ""
                  }`}
                >
                  {/* Avatar */}
                  <div className={`aspect-square ${char.color}`}>
                    <div className="flex h-full w-full items-center justify-center">
                      <User className="h-5 w-5 text-gray-500/40 sm:h-6 sm:w-6" />
                    </div>
                  </div>
                  {/* Name */}
                  <div className="p-1 sm:p-1.5">
                    <p className="truncate text-[8px] font-medium sm:text-[9px]">{char.name}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Detail Panel (Right) */}
          <div className="flex flex-1 flex-col p-2 sm:p-3">
            <AnimatePresence mode="wait">
              {!selectedId ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex h-full items-center justify-center"
                >
                  <p className="text-center text-[9px] text-muted-foreground sm:text-[10px]">
                    {t("demo.pokebox.selectHint")}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="detail"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="flex h-full flex-col"
                >
                  {/* Character Header */}
                  <div className="mb-2 flex items-center gap-2 sm:gap-3">
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className={`h-10 w-10 overflow-hidden rounded-lg sm:h-12 sm:w-12 ${SELECTED_CHARACTER.color}`}
                    >
                      <div className="flex h-full w-full items-center justify-center">
                        <User className="h-5 w-5 text-gray-500/40 sm:h-6 sm:w-6" />
                      </div>
                    </motion.div>
                    <div className="flex-1">
                      <h4 className="text-xs font-semibold sm:text-sm">{SELECTED_CHARACTER.name}</h4>
                      <p className="text-[8px] text-muted-foreground sm:text-[9px]">
                        by {SELECTED_CHARACTER.creator}
                      </p>
                      <div className="mt-0.5 flex gap-1">
                        {SELECTED_CHARACTER.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="px-1 py-0 text-[7px] sm:text-[8px]">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="mb-2 flex gap-0.5 rounded-lg bg-muted/50 p-0.5 sm:gap-1 sm:p-1">
                    {tabs.map((tab, index) => (
                      <motion.button
                        key={tab.id}
                        animate={{
                          backgroundColor: activeTab === index ? "hsl(var(--background))" : "transparent",
                          boxShadow: activeTab === index ? "0 1px 3px 0 rgb(0 0 0 / 0.1)" : "none",
                        }}
                        className={`flex flex-1 items-center justify-center gap-0.5 rounded-md px-1 py-1 text-[8px] transition-colors sm:gap-1 sm:px-2 sm:py-1.5 sm:text-[10px] ${
                          activeTab === index ? "font-medium text-foreground" : "text-muted-foreground"
                        }`}
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
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="absolute inset-0 overflow-auto p-1.5 sm:p-2"
                        >
                          <div className="space-y-1.5">
                            <div className="rounded-md bg-muted/50 p-1.5 sm:p-2">
                              <p className="mb-0.5 text-[8px] font-medium sm:text-[9px]">
                                {t("demo.pokebox.description")}
                              </p>
                              <p className="text-[7px] text-muted-foreground sm:text-[8px]">
                                {t("demo.pokebox.descriptionText")}
                              </p>
                            </div>
                            <div className="rounded-md bg-muted/50 p-1.5 sm:p-2">
                              <p className="mb-0.5 text-[8px] font-medium sm:text-[9px]">
                                {t("demo.pokebox.personality")}
                              </p>
                              <p className="text-[7px] text-muted-foreground sm:text-[8px]">
                                {t("demo.pokebox.personalityText")}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {activeTab === 1 && (
                        <motion.div
                          key="lorebook"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="absolute inset-0 overflow-auto p-1.5 sm:p-2"
                        >
                          <div className="space-y-1">
                            {[1, 2, 3].map((i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="flex items-center justify-between rounded-md border bg-background/80 p-1.5"
                              >
                                <span className="text-[8px] font-medium sm:text-[9px]">
                                  {t("demo.pokebox.lorebookEntry")} {i}
                                </span>
                                <Badge variant="outline" className="px-1 py-0 text-[6px] sm:text-[7px]">
                                  {t("demo.pokebox.enabled")}
                                </Badge>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}

                      {activeTab === 2 && (
                        <motion.div
                          key="assets"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="absolute inset-0 overflow-auto p-1.5 sm:p-2"
                        >
                          <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
                            {["happy", "sad", "angry", "neutral", "smile", "think"].map((name, i) => (
                              <motion.div
                                key={name}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.06 }}
                                className="aspect-square overflow-hidden rounded-md bg-muted/70"
                              >
                                <div className="flex h-full w-full items-center justify-center">
                                  <Image className="h-3 w-3 text-gray-500/40 sm:h-4 sm:w-4" />
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Action Button */}
                  <motion.div
                    animate={{
                      scale: state === "action" ? [1, 1.05, 1] : 1,
                    }}
                    transition={{ duration: 0.3, repeat: state === "action" ? 2 : 0 }}
                    className="mt-2"
                  >
                    <div
                      className={`flex w-full items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[9px] font-medium sm:text-[10px] ${
                        state === "action"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <MessageSquare className="h-3 w-3" />
                      {t("demo.pokebox.chatButton")}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
