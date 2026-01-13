"use client";

import { createAuthClient } from "better-auth/react";

// Use relative URL or detect from window.location for runtime configuration
// This works regardless of the deployment URL
function getBaseURL(): string {
  if (typeof window !== "undefined") {
    // Use relative URL - Better Auth will use the same origin
    return window.location.origin;
  }
  // Fallback for SSR (shouldn't happen in client component)
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
});

export const { signIn, signOut, signUp, useSession } = authClient;
