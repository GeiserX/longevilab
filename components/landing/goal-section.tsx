"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const goalTexts = [
  "Understand your health.",
  "Track your progress.",
  "Live longer, better.",
  "Self-hosted and private.",
  "Open source forever.",
];

export function GoalSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  // Create a long string for seamless scrolling
  const marqueeContent = [...goalTexts, ...goalTexts, ...goalTexts, ...goalTexts]
    .join("     •     ");

  return (
    <section ref={ref} className="bg-stone-950 pb-8">
      {/* THE GOAL header */}
      <motion.div
        className="bg-stone-950 border-t border-stone-800 py-4"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="container mx-auto px-8 md:px-12 lg:px-16">
          <span
            className="font-mono text-foreground uppercase tracking-widest"
            style={{ fontSize: "clamp(12px, 1vw, 14px)" }}
          >
            THE GOAL
          </span>
        </div>
      </motion.div>

      {/* Moving text marquee */}
      <motion.div
        className="bg-stone-900 py-5 overflow-hidden border-t border-b border-stone-800"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="relative">
          <motion.div
            className="flex whitespace-nowrap"
            animate={{
              x: ["0%", "-50%"],
            }}
            transition={{
              x: {
                repeat: Infinity,
                repeatType: "loop",
                duration: 25,
                ease: "linear",
              },
            }}
          >
            <span
              className="text-muted-foreground font-light inline-block"
              style={{ fontSize: "clamp(14px, 1.5vw, 18px)" }}
            >
              {marqueeContent}
            </span>
            <span
              className="text-muted-foreground font-light inline-block ml-4"
              style={{ fontSize: "clamp(14px, 1.5vw, 18px)" }}
            >
              {marqueeContent}
            </span>
          </motion.div>
        </div>
      </motion.div>

      {/* Footer */}
      <div className="container mx-auto px-8 md:px-12 lg:px-16 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p className="text-muted-foreground text-sm">
            Open-source health tracking. Built with privacy in mind.
          </p>
          <p className="text-muted-foreground text-sm font-mono">
            LONGEVILAB © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </section>
  );
}
