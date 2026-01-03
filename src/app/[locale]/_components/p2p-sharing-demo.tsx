"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Smartphone,
  FileArchive,
  QrCode,
  Download,
  Check,
  Wifi,
  Upload,
} from "lucide-react";
import { useTranslations } from "next-intl";

type DemoState =
  | "idle"
  | "selecting"
  | "generating"
  | "sharing"
  | "scanning"
  | "connecting"
  | "downloading"
  | "complete";

export function P2pSharingDemo() {
  const t = useTranslations("home");
  const [state, setState] = useState<DemoState>("idle");
  const [progress, setProgress] = useState(0);
  const [autoPlayPaused, setAutoPlayPaused] = useState(false);

  const resetDemo = useCallback(() => {
    setState("idle");
    setProgress(0);
  }, []);

  useEffect(() => {
    if (autoPlayPaused) return;
    if (state !== "idle") return;

    let cancelled = false;

    const runSequence = async () => {
      // Initial pause - show both devices idle
      await new Promise((r) => setTimeout(r, 2000));
      if (cancelled) return;
      setState("selecting");

      // Selecting file
      await new Promise((r) => setTimeout(r, 2000));
      if (cancelled) return;
      setState("generating");

      // Generating QR code
      await new Promise((r) => setTimeout(r, 1500));
      if (cancelled) return;
      setState("sharing");

      // Showing QR code, waiting for receiver
      await new Promise((r) => setTimeout(r, 2500));
      if (cancelled) return;
      setState("scanning");

      // Scanning QR code
      await new Promise((r) => setTimeout(r, 2000));
      if (cancelled) return;
      setState("connecting");

      // Establishing connection
      await new Promise((r) => setTimeout(r, 1800));
      if (cancelled) return;
      setState("downloading");

      // Animate progress smoothly
      for (let i = 0; i <= 100; i += 2) {
        if (cancelled) return;
        setProgress(i);
        await new Promise((r) => setTimeout(r, 40));
      }

      // Pause on complete
      await new Promise((r) => setTimeout(r, 800));
      if (cancelled) return;
      setState("complete");

      // Show completion state
      await new Promise((r) => setTimeout(r, 3000));
      if (cancelled) return;
      resetDemo();
    };

    runSequence();

    return () => {
      cancelled = true;
    };
  }, [state, autoPlayPaused, resetDemo]);

  const isAfterGenerating = ["sharing", "scanning", "connecting", "downloading", "complete"].includes(state);
  const isConnected = ["connecting", "downloading", "complete"].includes(state);

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
          {t("p2pShowcase.badge")}
        </span>
      </div>

      {/* Content */}
      <div className="absolute inset-0 flex items-center justify-center pt-8 sm:pt-10">
        <div className="flex w-full items-center justify-center gap-4 px-4 sm:gap-8 sm:px-8">
          {/* Sender Device */}
          <div className="flex flex-col items-center gap-2">
            <motion.div
              animate={{
                scale: state === "selecting" ? 1.05 : 1,
              }}
              className="relative flex h-36 w-24 flex-col items-center justify-center rounded-xl border-2 border-muted-foreground/30 bg-background/80 shadow-lg sm:h-44 sm:w-28"
            >
              {/* Device notch */}
              <div className="absolute top-1 h-1 w-6 rounded-full bg-muted-foreground/30 sm:top-1.5 sm:w-8" />

              {/* Device screen content */}
              <div className="flex h-full w-full flex-col items-center justify-center px-1.5 py-3 sm:px-2 sm:py-4">
                <AnimatePresence mode="wait">
                  {state === "idle" && (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      className="flex flex-col items-center gap-1"
                    >
                      <Upload className="h-4 w-4 text-muted-foreground sm:h-5 sm:w-5" />
                      <span className="text-[8px] text-muted-foreground sm:text-[10px]">{t("demo.p2p.selectFile")}</span>
                    </motion.div>
                  )}

                  {state === "selecting" && (
                    <motion.div
                      key="selecting"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      className="flex flex-col items-center gap-1"
                    >
                      <motion.div
                        animate={{ scale: [1, 1.08, 1] }}
                        transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                        className="rounded-md bg-primary/10 p-1.5"
                      >
                        <FileArchive className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
                      </motion.div>
                      <span className="text-[8px] font-medium sm:text-[10px]">Luna.charx</span>
                    </motion.div>
                  )}

                  {state === "generating" && (
                    <motion.div
                      key="generating"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      className="flex flex-col items-center gap-1"
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                        className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent sm:h-6 sm:w-6"
                      />
                      <span className="text-[8px] text-muted-foreground sm:text-[10px]">{t("demo.p2p.generating")}</span>
                    </motion.div>
                  )}

                  {isAfterGenerating && (
                    <motion.div
                      key="qr"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="flex flex-col items-center gap-1"
                    >
                      {/* Simple QR Code representation */}
                      <div className="grid h-10 w-10 grid-cols-5 grid-rows-5 gap-0.5 rounded bg-white p-1 sm:h-12 sm:w-12">
                        {Array.from({ length: 25 }).map((_, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.03, duration: 0.2 }}
                            className={`rounded-[1px] ${
                              [0, 1, 2, 4, 5, 6, 10, 12, 14, 18, 20, 21, 22, 24].includes(i)
                                ? "bg-black"
                                : "bg-white"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[8px] text-muted-foreground sm:text-[10px]">{t("demo.p2p.scanToJoin")}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
            <span className="text-[10px] text-muted-foreground sm:text-xs">{t("p2pShowcase.sender")}</span>
          </div>

          {/* Connection Animation */}
          <div className="flex flex-col items-center gap-1">
            {/* Connection status */}
            <AnimatePresence mode="wait">
              {!isConnected && state !== "idle" && (
                <motion.span
                  key="waiting"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[8px] text-muted-foreground sm:text-[10px]"
                >
                  {t("demo.p2p.waitingConnection")}
                </motion.span>
              )}
              {isConnected && state !== "complete" && (
                <motion.span
                  key="connected"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[8px] font-medium text-green-600 sm:text-[10px]"
                >
                  {t("demo.p2p.connected")}
                </motion.span>
              )}
              {state === "complete" && (
                <motion.span
                  key="transferred"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-[8px] font-medium text-green-600 sm:text-[10px]"
                >
                  {t("demo.p2p.transferred")}
                </motion.span>
              )}
            </AnimatePresence>

            <div className="relative flex items-center gap-1 sm:gap-2">
              <motion.div
                animate={{
                  opacity: isConnected ? 1 : 0.3,
                  scale: isConnected ? [1, 1.2, 1] : 1,
                }}
                transition={{
                  scale: { repeat: isConnected ? Infinity : 0, duration: 1 },
                }}
              >
                <Wifi className="h-3 w-3 text-primary sm:h-4 sm:w-4" />
              </motion.div>

              {/* Data packets animation */}
              <div className="relative h-1 w-12 overflow-hidden rounded-full bg-muted-foreground/20 sm:w-16">
                <AnimatePresence>
                  {state === "downloading" && (
                    <motion.div
                      initial={{ x: "-100%" }}
                      animate={{ x: "100%" }}
                      transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                      className="absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-transparent via-primary to-transparent"
                    />
                  )}
                </AnimatePresence>
              </div>

              <motion.div
                animate={{
                  opacity: isConnected ? 1 : 0.3,
                  scale: isConnected ? [1, 1.2, 1] : 1,
                }}
                transition={{
                  scale: { repeat: isConnected ? Infinity : 0, duration: 1, delay: 0.5 },
                }}
              >
                <Wifi className="h-3 w-3 text-primary sm:h-4 sm:w-4" />
              </motion.div>

              {/* Flying file animation */}
              <AnimatePresence>
                {state === "downloading" && (
                  <motion.div
                    initial={{ x: -40, opacity: 0, scale: 0.5 }}
                    animate={{
                      x: [null, 0, 40],
                      opacity: [0, 1, 0],
                      scale: [0.5, 1, 0.5],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 1.5,
                      ease: "easeInOut",
                      times: [0, 0.5, 1]
                    }}
                    className="pointer-events-none absolute left-1/2 -translate-x-1/2"
                  >
                    <div className="rounded bg-primary/10 p-1">
                      <FileArchive className="h-3 w-3 text-primary sm:h-4 sm:w-4" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {state === "downloading" && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[10px] font-medium text-primary sm:text-xs"
                >
                  {progress}%
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Receiver Device */}
          <div className="flex flex-col items-center gap-2">
            <motion.div
              animate={{
                scale: state === "scanning" ? 1.05 : 1,
              }}
              className="relative flex h-36 w-24 flex-col items-center justify-center rounded-xl border-2 border-muted-foreground/30 bg-background/80 shadow-lg sm:h-44 sm:w-28"
            >
              {/* Device notch */}
              <div className="absolute top-1 h-1 w-6 rounded-full bg-muted-foreground/30 sm:top-1.5 sm:w-8" />

              {/* Device screen content */}
              <div className="flex h-full w-full flex-col items-center justify-center px-1.5 py-3 sm:px-2 sm:py-4">
                <AnimatePresence mode="wait">
                  {(state === "idle" || state === "selecting" || state === "generating") && (
                    <motion.div
                      key="idle"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      className="flex flex-col items-center gap-1"
                    >
                      <Smartphone className="h-4 w-4 text-muted-foreground sm:h-5 sm:w-5" />
                      <span className="text-[8px] text-muted-foreground sm:text-[10px]">{t("demo.p2p.waiting")}</span>
                    </motion.div>
                  )}

                  {state === "sharing" && (
                    <motion.div
                      key="ready"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      className="flex flex-col items-center gap-1"
                    >
                      <QrCode className="h-4 w-4 text-muted-foreground sm:h-5 sm:w-5" />
                      <span className="text-[8px] text-muted-foreground sm:text-[10px]">{t("demo.p2p.readyToScan")}</span>
                    </motion.div>
                  )}

                  {state === "scanning" && (
                    <motion.div
                      key="scanning"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      className="flex flex-col items-center gap-1"
                    >
                      <motion.div
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
                      >
                        <QrCode className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
                      </motion.div>
                      <span className="text-[8px] text-primary sm:text-[10px]">{t("demo.p2p.scanning")}</span>
                    </motion.div>
                  )}

                  {state === "connecting" && (
                    <motion.div
                      key="connecting"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      className="flex flex-col items-center gap-1"
                    >
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                        className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent sm:h-6 sm:w-6"
                      />
                      <span className="text-[8px] text-muted-foreground sm:text-[10px]">{t("demo.p2p.connecting")}</span>
                    </motion.div>
                  )}

                  {state === "downloading" && (
                    <motion.div
                      key="downloading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      className="flex w-full flex-col items-center gap-1.5 px-2"
                    >
                      <Download className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
                      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.1 }}
                          className="h-full bg-primary"
                        />
                      </div>
                      <span className="text-[8px] text-muted-foreground sm:text-[10px]">Luna.charx</span>
                    </motion.div>
                  )}

                  {state === "complete" && (
                    <motion.div
                      key="complete"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="flex flex-col items-center gap-1"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", damping: 10 }}
                        className="rounded-full bg-green-500/10 p-1.5 sm:p-2"
                      >
                        <Check className="h-4 w-4 text-green-500 sm:h-5 sm:w-5" />
                      </motion.div>
                      <span className="text-[8px] font-medium text-green-600 sm:text-[10px]">{t("demo.p2p.complete")}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
            <span className="text-[10px] text-muted-foreground sm:text-xs">{t("p2pShowcase.receivers")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
