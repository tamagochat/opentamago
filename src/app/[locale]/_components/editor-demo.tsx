"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  User,
  Sparkles,
  Book,
  Image,
  Check,
  Save,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "~/components/ui/badge";

type DemoState = "idle" | "typing" | "assistant" | "filling" | "lorebook" | "export";

interface DemoTab {
  id: string;
  label: string;
}

const DEMO_CHARACTER = {
  name: "Luna",
  personality: "A curious and adventurous spirit who loves exploring ancient ruins. She's warm and encouraging, always ready to help others discover hidden secrets.",
};

const LOREBOOK_ENTRIES = [
  { name: "Moonlight Academy", keys: ["academy", "school"] },
  { name: "Crystal Staff", keys: ["staff", "weapon"] },
  { name: "Ancient Language", keys: ["runes", "magic"] },
];

export function EditorDemo() {
  const t = useTranslations("home");
  const [state, setState] = useState<DemoState>("idle");
  const [activeTab, setActiveTab] = useState(0);
  const [typedName, setTypedName] = useState("");
  const [typedPersonality, setTypedPersonality] = useState("");

  const tabs: DemoTab[] = [
    { id: "basic", label: t("demo.editor.tabs.basic") },
    { id: "lorebook", label: t("demo.editor.tabs.lorebook") },
    { id: "assets", label: t("demo.editor.tabs.assets") },
  ];

  useEffect(() => {
    let cancelled = false;

    const typeText = async (text: string, setter: (s: string) => void, delay: number = 80) => {
      for (let i = 0; i <= text.length; i++) {
        if (cancelled) return;
        setter(text.slice(0, i));
        await new Promise((r) => setTimeout(r, delay));
      }
    };

    const runSequence = async () => {
      while (!cancelled) {
        // Reset state
        setState("idle");
        setActiveTab(0);
        setTypedName("");
        setTypedPersonality("");
        await new Promise((r) => setTimeout(r, 2000));
        if (cancelled) return;

        // Type character name
        setState("typing");
        await typeText(DEMO_CHARACTER.name, setTypedName, 120);
        await new Promise((r) => setTimeout(r, 500));
        if (cancelled) return;

        // Show AI assistant suggestion
        setState("assistant");
        await new Promise((r) => setTimeout(r, 2000));
        if (cancelled) return;

        // Fill in personality from AI suggestion
        setState("filling");
        await typeText(DEMO_CHARACTER.personality, setTypedPersonality, 20);
        await new Promise((r) => setTimeout(r, 1000));
        if (cancelled) return;

        // Switch to lorebook tab
        setState("lorebook");
        setActiveTab(1);
        await new Promise((r) => setTimeout(r, 3000));
        if (cancelled) return;

        // Export/Save
        setState("export");
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
          {t("editorShowcase.badge")}
        </span>
      </div>

      {/* Content Area */}
      <div className="absolute inset-0 pt-8 sm:pt-10">
        <div className="flex h-full">
          {/* Editor Panel (Left) */}
          <div className="flex flex-1 flex-col border-r p-2 sm:p-3">
            {/* Tabs */}
            <div className="mb-2 flex gap-0.5 rounded-lg bg-muted/50 p-0.5 sm:gap-1 sm:p-1">
              {tabs.map((tab, index) => (
                <motion.button
                  key={tab.id}
                  animate={{
                    backgroundColor: activeTab === index ? "hsl(var(--background))" : "transparent",
                    boxShadow: activeTab === index ? "0 1px 3px 0 rgb(0 0 0 / 0.1)" : "none",
                  }}
                  className={`flex flex-1 items-center justify-center gap-1 rounded-md px-1.5 py-1 text-[10px] transition-colors sm:gap-1.5 sm:px-2 sm:py-1.5 sm:text-xs ${
                    activeTab === index ? "font-medium text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <span>{tab.label}</span>
                </motion.button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="relative flex-1 overflow-hidden rounded-lg border bg-background/50">
              <AnimatePresence mode="wait">
                {activeTab === 0 && (
                  <motion.div
                    key="basic"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="absolute inset-0 overflow-auto p-2 sm:p-3"
                  >
                    <div className="space-y-2 sm:space-y-3">
                      {/* Avatar + Name Row */}
                      <div className="flex items-start gap-2 sm:gap-3">
                        {/* Avatar placeholder */}
                        <motion.div
                          animate={{
                            borderColor: state === "idle" ? "hsl(var(--border))" : "hsl(var(--primary))",
                          }}
                          className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border-2 border-dashed bg-muted/50 sm:h-12 sm:w-12"
                        >
                          <div className="flex h-full w-full items-center justify-center">
                            <User className="h-4 w-4 text-muted-foreground/60 sm:h-5 sm:w-5" />
                          </div>
                        </motion.div>

                        {/* Name Input */}
                        <div className="flex-1">
                          <label className="mb-0.5 block text-[9px] font-medium text-muted-foreground sm:text-[10px]">
                            {t("demo.editor.nameLabel")}
                          </label>
                          <div className="relative">
                            <div className="flex h-6 items-center rounded-md border bg-background px-2 text-[10px] sm:h-7 sm:text-xs">
                              <span>{typedName}</span>
                              {state === "typing" && (
                                <motion.span
                                  animate={{ opacity: [1, 0] }}
                                  transition={{ repeat: Infinity, duration: 0.6 }}
                                  className="ml-0.5 inline-block h-3 w-0.5 bg-primary"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Personality Field */}
                      <div>
                        <label className="mb-0.5 block text-[9px] font-medium text-muted-foreground sm:text-[10px]">
                          {t("demo.editor.personalityLabel")}
                        </label>
                        <div className="min-h-[50px] rounded-md border bg-background p-1.5 text-[9px] leading-relaxed text-muted-foreground sm:min-h-[60px] sm:p-2 sm:text-[10px]">
                          <span>{typedPersonality}</span>
                          {state === "filling" && (
                            <motion.span
                              animate={{ opacity: [1, 0] }}
                              transition={{ repeat: Infinity, duration: 0.6 }}
                              className="ml-0.5 inline-block h-2.5 w-0.5 bg-primary"
                            />
                          )}
                        </div>
                      </div>

                      {/* Save Button */}
                      <motion.div
                        animate={{
                          scale: state === "export" ? [1, 0.95, 1] : 1,
                        }}
                        transition={{ duration: 0.2 }}
                        className="flex justify-end"
                      >
                        <div
                          className={`flex items-center gap-1 rounded-md px-2 py-1 text-[9px] font-medium sm:px-3 sm:py-1.5 sm:text-[10px] ${
                            state === "export"
                              ? "bg-green-500 text-white"
                              : "bg-primary text-primary-foreground"
                          }`}
                        >
                          {state === "export" ? (
                            <>
                              <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              {t("demo.editor.saved")}
                            </>
                          ) : (
                            <>
                              <Save className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              {t("demo.editor.save")}
                            </>
                          )}
                        </div>
                      </motion.div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 1 && (
                  <motion.div
                    key="lorebook"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="absolute inset-0 overflow-auto p-2 sm:p-3"
                  >
                    <div className="space-y-1.5 sm:space-y-2">
                      <div className="flex items-center gap-1 text-[10px] font-medium sm:text-xs">
                        <Book className="h-3 w-3" />
                        <span>{t("demo.editor.lorebookTitle")}</span>
                        <Badge variant="secondary" className="ml-1 px-1 py-0 text-[8px]">
                          {LOREBOOK_ENTRIES.length}
                        </Badge>
                      </div>
                      {LOREBOOK_ENTRIES.map((entry, i) => (
                        <motion.div
                          key={entry.name}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.15 }}
                          className="rounded-md border bg-background/80 p-1.5 sm:p-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-medium sm:text-[10px]">{entry.name}</span>
                            <Badge variant="outline" className="px-1 py-0 text-[7px] sm:text-[8px]">
                              {entry.keys.join(", ")}
                            </Badge>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* AI Assistant Panel (Right) - Hidden on very small screens */}
          <div className="hidden w-[40%] flex-col p-2 sm:flex sm:p-3">
            <div className="mb-2 flex items-center gap-1 text-[10px] font-medium sm:text-xs">
              <Sparkles className="h-3 w-3 text-primary" />
              <span>{t("demo.editor.assistant")}</span>
            </div>
            <div className="flex-1 overflow-hidden rounded-lg border bg-background/50">
              <div className="flex h-full flex-col">
                {/* Chat Messages */}
                <div className="flex-1 overflow-auto p-1.5 sm:p-2">
                  <AnimatePresence mode="wait">
                    {(state === "assistant" || state === "filling" || state === "lorebook" || state === "export") && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="space-y-1.5"
                      >
                        {/* User Message */}
                        <div className="flex justify-end">
                          <div className="max-w-[90%] rounded-lg bg-primary px-2 py-1 text-[8px] text-primary-foreground sm:text-[9px]">
                            {t("demo.editor.userMessage")}
                          </div>
                        </div>
                        {/* AI Response */}
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 }}
                          className="flex"
                        >
                          <div className="max-w-[90%] rounded-lg bg-muted px-2 py-1 text-[8px] sm:text-[9px]">
                            <div className="mb-0.5 flex items-center gap-1 text-primary">
                              <Sparkles className="h-2 w-2" />
                              <span className="font-medium">AI</span>
                            </div>
                            <p className="text-muted-foreground">
                              {t("demo.editor.aiResponse")}
                            </p>
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                    {state === "idle" || state === "typing" ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex h-full items-center justify-center"
                      >
                        <p className="text-center text-[8px] text-muted-foreground sm:text-[9px]">
                          {t("demo.editor.assistantHint")}
                        </p>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
                {/* Input */}
                <div className="border-t p-1.5 sm:p-2">
                  <div className="flex items-center gap-1 rounded-md border bg-background px-2 py-1">
                    <span className="flex-1 text-[8px] text-muted-foreground sm:text-[9px]">
                      {t("demo.editor.inputPlaceholder")}
                    </span>
                    <Sparkles className="h-2.5 w-2.5 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile AI indicator */}
          <AnimatePresence>
            {(state === "assistant" || state === "filling") && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute right-2 top-12 flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[9px] text-primary sm:hidden"
              >
                <Sparkles className="h-3 w-3" />
                <span>{t("demo.editor.aiHelping")}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
