import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from "@/components/ui/toaster";
import { PwaHandler } from '@/components/layout/pwa-handler';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { NotificationListener } from '@/components/NotificationListener';
import { FcmHandler } from '@/components/layout/fcm-handler';
import { AppUpdateHandler } from '@/components/layout/app-update-handler';
import { AppLayoutContent } from '@/components/layout/AppLayoutContent';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair-display',
});
const geistMono = GeistMono;

const APP_NAME = 'Clinic@Click - Clinic Management Software for Dentists';
const APP_DEFAULT_TITLE = 'Clinic@Click';
const APP_TITLE_TEMPLATE = '%s - Clinic@Click';
const APP_DESCRIPTION =
  'Clinic@Click is a modern dental clinic management software for appointments, patient records, billing, dental charts, inventory, and practice growth.';
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
          inter.variable,
          playfair.variable,
          geistMono.variable
        )}
      >
        <FirebaseClientProvider>
          <FirebaseErrorListener />
          <NotificationListener />
          <PwaHandler />
          <FcmHandler />
          <AppUpdateHandler />

          <AppLayoutContent>
            {children}
          </AppLayoutContent>

          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}