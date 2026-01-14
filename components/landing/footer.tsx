"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { Github01Icon, Mail01Icon } from "@hugeicons/core-free-icons";

export function Footer() {
  return (
    <footer className="bg-stone-950 border-t border-stone-800">
      <div className="container mx-auto px-8 md:px-12 lg:px-16 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {/* Brand */}
          <div>
            <h3 className="font-sans font-black text-foreground text-2xl mb-3">
              LONGEVILAB
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Open-source health tracking.
              <br />
              Self-hosted. Privacy-focused.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-mono text-foreground text-xs uppercase tracking-widest mb-4">
              Resources
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/docs"
                  className="text-muted-foreground text-sm hover:text-foreground transition-colors"
                >
                  Documentation
                </Link>
              </li>
              <li>
                <Link
                  href="https://github.com/longevilab/longevilab"
                  target="_blank"
                  className="text-muted-foreground text-sm hover:text-foreground transition-colors"
                >
                  GitHub
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-muted-foreground text-sm hover:text-foreground transition-colors"
                >
                  Sign in
                </Link>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="font-mono text-foreground text-xs uppercase tracking-widest mb-4">
              Connect
            </h4>
            <div className="flex gap-4">
              <motion.a
                href="https://github.com/longevilab/longevilab"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <HugeiconsIcon icon={Github01Icon} className="h-5 w-5" />
              </motion.a>
              <motion.a
                href="mailto:hello@longevilab.com"
                className="text-muted-foreground hover:text-foreground transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <HugeiconsIcon icon={Mail01Icon} className="h-5 w-5" />
              </motion.a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-stone-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p className="text-muted-foreground text-xs">
            © {new Date().getFullYear()} Longevilab. All rights reserved.
          </p>
          <p className="text-muted-foreground text-xs font-mono">
            Built for longevity enthusiasts
          </p>
        </div>
      </div>
    </footer>
  );
}
