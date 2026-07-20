'use client';

import { usePathname } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader as ShadSidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Header } from '@/components/layout/header';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { sidebarNavItems } from '@/config/nav';
import { LogoCC } from '@/components/icons';
import Link from 'next/link';

export function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isPublicPage =
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password');

  if (isPublicPage) {
    return <div className="w-full min-h-screen">{children}</div>;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      {/* Fixed height container with flex column */}
      <div className="flex flex-col h-full w-full">
        
        {/* Header - stays at top, outside scroll */}
        <Header />

        {/* Content area - flex row with sidebar and main */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          
          {/* Sidebar */}
          <Sidebar
            collapsible="icon"
            className="border-r"
          >
            <ShadSidebarHeader className="flex items-center justify-between p-4">
              <Link
                href="/dashboard"
                className="flex items-center space-x-2 group-data-[collapsible=icon]:hidden"
              >
                <LogoCC className="h-7 w-7 text-primary" />
                <span className="font-semibold text-lg tracking-tight">
                  Clinic<span className="text-primary">@</span>Click
                </span>
              </Link>

              <SidebarTrigger className="md:data-[sidebar=trigger]:flex" />
            </ShadSidebarHeader>

            <SidebarContent className="p-2">
              <SidebarNav items={sidebarNavItems} />
            </SidebarContent>

            <SidebarFooter className="p-2" />
          </Sidebar>

          {/* Main content area - scrollable */}
          <SidebarInset className="flex-1 overflow-y-auto overflow-x-hidden animate-fade-in">
            <main
              className="
                w-full
                px-4 py-4
                sm:px-6 sm:py-6
                lg:px-8 lg:py-8
                max-w-screen
              "
            >
              {children}
            </main>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
