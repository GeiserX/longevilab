"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";

export function LandingCta() {
  return (
    <motion.div
      className="absolute bottom-8 left-8 md:bottom-12 md:left-12 lg:bottom-16 lg:left-16 z-10"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, delay: 1.8 }}
    >
      <div className="flex flex-row gap-4 md:gap-5">
        <Link href="/login">
          <Button
            className="bg-white text-stone-950 hover:bg-white/90 h-12 md:h-14 px-6 md:px-8 text-base md:text-lg"
          >
            Log in
          </Button>
        </Link>
        <Link href="/docs" target="_blank">
          <Button
            variant="ghost"
            className="text-foreground hover:bg-white/10 h-12 md:h-14 px-5 md:px-6 text-base md:text-lg"
          >
            Docs
            <HugeiconsIcon icon={ArrowRight01Icon} className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}
