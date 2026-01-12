"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

interface BiologicalAgeBlobProps {
  biologicalAge: number | null;
  chronologicalAge: number;
  confidence: "high" | "medium" | "low";
  missingBiomarkers?: string[];
  onHover?: () => void;
}

export function BiologicalAgeBlob({
  biologicalAge,
  chronologicalAge,
  confidence,
  missingBiomarkers = [],
}: BiologicalAgeBlobProps) {
  const blobRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Calculate age difference
  const ageDifference = biologicalAge !== null ? biologicalAge - chronologicalAge : 0;
  const isYounger = ageDifference < -0.5;
  const isOlder = ageDifference > 0.5;

  // Determine colors based on result
  const colorClass = isYounger
    ? "from-emerald-400 via-teal-500 to-cyan-600"
    : isOlder
    ? "from-amber-400 via-orange-500 to-red-500"
    : "from-stone-400 via-stone-500 to-stone-600";

  const glowColor = isYounger
    ? "rgba(20, 184, 166, 0.4)"
    : isOlder
    ? "rgba(249, 115, 22, 0.4)"
    : "rgba(168, 162, 158, 0.3)";

  // GSAP breathing animation
  useEffect(() => {
    if (!blobRef.current) return;

    const tl = gsap.timeline({ repeat: -1, yoyo: true });
    tl.to(blobRef.current, {
      scale: 1.03,
      duration: 3,
      ease: "sine.inOut",
    });

    return () => {
      tl.kill();
    };
  }, []);

  // Generate particle positions
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    delay: Math.random() * 5,
    duration: Math.random() * 3 + 4,
  }));

  const displayAge = biologicalAge !== null ? Math.round(biologicalAge).toString() : "--";

  // Determine display text for age difference or status message
  let differenceText: string;
  if (biologicalAge !== null) {
    const roundedDiff = Math.round(ageDifference);
    if (roundedDiff < 0) {
      differenceText = `${Math.abs(roundedDiff)} year${Math.abs(roundedDiff) !== 1 ? 's' : ''} younger`;
    } else if (roundedDiff > 0) {
      differenceText = `${roundedDiff} year${roundedDiff !== 1 ? 's' : ''} older`;
    } else {
      differenceText = "Same as chronological age";
    }
  } else if (missingBiomarkers.length > 0 && missingBiomarkers.length < 9) {
    differenceText = "Missing required biomarkers";
  } else {
    differenceText = "Upload a blood test to calculate";
  }

  return (
    <>
      {/* Container with extra padding to prevent animation overflow */}
      <div
        className="relative flex items-center justify-center p-20 overflow-visible"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Dark background circle */}
        <div className="absolute w-[340px] h-[340px] rounded-full bg-stone-950 shadow-2xl" />

        {/* Glow effect */}
        <div
          className="absolute w-[300px] h-[300px] rounded-full blur-3xl transition-opacity duration-500"
          style={{
            background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
            opacity: isHovered ? 0.7 : 0.5,
          }}
        />

        {/* Main blob with transparency */}
        <div
          ref={blobRef}
          className={`relative w-[280px] h-[280px] rounded-blob bg-gradient-to-br ${colorClass} shadow-xl opacity-90`}
          style={{
            borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%",
            animation: "morphBlob 8s ease-in-out infinite",
          }}
        >
          {/* Particles container */}
          <div ref={particlesRef} className="absolute inset-0 overflow-hidden">
            {particles.map((particle) => (
              <div
                key={particle.id}
                className="absolute rounded-full bg-white/60"
                style={{
                  left: `${particle.x}%`,
                  top: `${particle.y}%`,
                  width: `${particle.size}px`,
                  height: `${particle.size}px`,
                  animation: `floatParticle ${particle.duration}s ease-in-out infinite`,
                  animationDelay: `${particle.delay}s`,
                }}
              />
            ))}
          </div>

          {/* Content overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <span className="text-6xl font-bold tracking-tight drop-shadow-lg">
              {displayAge}
            </span>
            <span className="text-sm font-medium uppercase tracking-widest mt-1 opacity-90">
              Biological Age
            </span>
            <span
              className={`text-sm mt-3 font-medium ${
                isYounger
                  ? "text-emerald-100"
                  : isOlder
                  ? "text-orange-100"
                  : "text-stone-200"
              }`}
            >
              {differenceText}
            </span>
            {confidence !== "high" && biologicalAge !== null && (
              <span className="text-xs mt-2 opacity-70">
                {confidence === "medium" ? "Moderate confidence" : "Low confidence"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* CSS animations */}
      <style jsx global>{`
        @keyframes morphBlob {
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

        @keyframes floatParticle {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.6;
          }
          25% {
            transform: translate(5px, -8px) scale(1.05);
            opacity: 0.8;
          }
          50% {
            transform: translate(-3px, -12px) scale(0.95);
            opacity: 0.5;
          }
          75% {
            transform: translate(-8px, -5px) scale(1.02);
            opacity: 0.7;
          }
        }
      `}</style>
    </>
  );
}
