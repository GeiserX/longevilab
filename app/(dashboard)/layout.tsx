"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { TRPCProvider } from "@/components/providers/trpc-provider";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { SelectedMemberProvider } from "@/contexts/selected-member-context";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <TRPCProvider>
      <SelectedMemberProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            {/* Mobile-only trigger bar */}
            <div className="md:hidden flex h-14 shrink-0 items-center px-4 border-b border-border">
              <SidebarTrigger className="-ml-1" />
            </div>
            {/* Main content - scrollable */}
            <div className="flex-1 overflow-auto px-4 py-6 sm:px-6 lg:px-8">
              {children}
            </div>
          </SidebarInset>
        </SidebarProvider>
      </SelectedMemberProvider>
    </TRPCProvider>
  );
}
