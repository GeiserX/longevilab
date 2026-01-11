"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { signOut, useSession } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc";
import { useSelectedMember } from "@/contexts/selected-member-context";
import {
  Home01Icon,
  Settings01Icon,
  Logout01Icon,
  TestTube02Icon,
  ArrowUp01Icon,
  Moon02Icon,
  Sun03Icon,
  BookOpen01Icon,
  UserIcon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navigation = [
  { name: "Home", href: "/home", icon: Home01Icon },
  { name: "Biomarkers", href: "/biomarkers", icon: TestTube02Icon },
  { name: "Health Journal", href: "/journal", icon: BookOpen01Icon },
  { name: "Settings", href: "/settings", icon: Settings01Icon },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const { isMobile } = useSidebar();
  const { selectedMemberId, setSelectedMemberId } = useSelectedMember();
  const { data: members } = trpc.household.getMembers.useQuery();

  // Find the selected member or default to primary
  const selectedMember = members?.find((m) => m.id === selectedMemberId) ??
    members?.find((m) => m.isPrimary) ?? members?.[0];

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/login";
  };

  const handleSelectMember = (memberId: string | undefined) => {
    setSelectedMemberId(memberId);
  };

  const getInitials = (name: string | undefined, email: string | undefined) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return "U";
  };

  const formatDisplayName = (name: string | undefined) => {
    if (!name) return "User";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0];
    const firstName = parts[0];
    const lastInitial = parts[parts.length - 1][0].toUpperCase();
    return `${firstName} ${lastInitial}.`;
  };

  return (
    <Sidebar variant="inset" collapsible="icon">
      {/* Header with Brand */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/home" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <HugeiconsIcon icon={TestTube02Icon} className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Bloodwork</span>
                <span className="truncate text-xs text-muted-foreground">
                  Health Tracker
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Navigation Content */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/home" && pathname.startsWith(item.href));

                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      tooltip={item.name}
                    >
                      <HugeiconsIcon icon={item.icon} />
                      <span>{item.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with User Menu */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                className="w-full rounded-lg p-2 hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage
                      src={session?.user?.image || undefined}
                      alt={session?.user?.name || "User"}
                    />
                    <AvatarFallback className="rounded-lg">
                      {getInitials(selectedMember?.name ?? session?.user?.name, session?.user?.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-semibold">
                      {selectedMember?.name ?? formatDisplayName(session?.user?.name)}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {selectedMember?.isPrimary ? session?.user?.email : "Household member"}
                    </span>
                  </div>
                  <HugeiconsIcon
                    icon={ArrowUp01Icon}
                    className="ml-auto size-4 group-data-[collapsible=icon]:hidden"
                  />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                {/* Profile Switcher */}
                {members && members.length > 1 && (
                  <>
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>Switch Profile</DropdownMenuLabel>
                      {members.map((member) => (
                        <DropdownMenuItem
                          key={member.id}
                          onClick={() => handleSelectMember(member.id)}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <HugeiconsIcon icon={UserIcon} className="h-4 w-4" />
                            <span>{member.name}</span>
                            {member.isPrimary && (
                              <span className="text-xs text-muted-foreground">(You)</span>
                            )}
                          </div>
                          {selectedMember?.id === member.id && (
                            <HugeiconsIcon icon={Tick01Icon} className="h-4 w-4 text-primary" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  <HugeiconsIcon
                    icon={theme === "dark" ? Sun03Icon : Moon02Icon}
                    className="mr-2 h-4 w-4"
                  />
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <HugeiconsIcon icon={Logout01Icon} className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
