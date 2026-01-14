"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface HealthOrbProps {
  className?: string;
}

// Seeded random for consistent rendering
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function HealthOrb({ className }: HealthOrbProps) {
  const orbRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const [particles, setParticles] = useState<
    Array<{ id: number; x: number; y: number; size: number; delay: number; duration: number }>
  >([]);

  // Generate particles on client side
  useEffect(() => {
    const generatedParticles = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: seededRandom(i * 7.7) * 100,
      y: seededRandom(i * 8.8) * 100,
      size: seededRandom(i * 9.9) * 3 + 1,
      delay: seededRandom(i * 10.1) * 5,
      duration: seededRandom(i * 11.2) * 3 + 4,
    }));
    setParticles(generatedParticles);
  }, []);

  // GSAP breathing animation
  useEffect(() => {
    if (!orbRef.current || !glowRef.current) return;

    const tl = gsap.timeline({ repeat: -1, yoyo: true });

    tl.to(orbRef.current, {
      scale: 1.05,
      duration: 4,
      ease: "sine.inOut",
    });

    const glowTl = gsap.timeline({ repeat: -1, yoyo: true });
    glowTl.to(glowRef.current, {
      opacity: 0.6,
      scale: 1.1,
      duration: 3,
      ease: "sine.inOut",
    });

    return () => {
      tl.kill();
      glowTl.kill();
    };
  }, []);

  return (
    <motion.div
      className={cn(
        "absolute right-8 md:right-24 top-1/2 -translate-y-1/2 z-10",
        className
      )}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.2, delay: 1, ease: "easeOut" }}
    >
      {/* Outer glow */}
      <div
        ref={glowRef}
        className="absolute w-[280px] h-[280px] md:w-[350px] md:h-[350px] rounded-full blur-3xl opacity-40"
        style={{
          background:
            "radial-gradient(circle, rgba(20, 184, 166, 0.5) 0%, transparent 70%)",
          transform: "translate(-50%, -50%)",
          left: "50%",
          top: "50%",
        }}
      />

      {/* Main orb container */}
      <div className="relative w-[200px] h-[200px] md:w-[280px] md:h-[280px] flex items-center justify-center">
        {/* Animated orb */}
        <div
          ref={orbRef}
          className="relative w-full h-full rounded-full bg-gradient-to-br from-teal-400/80 via-emerald-500/70 to-cyan-600/80"
          style={{
            borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%",
            animation: "morphOrb 10s ease-in-out infinite",
            boxShadow: "inset 0 0 60px rgba(0, 0, 0, 0.3)",
          }}
        >
          {/* Particles */}
          <div className="absolute inset-0 overflow-hidden rounded-full">
            {particles.map((particle) => (
              <div
                key={particle.id}
                className="absolute rounded-full bg-white/50"
                style={{
                  left: `${particle.x}%`,
                  top: `${particle.y}%`,
                  width: `${particle.size}px`,
                  height: `${particle.size}px`,
                  animation: `floatOrbParticle ${particle.duration}s ease-in-out infinite`,
                  animationDelay: `${particle.delay}s`,
                }}
              />
            ))}
          </div>

          {/* Inner content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <span className="text-xs md:text-sm font-medium uppercase tracking-widest opacity-80">
              Track Your
            </span>
            <span className="text-xl md:text-3xl font-bold tracking-tight mt-1">
              Health
            </span>
          </div>
        </div>
      </div>

      {/* CSS animations */}
      <style jsx global>{`
        @keyframes morphOrb {
          0%,
          100% {
            border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
          }
          25% {
            border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%;
          }
          50% {
            border-radius: 50% 60% 30% 60% / 30% 60% 70% 40%;
          }
          75% {
            border-radius: 60% 40% 60% 30% / 70% 30% 50% 60%;
          }
        }

        @keyframes floatOrbParticle {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.5;
          }
          25% {
            transform: translate(5px, -8px) scale(1.1);
            opacity: 0.7;
          }
          50% {
            transform: translate(-3px, -12px) scale(0.9);
            opacity: 0.4;
          }
          75% {
            transform: translate(-8px, -5px) scale(1.05);
            opacity: 0.6;
          }
        }
      `}</style>
    </motion.div>
  );
}
