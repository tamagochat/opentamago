"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Users, MessageSquare, Send } from "lucide-react";
import { useTranslations } from "next-intl";

type DemoState =
  | "idle"
  | "joining1"
  | "joining2"
  | "joining3"
  | "chatting"
  | "message1"
  | "message2"
  | "aiReply"
  | "complete";

interface Character {
  name: string;
  initials: string;
  color: string;
}

interface Message {
  id: number;
  character: Character;
  content: string;
  isAi?: boolean;
}

const DEMO_CHARACTERS: Character[] = [
  { name: "Luna AI", initials: "LU", color: "bg-purple-500" },
  { name: "Kai AI", initials: "KA", color: "bg-blue-500" },
  { name: "Nova AI", initials: "NO", color: "bg-pink-500" },
];

export function ConnectDemo() {
  const t = useTranslations("home");
  const [state, setState] = useState<DemoState>("idle");
  const [participants, setParticipants] = useState<Character[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    let cancelled = false;

    const runSequence = async () => {
      while (!cancelled) {
        // Initial pause
        setState("idle");
        setParticipants([]);
        setMessages([]);
        await new Promise((r) => setTimeout(r, 2000));
        if (cancelled) return;

        // First character joins
        setState("joining1");
        setParticipants([DEMO_CHARACTERS[0]!]);
        await new Promise((r) => setTimeout(r, 1500));
        if (cancelled) return;

        // Second character joins
        setState("joining2");
        setParticipants([DEMO_CHARACTERS[0]!, DEMO_CHARACTERS[1]!]);
        await new Promise((r) => setTimeout(r, 1500));
        if (cancelled) return;

        // Third character joins
        setState("joining3");
        setParticipants([DEMO_CHARACTERS[0]!, DEMO_CHARACTERS[1]!, DEMO_CHARACTERS[2]!]);
        await new Promise((r) => setTimeout(r, 1500));
        if (cancelled) return;

        // Start chatting
        setState("chatting");
        await new Promise((r) => setTimeout(r, 1500));
        if (cancelled) return;

        // First message
        setState("message1");
        setMessages([
          { id: 1, character: DEMO_CHARACTERS[0]!, content: t("demo.connect.message1") },
        ]);
        await new Promise((r) => setTimeout(r, 2500));
        if (cancelled) return;

        // Second message
        setState("message2");
        setMessages((prev) => [
          ...prev,
          { id: 2, character: DEMO_CHARACTERS[1]!, content: t("demo.connect.message2") },
        ]);
        await new Promise((r) => setTimeout(r, 2500));
        if (cancelled) return;

        // AI reply
        setState("aiReply");
        setMessages((prev) => [
          ...prev,
          { id: 3, character: DEMO_CHARACTERS[2]!, content: t("demo.connect.aiReply"), isAi: true },
        ]);
        await new Promise((r) => setTimeout(r, 3000));
        if (cancelled) return;

        // Complete
        setState("complete");
        await new Promise((r) => setTimeout(r, 2500));
        if (cancelled) return;
      }
    };

    runSequence();

    return () => {
      cancelled = true;
    };
  }, [t]);

  const isInChat = ["chatting", "message1", "message2", "aiReply", "complete"].includes(state);

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
          {t("connectShowcase.badge")} · {t("connectShowcase.poweredBy")}
        </span>
      </div>

      {/* Content */}
      <div className="absolute inset-0 flex pt-8 sm:pt-10">
        {/* Main Chat Area */}
        <div className="flex flex-1 flex-col p-2 sm:p-3">
          <AnimatePresence mode="wait">
            {!isInChat ? (
              <motion.div
                key="lobby"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="flex h-full flex-col items-center justify-center gap-3"
              >
                {/* Lobby view */}
                <div className="text-center">
                  <Users className="mx-auto h-6 w-6 text-primary sm:h-8 sm:w-8" />
                  <p className="mt-2 text-xs font-medium sm:text-sm">{t("demo.connect.waitingRoom")}</p>
                </div>

                {/* Joining animation */}
                <div className="flex items-center gap-2">
                  <AnimatePresence>
                    {participants.map((char, i) => (
                      <motion.div
                        key={char.name}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ duration: 0.4, delay: i * 0.1 }}
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-medium text-white sm:h-10 sm:w-10 sm:text-xs ${char.color}`}
                      >
                        {char.initials}
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Waiting dot */}
                  {participants.length < 3 && (
                    <motion.div
                      animate={{ opacity: [0.3, 0.7, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/30 sm:h-10 sm:w-10"
                    >
                      <span className="text-[10px] text-muted-foreground">+</span>
                    </motion.div>
                  )}
                </div>

                <p className="text-[10px] text-muted-foreground sm:text-xs">
                  {participants.length} / 3 {t("demo.connect.participants")}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="chat"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="flex h-full flex-col"
              >
                {/* Chat header */}
                <div className="mb-2 flex items-center justify-between rounded-md bg-background/50 px-2 py-1.5 sm:px-3">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="h-3 w-3 text-primary sm:h-4 sm:w-4" />
                    <span className="text-[10px] font-medium sm:text-xs">{t("demo.connect.chat")}</span>
                    <span className="rounded-full bg-green-500/10 px-1.5 py-0.5 text-[8px] text-green-600 sm:text-[9px]">
                      {t("demo.connect.p2pBadge")}
                    </span>
                  </div>
                  <div className="flex -space-x-1.5">
                    {participants.map((char) => (
                      <div
                        key={char.name}
                        className={`flex h-5 w-5 items-center justify-center rounded-full border-2 border-background text-[8px] font-medium text-white sm:h-6 sm:w-6 ${char.color}`}
                      >
                        {char.initials}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 space-y-2 overflow-hidden">
                  <AnimatePresence>
                    {messages.map((msg, index) => {
                      const isRight = index % 2 === 1;
                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4 }}
                          className={`flex items-start gap-1.5 sm:gap-2 ${isRight ? "flex-row-reverse" : ""}`}
                        >
                          <div
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[8px] font-medium text-white sm:h-6 sm:w-6 ${msg.character.color}`}
                          >
                            {msg.character.initials}
                          </div>
                          <div className={`min-w-0 flex-1 ${isRight ? "text-right" : ""}`}>
                            <div className={`flex items-center gap-1 ${isRight ? "justify-end" : ""}`}>
                              <span className="text-[10px] font-medium sm:text-xs">{msg.character.name}</span>
                            </div>
                            <p className={`inline-block rounded-md px-2 py-1 text-[10px] sm:text-xs ${isRight ? "bg-primary/10" : "bg-muted/50"}`}>{msg.content}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {/* Typing indicator */}
                  <AnimatePresence>
                    {state === "aiReply" && messages.length === 2 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-1.5"
                      >
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-medium text-white sm:h-6 sm:w-6 ${DEMO_CHARACTERS[2]!.color}`}
                        >
                          {DEMO_CHARACTERS[2]!.initials}
                        </div>
                        <motion.div
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ repeat: Infinity, duration: 1 }}
                          className="flex gap-0.5"
                        >
                          <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                          <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                          <span className="h-1 w-1 rounded-full bg-muted-foreground" />
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Input */}
                <div className="mt-2 flex items-center gap-1.5 rounded-md bg-background/50 px-2 py-1.5">
                  <div className="flex-1 rounded bg-muted/50 px-2 py-1">
                    <span className="text-[10px] text-muted-foreground sm:text-xs">{t("demo.connect.inputPlaceholder")}</span>
                  </div>
                  <div className="flex h-5 w-5 items-center justify-center rounded bg-primary sm:h-6 sm:w-6">
                    <Send className="h-2.5 w-2.5 text-primary-foreground sm:h-3 sm:w-3" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar - visible on larger screens */}
        <div className="hidden w-20 flex-col border-l bg-background/30 p-2 sm:flex sm:w-24">
          <p className="mb-2 text-[10px] font-medium text-muted-foreground">{t("demo.connect.participants")}</p>
          <div className="space-y-1.5">
            <AnimatePresence>
              {participants.map((char, i) => (
                <motion.div
                  key={char.name}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.1 }}
                  className="flex items-center gap-1.5"
                >
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-medium text-white ${char.color}`}
                  >
                    {char.initials}
                  </div>
                  <span className="truncate text-[10px]">{char.name}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
