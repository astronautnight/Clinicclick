'use client';

import Link from 'next/link';
import { LogoCC } from '@/components/icons';
import { Button } from '@/components/ui/button';
import PatientRecordsShowcase from '@/components/landing/PatientRecordsShowcase';
import FeatureShowcase from '@/components/landing/FeatureShowcase';

export default function FeaturesPage() {
  return (
    <div className="landing-page min-h-screen bg-white text-[#1a1a1a] flex flex-col overflow-x-hidden font-[var(--font-inter)]">
      {/* ── NAVBAR ── */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-6 h-[52px] flex items-center justify-between relative">
        <div className="flex items-center gap-2.5">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoCC className="h-7 w-7 text-[#1a1a1a]" />
            <span className="font-bold text-[17px] tracking-tight text-[#1a1a1a]">
              Clinic<span className="text-[#256AF3]">@</span>Click
            </span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
          <Link href="/features" className="text-sm font-semibold text-[#256AF3] transition-colors">
            Features
          </Link>
          <Link href="/#how-it-works" className="text-sm font-semibold text-[#1a1a1a]/70 hover:text-[#1a1a1a] transition-colors">
            How It Works
          </Link>
          <Link href="/#blog" className="text-sm font-semibold text-[#1a1a1a]/70 hover:text-[#1a1a1a] transition-colors">
            Blog
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="ghost"
            className="text-[#1a1a1a]/70 hover:text-[#1a1a1a] hover:bg-gray-100 text-sm font-medium h-8 px-3 rounded-lg"
          >
            <Link href="/login">Log in</Link>
          </Button>
          <Button
            asChild
            className="bg-[#2383e2] text-white hover:bg-[#1b6ec2] text-sm font-medium h-8 px-4 rounded-lg"
          >
            <Link href="/login">Get Clinic@Click free</Link>
          </Button>
        </div>
      </header>

      {/* ── FEATURES HERO ── */}
      <section className="mt-[52px] pt-16 pb-12 px-6 bg-gradient-to-b from-[#fafafa] to-[#f6f5f4] text-center border-b border-gray-100">
        <div className="max-w-[800px] mx-auto flex flex-col items-center">
          <span className="bg-blue-50 border border-blue-200 text-[#256AF3] text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider mb-4">
            Clinic@Click Features
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-[#1a1a1a] tracking-tight leading-tight mb-4">
            Everything you need for modern dental practice management.
          </h1>
          <p className="text-lg text-gray-500 max-w-[620px] mx-auto">
            Explore interactive patient records, dental charting, procedure workflows, staff attendance, and student academics in one platform.
          </p>
        </div>
      </section>

      {/* ── FEATURE SHOWCASE (PATIENT RECORDS FIRST) ── */}
      <main className="flex-1 bg-[#f6f5f4] py-12">
        <div className="max-w-[1024px] xl:max-w-[1100px] mx-auto px-6">
          <PatientRecordsShowcase />
        </div>
        <FeatureShowcase />
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-gray-100 py-8 px-6 bg-white">
        <div className="max-w-[960px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <div className="flex items-center gap-2 justify-center">
            <LogoCC className="h-5 w-5 text-gray-400" />
            <span className="font-semibold text-sm text-gray-600">Clinic@Click</span>
          </div>
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} Clinic@Click. All rights reserved.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs font-medium text-gray-600">
            <span className="font-semibold text-gray-400 uppercase tracking-wider text-[11px]">Contact Us:</span>
            <a href="https://wa.me/919137769195" target="_blank" rel="noopener noreferrer" className="hover:text-[#2383e2] transition-colors">
              +91 91377 69195
            </a>
            <span className="hidden sm:inline text-gray-300">•</span>
            <a href="mailto:clickatclick@gmail.com" className="hover:text-[#2383e2] transition-colors">
              clickatclick@gmail.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
