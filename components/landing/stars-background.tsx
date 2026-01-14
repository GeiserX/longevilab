"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  type SpringOptions,
} from "framer-motion";
import { cn } from "@/lib/utils";

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
}

interface StarsBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  starCount?: number;
  speed?: number;
  starColor?: string;
  pointerEvents?: boolean;
  factor?: number;
  transition?: SpringOptions;
}

// Seeded random number generator for consistent SSR/client rendering
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function StarsBackground({
  className,
  starCount = 150,
  speed = 50,
  starColor = "#fff",
  pointerEvents = true,
  factor = 0.05,
  transition = { stiffness: 50, damping: 20 },
  ...props
}: StarsBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stars, setStars] = useState<Star[]>([]);

  // Mouse position tracking with motion values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springX = useSpring(mouseX, transition);
  const springY = useSpring(mouseY, transition);

  // Generate stars on client side only to avoid hydration mismatch
  useEffect(() => {
    const generatedStars = Array.from({ length: starCount }, (_, i) => ({
      id: i,
      x: seededRandom(i * 1.1) * 100,
      y: seededRandom(i * 2.2) * 100,
      size: seededRandom(i * 3.3) * 2 + 0.5,
      opacity: seededRandom(i * 4.4) * 0.5 + 0.3,
      speed: (seededRandom(i * 5.5) * 0.5 + 0.5) * speed,
    }));
    setStars(generatedStars);
  }, [starCount, speed]);

  useEffect(() => {
    if (!pointerEvents) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (e.clientX - rect.left - rect.width / 2) * factor;
      const y = (e.clientY - rect.top - rect.height / 2) * factor;
      mouseX.set(x);
      mouseY.set(y);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [pointerEvents, factor, mouseX, mouseY]);

  return (
    <div
      ref={containerRef}
      className={cn("absolute inset-0 overflow-hidden", className)}
      {...props}
    >
      <motion.div
        className="absolute inset-0"
        style={{ x: springX, y: springY }}
      >
        {stars.map((star) => (
          <motion.div
            key={star.id}
            className="absolute rounded-full"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
              backgroundColor: starColor,
            }}
            initial={{ opacity: 0 }}
            animate={{
              opacity: [star.opacity * 0.3, star.opacity, star.opacity * 0.3],
            }}
            transition={{
              duration: star.speed / 15,
              repeat: Infinity,
              ease: "easeInOut",
              delay: seededRandom(star.id * 6.6) * 2,
            }}
          />
        ))}
      </motion.div>
    </div>
  );
}
