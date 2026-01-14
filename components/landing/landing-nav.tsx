"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function LandingNav() {
  return (
    <motion.nav
      className="absolute top-8 right-8 md:top-12 md:right-12 lg:top-16 lg:right-16 z-20"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 1.5 }}
    >
      <Link href="/login">
        <Button variant="ghost" className="text-foreground hover:bg-white/10">
          Sign in
        </Button>
      </Link>
    </motion.nav>
  );
}
