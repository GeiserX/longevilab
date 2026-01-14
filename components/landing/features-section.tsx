"use client";

import { useState, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Feature {
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    title: "BIOMARKERS",
    description:
      "Track 46 biomarkers from your blood tests across 9 categories. Understand how each marker affects your biological age.",
  },
  {
    title: "ACTIVITY",
    description:
      "Import your activity data from Apple Health. See how your daily movement correlates with your biomarker trends.",
  },
  {
    title: "SLEEP",
    description:
      "Monitor your sleep stages to track sleep quality. Understand how rest affects your longevity and recovery.",
  },
  {
    title: "HEART",
    description:
      "Track your resting heart rate and heart rate variability. Key indicators of cardiovascular health and recovery.",
  },
  {
    title: "VO2 MAX",
    description:
      "Monitor your cardiorespiratory fitness level. One of the strongest predictors of longevity and healthspan.",
  },
];

interface FeatureRowProps {
  feature: Feature;
  index: number;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
}

function FeatureRow({
  feature,
  index,
  isHovered,
  onHover,
  onLeave,
}: FeatureRowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      className={cn(
        "border-t border-stone-800 transition-colors duration-300 cursor-pointer",
        isHovered ? "bg-foreground" : "bg-transparent"
      )}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.8, delay: index * 0.1 }}
    >
      {/* Aligned with CTA buttons: left-8 md:left-12 lg:left-16 */}
      <div className="px-8 md:px-12 lg:px-16 py-6 md:py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-8 max-w-[1800px]">
          {/* Large title */}
          <h2
            className={cn(
              "font-sans font-light uppercase transition-colors duration-300",
              isHovered ? "text-stone-950" : "text-foreground"
            )}
            style={{
              fontSize: "clamp(48px, 10vw, 120px)",
              lineHeight: 1,
              letterSpacing: "-0.02em",
            }}
          >
            {feature.title}
          </h2>

          {/* Description - only visible on hover */}
          <AnimatePresence>
            {isHovered && (
              <motion.p
                className="max-w-md text-right text-stone-700"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                style={{
                  fontSize: "clamp(14px, 1.2vw, 16px)",
                  lineHeight: 1.6,
                }}
              >
                {feature.description}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export function FeaturesSection() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <section className="bg-stone-950 py-16 md:py-24">
      {features.map((feature, index) => (
        <FeatureRow
          key={feature.title}
          feature={feature}
          index={index}
          isHovered={hoveredIndex === index}
          onHover={() => setHoveredIndex(index)}
          onLeave={() => setHoveredIndex(null)}
        />
      ))}
      {/* Bottom border */}
      <div className="border-t border-stone-800" />
    </section>
  );
}
