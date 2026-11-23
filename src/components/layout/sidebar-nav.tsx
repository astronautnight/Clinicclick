// src/components/layout/sidebar-nav.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem, LucideIconName } from "@/types";
import { cn } from "@/lib/utils";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard, Users, CalendarDays, ClipboardList, Stethoscope, Pill,
  DollarSign, MessageSquare, BookOpen, Settings, UserCircle, Share2, HelpCircle, Sparkles, Archive, type LucideIcon, Bell, ChevronRight, ChevronDown, Rocket, UsersRound, TrendingUp, TrendingDown, PersonStanding, CalendarCheck, CalendarX, Edit, Save, History, Printer, Copy, FileText, View, Search, Hospital, Upload, BriefcaseMedical, Wallet,
  ShieldCheck, Activity, BarChart3
} from 'lucide-react';

interface SidebarNavProps {
  items: NavItem[];
  upcomingItems?: NavItem[];
}

const iconMap: Record<LucideIconName, LucideIcon> = {
  LayoutDashboard, Users, CalendarDays, ClipboardList, Stethoscope, Pill,
  DollarSign, MessageSquare, BookOpen, Settings, UserCircle, Share2, HelpCircle, Sparkles, Archive, Bell, ChevronRight, UsersRound, TrendingUp, TrendingDown, PersonStanding, CalendarCheck, CalendarX, Edit, Save, History, Printer, Copy, FileText, View, Search, Hospital, Upload, BriefcaseMedical, Wallet,
  ShieldCheck, Activity, BarChart3
};

export function SidebarNav({ items, upcomingItems = [] }: SidebarNavProps) {
  const pathname = usePathname();
  const [isUpcomingOpen, setIsUpcomingOpen] = useState(false);

  if (!items?.length && !upcomingItems?.length) {
    return null;
  }

  const isUpcomingActive = upcomingItems.some(
    (item) => pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
  );

  return (
    <nav className="grid items-start gap-1">
      {items.map((item, index) => {
        const IconComponent = iconMap[item.iconName] || iconMap.HelpCircle;
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
        
        // Tailwind scanner anchors to ensure these classes are compiled:
        // text-primary text-indigo-500 text-special1 text-special2 text-special3 text-special4 text-info text-special5 text-success text-warning text-neutral text-pink-500
        
        const baseColorClass = item.color ? item.color.replace('bg-', 'text-') : 'text-slate-500';

        const iconContainerClassName = cn(
          "p-1.5 rounded-lg bg-white dark:bg-white/[0.06] border border-slate-200/70 dark:border-white/[0.08] shadow-xs flex items-center justify-center transition-colors group-hover:dark:bg-white/[0.1]"
        );
        
        const finalIconClassName = cn("h-4 w-4", baseColorClass);

        return (
          item.href && (
            <SidebarMenuButton
              key={index}
              asChild
              variant="default"
              size="default"
              isActive={isActive}
              tooltip={item.title}
              className={cn(
                "justify-start",
                isActive ? 'bg-primary/10 hover:bg-primary/20 text-primary' : 'hover:bg-muted/80',
                item.disabled && "cursor-not-allowed opacity-80",
              )}
            >
              <Link href={item.disabled ? "#" : item.href}>
                <div className={iconContainerClassName}>
                    <IconComponent className={finalIconClassName} />
                </div>
                <span className="group-data-[collapsible=icon]:hidden ml-2">{item.title}</span>
              </Link>
            </SidebarMenuButton>
          )
        );
      })}

      {/* Upcoming Dropdown Menu (Below Settings) */}
      {upcomingItems.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              variant="default"
              size="default"
              isActive={isUpcomingActive}
              tooltip="Upcoming"
              className={cn(
                "justify-between w-full group/upcoming cursor-pointer",
                isUpcomingActive ? 'bg-primary/10 hover:bg-primary/20 text-primary' : 'hover:bg-muted/80'
              )}
            >
              <div className="flex items-center">
                <div className="p-1.5 rounded-lg bg-white dark:bg-white/[0.06] border border-slate-200/70 dark:border-white/[0.08] shadow-xs flex items-center justify-center transition-colors group-hover:dark:bg-white/[0.1]">
                  <Rocket className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                </div>
                <span className="group-data-[collapsible=icon]:hidden ml-2 font-medium">Upcoming</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 group-data-[state=open]/upcoming:rotate-180 group-data-[collapsible=icon]:hidden ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="right"
            align="start"
            className="w-56 p-1.5 shadow-lg border border-border/80 backdrop-blur-md"
          >
            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Upcoming Features
            </div>
            {upcomingItems.map((item) => {
              const IconComponent = iconMap[item.iconName] || iconMap.HelpCircle;
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              const baseColorClass = item.color ? item.color.replace('bg-', 'text-') : 'text-slate-500';

              return (
                <DropdownMenuItem key={item.href} asChild className="p-0 cursor-pointer">
                  <Link
                    href={item.disabled ? "#" : item.href}
                    className={cn(
                      "flex items-center gap-2.5 w-full px-2.5 py-2 text-sm rounded-md transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:bg-muted/80",
                      item.disabled && "cursor-not-allowed opacity-70"
                    )}
                  >
                    <div className="p-1 rounded-md bg-muted/60 flex items-center justify-center">
                      <IconComponent className={cn("h-4 w-4", baseColorClass)} />
                    </div>
                    <span>{item.title}</span>
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </nav>
  );
}

    
