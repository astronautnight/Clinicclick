// src/components/layout/sidebar-nav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem, LucideIconName } from "@/types";
import { cn } from "@/lib/utils";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import {
  LayoutDashboard, Users, CalendarDays, ClipboardList, Stethoscope, Pill,
  DollarSign, MessageSquare, BookOpen, Settings, UserCircle, Share2, HelpCircle, Sparkles, Archive, type LucideIcon, Bell, ChevronRight, UsersRound, TrendingUp, TrendingDown, PersonStanding, CalendarCheck, CalendarX, Edit, Save, History, Printer, Copy, FileText, View, Search, Hospital, Upload, BriefcaseMedical, Wallet
} from 'lucide-react';

interface SidebarNavProps {
  items: NavItem[];
}

const iconMap: Record<LucideIconName, LucideIcon> = {
  LayoutDashboard, Users, CalendarDays, ClipboardList, Stethoscope, Pill,
  DollarSign, MessageSquare, BookOpen, Settings, UserCircle, Share2, HelpCircle, Sparkles, Archive, Bell, ChevronRight, UsersRound, TrendingUp, TrendingDown, PersonStanding, CalendarCheck, CalendarX, Edit, Save, History, Printer, Copy, FileText, View, Search, Hospital, Upload, BriefcaseMedical, Wallet
};

export function SidebarNav({ items }: SidebarNavProps) {
  const pathname = usePathname();

  if (!items?.length) {
    return null;
  }

  return (
    <nav className="grid items-start gap-1">
      {items.map((item, index) => {
        const IconComponent = iconMap[item.iconName] || iconMap.HelpCircle;
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
        
        // Always apply the item's specific color to the container
        const iconContainerClassName = cn(
          "p-1.5 rounded-md",
          item.color // Use the color from nav config directly
        );
        
        const finalIconClassName = cn("h-4 w-4", item.iconColorClass);

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
                <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
              </Link>
            </SidebarMenuButton>
          )
        );
      })}
    </nav>
  );
}

    
