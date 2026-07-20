"use client";

import Link from "next/link";
import { UserCircle } from "lucide-react";
import { LogoCC } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/layout/notification-bell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { useUser } from "@/firebase";
import { signOutUser } from "@/services/auth-service";

export function Header() {
  const { isMobile } = useSidebar();
  const { user } = useUser();

  const handleLogout = async () => {
    try {
      await signOutUser();
      // The redirect will be handled by the page/layout listening to auth state.
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-2">
          {isMobile && <SidebarTrigger />}
          <Link href="/dashboard" className="flex items-center space-x-2">
            <LogoCC className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl tracking-tight whitespace-nowrap">
              Clinic<span className="text-primary">@</span>Click
            </span>
          </Link>
        </div>

        <div className="flex items-center space-x-2">
          <ThemeToggle />
          {user && <NotificationBell />}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <UserCircle className="h-6 w-6" />
                  <span className="sr-only">User Profile</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}