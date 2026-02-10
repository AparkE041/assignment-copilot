"use client";

import { useState, useEffect, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X } from "lucide-react";
import { TutorChatPanel } from "./tutor-chat-panel";

interface TutorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TutorDrawer({ isOpen, onClose }: TutorDrawerProps) {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<
    { id: string; role: "user" | "assistant"; content: string }[]
  >([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!isOpen) return;
    startTransition(() => {
      fetch("/api/tutor/thread")
        .then((r) => r.json())
        .then((data) => {
          setThreadId(data.threadId ?? null);
          const msgs = (data.messages ?? []).map((m: { id: string; role: string; content: string }) => ({
            id: m.id,
            role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
            content: m.content,
          }));
          setMessages(msgs);
        });
    });
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-background border-l border-border shadow-2xl z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">AI Tutor</h2>
                  <p className="text-xs text-muted-foreground">
                    Ask about assignments & concepts
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              {isPending ? (
                <div className="flex items-center justify-center h-48">
                  <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : (
                <TutorChatPanel
                  initialThreadId={threadId}
                  initialMessages={messages}
                />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
