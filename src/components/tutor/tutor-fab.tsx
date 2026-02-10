"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { TutorDrawer } from "./tutor-drawer";

export function TutorFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <motion.button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 flex items-center justify-center hover:shadow-xl hover:shadow-blue-500/40 transition-shadow"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Open AI Tutor"
      >
        <MessageCircle className="w-6 h-6" />
      </motion.button>
      <TutorDrawer isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
