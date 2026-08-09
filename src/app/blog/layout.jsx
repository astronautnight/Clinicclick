import { PublicHeader } from '@/components/layout/PublicHeader';

export const metadata = {
  title: "Blog | Clinic@Click — Guides for dental practice management",
  description:
    "Articles on patient records, appointments, billing, dental charting, and more — written for dentists and dental students using Clinic@Click.",
  openGraph: {
    title: "Blog | Clinic@Click",
    description: "Guides and tips for modern dental practices.",
    url: "https://clinicatclick.com/blog",
    siteName: "Clinic@Click",
    type: "website",
  },
};

export default function BlogsLayout({ children }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <PublicHeader />
      <div className="pt-[52px] flex-1">
        {children}
      </div>
    </div>
  );
}
