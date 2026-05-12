import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { cn } from '@/lib/utils';
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
import { Toaster } from "@/components/ui/toaster";
import { LogoCC } from '@/components/icons';
import Link from 'next/link';
import { PwaHandler } from '@/components/layout/pwa-handler';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

const geistSans = GeistSans;
const geistMono = GeistMono;

const APP_NAME = 'Clinic@Click - Clinic Management Software for Dentists';
const APP_DEFAULT_TITLE = 'Clinic@Click';
const APP_TITLE_TEMPLATE = '%s - Clinic@Click';
const APP_DESCRIPTION =
  'Elevate your dental practice with Clinic@Click, the all-in-one management solution.';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_DEFAULT_TITLE,
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#A0E7E5",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content={APP_DEFAULT_TITLE} />
      </head>

      <body
        className={cn(
          "h-full bg-background font-sans antialiased",
          geistSans.variable,
          geistMono.variable
        )}
      >
        <FirebaseClientProvider>
          <FirebaseErrorListener />
          <PwaHandler />

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
                      href="/"
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
                <SidebarInset className="flex-1 overflow-y-auto overflow-x-hidden">
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

            <Toaster />
          </SidebarProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}