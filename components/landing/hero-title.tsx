"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { cn } from "@/lib/utils";

interface HeroTitleProps {
  className?: string;
}

export function HeroTitle({ className }: HeroTitleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const line1Ref = useRef<HTMLDivElement>(null);
  const line2Ref = useRef<HTMLDivElement>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!line1Ref.current || !line2Ref.current || !subtitleRef.current) return;

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    // Initial state
    gsap.set([line1Ref.current, line2Ref.current], {
      y: 120,
      opacity: 0,
    });
    gsap.set(subtitleRef.current, {
      y: 30,
      opacity: 0,
    });

    // Animate in with stagger
    tl.to(line1Ref.current, {
      y: 0,
      opacity: 1,
      duration: 1.2,
      delay: 0.3,
    })
      .to(
        line2Ref.current,
        {
          y: 0,
          opacity: 1,
          duration: 1.2,
        },
        "-=0.8"
      )
      .to(
        subtitleRef.current,
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
        },
        "-=0.4"
      );

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute top-8 left-8 md:top-12 md:left-12 lg:top-16 lg:left-16 z-10",
        className
      )}
    >
      {/* Main title - Dangrek font, increased size */}
      <div className="overflow-hidden">
        <div
          ref={line1Ref}
          className="text-foreground uppercase"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(90px, 18vw, 300px)",
            lineHeight: 0.8,
            letterSpacing: "-0.02em",
          }}
        >
          LONGEVI
        </div>
      </div>
      <div className="overflow-hidden">
        <div
          ref={line2Ref}
          className="text-foreground uppercase"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(90px, 18vw, 300px)",
            lineHeight: 0.8,
            letterSpacing: "-0.02em",
          }}
        >
          LAB
        </div>
      </div>

      {/* Subtitle - larger size, aligned with title visual start */}
      <div className="overflow-hidden mt-8 md:mt-10 ml-3 md:ml-5 lg:ml-6">
        <div
          ref={subtitleRef}
          className="text-muted-foreground max-w-lg md:max-w-xl"
          style={{
            fontSize: "clamp(20px, 2.5vw, 32px)",
            lineHeight: 1.4,
          }}
        >
          <span className="text-foreground font-semibold">Open source</span>{" "}
          health tracking.
          <br />
          Your data stays{" "}
          <span className="text-foreground font-semibold">private</span>, on
          your server.
        </div>
      </div>
    </div>
  );
}
