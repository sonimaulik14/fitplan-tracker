"use client";

import { motion, useReducedMotion } from "motion/react";

// Wraps every route; remounts on navigation so each page eases in. A pure
// opacity cross-fade — no scale or translate — so the page (and the sticky nav)
// never shift position on navigation.
export default function Template({
  children,
}: {
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="flex-1 flex flex-col"
    >
      {children}
    </motion.div>
  );
}
