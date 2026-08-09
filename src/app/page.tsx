'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { LogoCC } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetTitle,
} from '@/components/ui/sheet';
import HeroAnimation from '@/components/landing/HeroAnimation';
import FeatureShowcase from '@/components/landing/FeatureShowcase';
import {
  Users,
  CalendarDays,
  ClipboardList,
  Stethoscope,
  PersonStanding,
  Pill,
  DollarSign,
  X,
  ArrowRight,
  Syringe,
  Microscope,
  Calendar,
  GraduationCap,
  Sparkles,
  MessageSquare,
  Building2,
  LayoutDashboard,
  Check,
  Clock,
  Plus,
  Zap,
  Menu,
  type LucideIcon,
} from 'lucide-react';

/* ────────────────────────────────────────────────────────
   7 FEATURE ICONS
   ──────────────────────────────────────────────────────── */
interface Feature {
  title: string;
  icon: LucideIcon;
  color: string;       // icon stroke color
  border: string;      // border color matching icon
  bgHover: string;     // hover background
  bgActive: string;    // active background
  tagline: string;
  description: string;
}

const features: Feature[] = [
  {
    title: 'Patients',
    icon: Users,
    color: 'text-violet-500',
    border: 'border-violet-300',
    bgHover: 'hover:bg-violet-50',
    bgActive: 'bg-violet-50 ring-violet-300',
    tagline: 'Smart patient records',
    description:
      'Maintain demographics, treatment histories, clinical notes, dental charts, and medical alerts — all in one place.',
  },
  {
    title: 'Appointments',
    icon: CalendarDays,
    color: 'text-orange-500',
    border: 'border-orange-300',
    bgHover: 'hover:bg-orange-50',
    bgActive: 'bg-orange-50 ring-orange-300',
    tagline: 'Schedule with ease',
    description:
      'Visual calendar with walk-ins, online booking, queue management, and automated reminders.',
  },
  {
    title: 'Procedures',
    icon: ClipboardList,
    color: 'text-rose-500',
    border: 'border-rose-300',
    bgHover: 'hover:bg-rose-50',
    bgActive: 'bg-rose-50 ring-rose-300',
    tagline: 'Clinical workflows',
    description:
      'Define treatment plans, track completed and ongoing procedures, and manage clinical protocols.',
  },
  {
    title: 'Doctors',
    icon: Stethoscope,
    color: 'text-blue-500',
    border: 'border-blue-300',
    bgHover: 'hover:bg-blue-50',
    bgActive: 'bg-blue-50 ring-blue-300',
    tagline: 'Team management',
    description:
      'Add doctors, assign schedules, track performance, and manage professional profiles.',
  },
  {
    title: 'Staff',
    icon: PersonStanding,
    color: 'text-cyan-500',
    border: 'border-cyan-300',
    bgHover: 'hover:bg-cyan-50',
    bgActive: 'bg-cyan-50 ring-cyan-300',
    tagline: 'Your support crew',
    description:
      'Manage receptionists, hygienists, and assistants with role-based access and shift scheduling.',
  },
  {
    title: 'Pharmacy',
    icon: Pill,
    color: 'text-emerald-500',
    border: 'border-emerald-300',
    bgHover: 'hover:bg-emerald-50',
    bgActive: 'bg-emerald-50 ring-emerald-300',
    tagline: 'Prescriptions & drugs',
    description:
      'Drug formulary, digital prescriptions, dispensing tracking, and stock-level monitoring.',
  },
  {
    title: 'Financials',
    icon: DollarSign,
    color: 'text-amber-500',
    border: 'border-amber-300',
    bgHover: 'hover:bg-amber-50',
    bgActive: 'bg-amber-50 ring-amber-300',
    tagline: 'Revenue & expenses',
    description:
      'Invoices, payments, pending balances, monthly trends, and exportable financial reports.',
  },
];

/* ────────────────────────────────────────────────────────
   DYNAMIC WORDS
   ──────────────────────────────────────────────────────── */
const dynamicWords = [
  { word: 'Care',        dot: 'bg-blue-500',    bg: 'bg-blue-100 text-blue-900' },
  { word: 'Treat',       dot: 'bg-emerald-500', bg: 'bg-emerald-100 text-emerald-900' },
  { word: 'Chart',       dot: 'bg-violet-500',  bg: 'bg-violet-100 text-violet-900' },
  { word: 'Schedule',    dot: 'bg-orange-500',  bg: 'bg-orange-100 text-orange-900' },
  { word: 'Manage',      dot: 'bg-rose-500',    bg: 'bg-rose-100 text-rose-900' },
  { word: 'Track',       dot: 'bg-amber-500',   bg: 'bg-amber-100 text-amber-900' },
  { word: 'Collaborate', dot: 'bg-indigo-500',  bg: 'bg-indigo-100 text-indigo-900' },
  { word: 'Grow',        dot: 'bg-teal-500',    bg: 'bg-teal-100 text-teal-900' },
  { word: 'Smile',       dot: 'bg-pink-500',    bg: 'bg-pink-100 text-pink-900' },
];

/* ────────────────────────────────────────────────────────
   COMPONENT
   ──────────────────────────────────────────────────────── */
export default function LandingPage() {
  const [activeFeature, setActiveFeature] = useState<number | null>(null);
  const [wordIndex, setWordIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setWordIndex((prev) => (prev + 1) % dynamicWords.length);
        setIsAnimating(false);
      }, 350);
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  const handleFeatureClick = useCallback((index: number) => {
    setActiveFeature((prev) => (prev === index ? null : index));
  }, []);

  const activeData = activeFeature !== null ? features[activeFeature] : null;
  const currentWord = dynamicWords[wordIndex];

  return (
    <div className="landing-page min-h-screen bg-white text-[#1a1a1a] flex flex-col overflow-x-hidden font-[var(--font-inter)]">

      {/* ── NAVBAR ── */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-6 h-[52px] flex items-center justify-between relative">
        <div className="flex items-center gap-2.5">
          <LogoCC className="h-7 w-7 text-[#1a1a1a]" />
          <span className="font-bold text-[17px] tracking-tight text-[#1a1a1a]">
            Clinic<span className="text-[#256AF3]">@</span>Click
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
          <Link href="/features" className="text-sm font-semibold text-[#1a1a1a]/70 hover:text-[#1a1a1a] transition-colors">
            Features
          </Link>
          <Link href="#how-it-works" className="text-sm font-semibold text-[#1a1a1a]/70 hover:text-[#1a1a1a] transition-colors">
            How It Works
          </Link>
          <Link href="/blog" className="text-sm font-semibold text-[#1a1a1a]/70 hover:text-[#1a1a1a] transition-colors">
            Blog
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="ghost"
            className="hidden sm:inline-flex text-[#1a1a1a]/70 hover:text-[#1a1a1a] hover:bg-gray-100 text-sm font-medium h-8 px-3 rounded-lg"
          >
            <Link href="/login">Log in</Link>
          </Button>
          <Button
            asChild
            className="bg-[#2383e2] text-white hover:bg-[#1b6ec2] text-sm font-medium h-8 px-4 rounded-lg"
          >
            <Link href="/login">Get Clinic@Click free</Link>
          </Button>

          {/* Mobile Menu */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-[#1a1a1a]">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="top" className="h-screen w-full bg-[#fafafa] flex flex-col pt-20 border-none">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <nav className="flex flex-col gap-6 px-2">
                  <SheetClose asChild>
                    <Link href="/features" className="text-[28px] font-semibold text-[#1a1a1a] tracking-tight hover:opacity-70 transition-opacity">
                      Features
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link href="#how-it-works" className="text-[28px] font-semibold text-[#1a1a1a] tracking-tight hover:opacity-70 transition-opacity">
                      How It Works
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link href="/blog" className="text-[28px] font-semibold text-[#1a1a1a] tracking-tight hover:opacity-70 transition-opacity">
                      Blog
                    </Link>
                  </SheetClose>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="mt-[52px] flex-1 flex flex-col items-center text-center px-6 pt-12 md:pt-16 relative w-full max-w-[1200px] mx-auto">
        
        {/* Floating Decorative Icons (Notion Style) */}
        <div className="absolute inset-0 z-0 pointer-events-none hidden lg:block">
          
          {/* Yellow Tooth (Top Left) */}
          <div className="absolute top-10 left-12 flex items-center gap-2 animate-[float_4s_ease-in-out_infinite]">
            <svg width="40" height="30" viewBox="0 0 40 30" fill="none" className="text-gray-800 -rotate-12 mt-4">
              <path d="M5 25 Q 20 5 40 15" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
            <div className="relative">
              <div className="w-14 h-14 bg-[#FFC843] rounded-full border-2 border-gray-900 flex items-center justify-center shadow-sm -rotate-12">
                <svg className="w-7 h-7 text-gray-900" viewBox="0 0 24 24" fill="white" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 4C15.5 4 14 5 12 5C10 5 8.5 4 6.5 4C4 4 3 6.5 3 9.5C3 12.5 5 15 6 19C6.5 21 8.5 21 9 19C9.5 17 10 15 12 15C14 15 14.5 17 15 19C15.5 21 17.5 21 18 19C19 15 21 12.5 21 9.5C21 6.5 20 4 17.5 4Z"/></svg>
              </div>
              <div className="absolute -bottom-1 -right-2 w-5 h-5 bg-gray-300 rounded-full border border-white flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
            </div>
          </div>

          {/* Purple Stethoscope (Top Right) */}
          <div className="absolute top-16 right-12 flex items-center gap-2 animate-[float_5s_ease-in-out_infinite_1.5s]">
            <div className="relative">
              <div className="w-12 h-12 bg-[#B372F7] rounded-full border-2 border-gray-900 flex items-center justify-center shadow-sm rotate-12">
                <Stethoscope className="w-6 h-6 text-gray-900" strokeWidth={2.5} />
              </div>
              <div className="absolute -top-1 -right-2 w-5 h-5 bg-white rounded-full border border-gray-200 flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.699-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"/></svg>
              </div>
            </div>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-900 -mt-8 -ml-2">
              <path d="M12 2L13 9L20 10L13 11L12 18L11 11L4 10L11 9L12 2Z" fill="currentColor" />
            </svg>
          </div>

          {/* Orange Syringe (Middle Right) */}
          <div className="absolute top-56 right-20 flex items-center gap-2 animate-[float_4s_ease-in-out_infinite_2s]">
            <div className="relative">
              <div className="w-14 h-14 bg-[#F87C41] rounded-full border-2 border-gray-900 flex items-center justify-center shadow-sm -rotate-6">
                <Syringe className="w-7 h-7 text-gray-900" strokeWidth={2.5} />
              </div>
              <div className="absolute -bottom-2 -left-2 w-5 h-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white font-bold">
                8
              </div>
            </div>
          </div>

        </div>

        {/* ── Colorful icon row (overlapping, wiggle on hover) ── */}
        <div className="flex items-center justify-center mb-10 md:mb-12 mt-2">
          {features.map((f, i) => {
            const Icon = f.icon;
            const isActive = activeFeature === i;
            return (
              <button
                key={f.title}
                onClick={() => handleFeatureClick(i)}
                className="group relative -ml-2 first:ml-0 hover:z-10 transition-all duration-200"
                title={f.title}
                style={{ zIndex: isActive ? 10 : features.length - i }}
              >
                <div
                  className={`
                    w-[64px] h-[64px] md:w-[76px] md:h-[76px] rounded-full flex items-center justify-center
                    transition-all duration-200 cursor-pointer
                    border-[2.5px] shadow-sm
                    group-hover:landing-wiggle
                    ${isActive
                      ? `${f.bgActive} ${f.border} ring-2 scale-110 shadow-md`
                      : `bg-white ${f.border} ${f.bgHover}`
                    }
                  `}
                >
                  <Icon
                    className={`h-7 w-7 md:h-8 md:w-8 ${f.color}`}
                    strokeWidth={1.8}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Feature card ── */}
        {activeData && (
          <div className="w-full max-w-lg mb-10 landing-fade-in">
            <div className="relative rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-200/60 p-6 text-left">
              <button
                onClick={() => setActiveFeature(null)}
                className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-start gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${features[activeFeature!].bgActive.split(' ')[0]}`}>
                  <activeData.icon className={`h-5 w-5 ${features[activeFeature!].color}`} strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-[#1a1a1a] mb-0.5">{activeData.title}</h3>
                  <p className="text-sm text-gray-400 mb-2">{activeData.tagline}</p>
                  <p className="text-sm leading-relaxed text-gray-600">{activeData.description}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Heading ── */}
        <h1 className="font-bold leading-[1.2] mb-5 max-w-[1000px] tracking-[-0.03em] text-[clamp(2.2rem,5vw,3.8rem)] text-[#1a1a1a]">
          Where Clinics and Practitioners<br className="hidden md:block" />
          <span className={`inline-flex items-center gap-2.5 align-middle px-5 py-1 rounded-full border-0 mt-1 mx-2 transition-colors duration-300 ${currentWord.bg}`}>
            <span className={`w-3 h-3 rounded-full ${currentWord.dot} shrink-0 transition-colors duration-300`} />
            <span
              className={`transition-all duration-300 ${
                isAnimating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
              }`}
            >
              {currentWord.word}
            </span>
          </span>{' '}
          together.
        </h1>

        {/* ── Subtitle ── */}
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          Manage patients, track finances, and automate workflows with AI built for your dental practice.
        </p>

        {/* ── Buttons ── */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center relative z-10">
          <Button asChild size="lg" className="bg-[#2383e2] hover:bg-blue-600 text-white rounded-lg px-8 h-12 text-base font-semibold whitespace-nowrap">
            <Link href="/login">Get Clinic@Click for free</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-[#2383e2] text-[#2383e2] hover:bg-blue-50 rounded-lg px-8 h-12 text-base font-semibold whitespace-nowrap">
            <a href="https://play.google.com/store/apps/details?id=com.clinicclick.app" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.523 15.3414C17.0709 15.3414 16.7027 15.7095 16.7027 16.1616C16.7027 16.6138 17.0709 16.9819 17.523 16.9819C17.9752 16.9819 18.3433 16.6138 18.3433 16.1616C18.3433 15.7095 17.9752 15.3414 17.523 15.3414ZM6.47702 15.3414C6.02488 15.3414 5.65674 15.7095 5.65674 16.1616C5.65674 16.6138 6.02488 16.9819 6.47702 16.9819C6.92917 16.9819 7.29731 16.6138 7.29731 16.1616C7.29731 15.7095 6.92917 15.3414 6.47702 15.3414ZM17.9625 10.6074L19.6806 7.62535C19.8251 7.37521 19.7397 7.05436 19.4895 6.9099C19.2394 6.76543 18.9185 6.85084 18.7741 7.10099L17.0371 10.1166C15.6178 9.4715 13.9161 9.09631 12 9.09631C10.0839 9.09631 8.38217 9.4715 6.96288 10.1166L5.22591 7.10099C5.08145 6.85084 4.7606 6.76543 4.51046 6.9099C4.26031 7.05436 4.1749 7.37521 4.31936 7.62535L6.03749 10.6074C2.92383 12.2858 0.77124 15.421 0.505005 19.1673H23.495C23.2288 15.421 21.0762 12.2858 17.9625 10.6074Z" />
              </svg>
              Download on Android
            </a>
          </Button>
        </div>

        {/* ── Stats ── */}
        <div className="w-full border-t border-gray-100 pt-5 pb-4">
          <div className="flex items-center justify-center gap-8 md:gap-12 flex-wrap text-gray-400">
            {[
              ['11+', 'Modules'],
              ['AI', 'Powered'],
              ['256-bit', 'Encrypted'],
              ['Multi', 'Doctor'],
              ['Student', 'Ready'],
            ].map(([value, label]) => (
              <div key={label} className="flex flex-col items-center">
                <span className="text-lg font-bold text-gray-800 leading-tight">{value}</span>
                <span className="text-[10px] uppercase tracking-wider font-medium text-gray-400 mt-0.5">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HERO ANIMATION ── */}
      <div id="how-it-works" className="scroll-mt-14">
        <HeroAnimation />
      </div>

      {/* ── FEATURE SHOWCASE (NOTION-STYLE) ── */}
      <FeatureShowcase />

      {/* ── ROADMAP / PRODUCT RELEASES (NOTION STYLE) ── */}
      <section id="blog" className="px-6 py-20 bg-[#fafafa] border-t border-gray-100 scroll-mt-14">
        <div className="max-w-[1024px] mx-auto flex flex-col gap-12">
          
          {/* Section 1: Recently Released */}
          <div>
            <div className="mb-5 flex items-center gap-2">
              <div className="h-[1px] w-4 bg-gray-300"></div>
              <span className="text-[12px] font-bold text-gray-500 tracking-wider uppercase">Recently Released</span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Card 1: Student Module */}
              <div className="group bg-white border border-gray-200/80 rounded-2xl p-6 flex flex-col justify-between hover:shadow-md transition-all cursor-pointer aspect-square sm:aspect-auto sm:min-h-[180px]">
                <div className="relative w-12 h-12">
                  <div className="w-12 h-12 rounded-full bg-[#c4b5fd] border-[2.5px] border-[#1a1a1a] flex items-center justify-center">
                    <GraduationCap className="w-6 h-6 text-[#1a1a1a]" strokeWidth={2.5} />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border-[2px] border-[#1a1a1a] flex items-center justify-center shadow-sm">
                    <Check className="w-3.5 h-3.5 text-[#1a1a1a]" strokeWidth={3} />
                  </div>
                </div>
                <h4 className="font-bold text-[15px] sm:text-[16px] text-gray-900 leading-tight">
                  Student Module
                </h4>
              </div>

              {/* Card 2: Staff Attendance */}
              <div className="group bg-white border border-gray-200/80 rounded-2xl p-6 flex flex-col justify-between hover:shadow-md transition-all cursor-pointer aspect-square sm:aspect-auto sm:min-h-[180px]">
                <div className="relative w-12 h-12">
                  <div className="w-12 h-12 rounded-full bg-[#fde047] border-[2.5px] border-[#1a1a1a] flex items-center justify-center">
                    <PersonStanding className="w-6 h-6 text-[#1a1a1a]" strokeWidth={2.5} />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border-[2px] border-[#1a1a1a] flex items-center justify-center shadow-sm">
                    <Clock className="w-3.5 h-3.5 text-[#1a1a1a]" strokeWidth={3} />
                  </div>
                </div>
                <h4 className="font-bold text-[15px] sm:text-[16px] text-gray-900 leading-tight">
                  Staff Attendance
                </h4>
              </div>

              {/* Card 3: Dental Chart */}
              <div className="group bg-white border border-gray-200/80 rounded-2xl p-6 flex flex-col justify-between hover:shadow-md transition-all cursor-pointer aspect-square sm:aspect-auto sm:min-h-[180px]">
                <div className="relative w-12 h-12">
                  <div className="w-12 h-12 rounded-full bg-[#fca5a5] border-[2.5px] border-[#1a1a1a] flex items-center justify-center">
                    <ClipboardList className="w-6 h-6 text-[#1a1a1a]" strokeWidth={2.5} />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border-[2px] border-[#1a1a1a] flex items-center justify-center shadow-sm">
                    <Check className="w-3.5 h-3.5 text-[#1a1a1a]" strokeWidth={3} />
                  </div>
                </div>
                <h4 className="font-bold text-[15px] sm:text-[16px] text-gray-900 leading-tight">
                  Dental Chart
                </h4>
              </div>
            </div>
          </div>

          {/* Section 2: Coming Soon */}
          <div>
            <div className="mb-5 flex items-center gap-2">
              <div className="h-[1px] w-4 bg-gray-300"></div>
              <span className="text-[12px] font-bold text-gray-500 tracking-wider uppercase">Coming Soon</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Card 1: SMS Reminders */}
              <div className="group bg-white border border-gray-200/80 rounded-2xl p-6 flex flex-col justify-between hover:shadow-md transition-all cursor-pointer aspect-square sm:aspect-auto sm:min-h-[180px]">
                <div className="relative w-12 h-12">
                  <div className="w-12 h-12 rounded-full bg-[#93c5fd] border-[2.5px] border-[#1a1a1a] flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-[#1a1a1a]" strokeWidth={2.5} />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border-[2px] border-[#1a1a1a] flex items-center justify-center shadow-sm">
                    <Zap className="w-3.5 h-3.5 text-[#1a1a1a]" strokeWidth={3} />
                  </div>
                </div>
                <h4 className="font-bold text-[15px] sm:text-[16px] text-gray-900 leading-tight">
                  SMS Reminders
                </h4>
              </div>

              {/* Card 2: AI Assistant */}
              <div className="group bg-white border border-gray-200/80 rounded-2xl p-6 flex flex-col justify-between hover:shadow-md transition-all cursor-pointer aspect-square sm:aspect-auto sm:min-h-[180px]">
                <div className="relative w-12 h-12">
                  <div className="w-12 h-12 rounded-full bg-[#c084fc] border-[2.5px] border-[#1a1a1a] flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-[#1a1a1a]" strokeWidth={2.5} />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border-[2px] border-[#1a1a1a] flex items-center justify-center shadow-sm">
                    <Plus className="w-3.5 h-3.5 text-[#1a1a1a]" strokeWidth={3} />
                  </div>
                </div>
                <h4 className="font-bold text-[15px] sm:text-[16px] text-gray-900 leading-tight">
                  AI Assistant
                </h4>
              </div>

              {/* Card 3: WhatsApp Integration */}
              <div className="group bg-white border border-gray-200/80 rounded-2xl p-6 flex flex-col justify-between hover:shadow-md transition-all cursor-pointer aspect-square sm:aspect-auto sm:min-h-[180px]">
                <div className="relative w-12 h-12">
                  <div className="w-12 h-12 rounded-full bg-[#86efac] border-[2.5px] border-[#1a1a1a] flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-[#1a1a1a]" strokeWidth={2.5} />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border-[2px] border-[#1a1a1a] flex items-center justify-center shadow-sm">
                    <Check className="w-3.5 h-3.5 text-[#1a1a1a]" strokeWidth={3} />
                  </div>
                </div>
                <h4 className="font-bold text-[15px] sm:text-[16px] text-gray-900 leading-tight">
                  WhatsApp
                </h4>
              </div>

              {/* Card 4: Multi-Clinic Dashboard */}
              <div className="group bg-white border border-gray-200/80 rounded-2xl p-6 flex flex-col justify-between hover:shadow-md transition-all cursor-pointer aspect-square sm:aspect-auto sm:min-h-[180px]">
                <div className="relative w-12 h-12">
                  <div className="w-12 h-12 rounded-full bg-[#fdba74] border-[2.5px] border-[#1a1a1a] flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-[#1a1a1a]" strokeWidth={2.5} />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border-[2px] border-[#1a1a1a] flex items-center justify-center shadow-sm">
                    <Plus className="w-3.5 h-3.5 text-[#1a1a1a]" strokeWidth={3} />
                  </div>
                </div>
                <h4 className="font-bold text-[15px] sm:text-[16px] text-gray-900 leading-tight">
                  Multi-Clinic
                </h4>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── VIDEO DEMO ── */}
      <section className="px-6 py-20 bg-[#0d0d0d] relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#2383e2] opacity-10 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-[900px] mx-auto relative z-10">
          {/* Label */}
          <div className="flex justify-center mb-5">
            <span className="inline-flex items-center gap-2 bg-white/10 border border-white/10 text-white/80 text-xs font-semibold px-4 py-1.5 rounded-full tracking-wide uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse inline-block" />
              Live Demo
            </span>
          </div>

          {/* Headline */}
          <h2 className="text-3xl md:text-4xl font-extrabold text-white text-center tracking-tight leading-tight mb-3">
            Watch Clinic@Click in Action
          </h2>
          <p className="text-center text-white/50 text-sm md:text-base mb-10">
            People buy software after seeing it. See everything in under 90 seconds.
          </p>

          {/* Video embed */}
          <div className="relative rounded-2xl overflow-hidden shadow-[0_0_80px_rgba(35,131,226,0.25)] border border-white/10 group">
            {/* Aspect ratio wrapper 16:9 */}
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src="https://www.youtube.com/embed/tiizwKGoP5c?rel=0&modestbranding=1&color=white"
                title="Clinic@Click Demo"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full rounded-2xl"
              />
            </div>
          </div>

          {/* Sub-label */}
          <p className="text-center text-white/30 text-xs mt-5">
            No sign-up required to watch · 90 seconds · HD
          </p>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 py-16 bg-white">
        <div className="max-w-[500px] mx-auto text-center">
          <h3 className="text-2xl md:text-3xl font-bold text-[#1a1a1a] tracking-tight mb-3">
            Get started for free
          </h3>
          <p className="text-gray-500 mb-7 text-sm">
            Play around with it first. Pay and add your team later.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              asChild
              className="bg-[#2383e2] text-white hover:bg-[#1b6ec2] px-5 h-10 rounded-lg text-sm font-medium shadow-md"
            >
              <Link href="/login" className="flex items-center gap-2">
                Get Clinic@Click free <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-[#2383e2] text-[#2383e2] hover:bg-blue-50 px-5 h-10 rounded-lg text-sm font-medium"
            >
              <a href="https://play.google.com/store/apps/details?id=com.clinicclick.app" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.523 15.3414C17.0709 15.3414 16.7027 15.7095 16.7027 16.1616C16.7027 16.6138 17.0709 16.9819 17.523 16.9819C17.9752 16.9819 18.3433 16.6138 18.3433 16.1616C18.3433 15.7095 17.9752 15.3414 17.523 15.3414ZM6.47702 15.3414C6.02488 15.3414 5.65674 15.7095 5.65674 16.1616C5.65674 16.6138 6.02488 16.9819 6.47702 16.9819C6.92917 16.9819 7.29731 16.6138 7.29731 16.1616C7.29731 15.7095 6.92917 15.3414 6.47702 15.3414ZM17.9625 10.6074L19.6806 7.62535C19.8251 7.37521 19.7397 7.05436 19.4895 6.9099C19.2394 6.76543 18.9185 6.85084 18.7741 7.10099L17.0371 10.1166C15.6178 9.4715 13.9161 9.09631 12 9.09631C10.0839 9.09631 8.38217 9.4715 6.96288 10.1166L5.22591 7.10099C5.08145 6.85084 4.7606 6.76543 4.51046 6.9099C4.26031 7.05436 4.1749 7.37521 4.31936 7.62535L6.03749 10.6074C2.92383 12.2858 0.77124 15.421 0.505005 19.1673H23.495C23.2288 15.421 21.0762 12.2858 17.9625 10.6074Z" />
                </svg>
                Download on Android
              </a>
            </Button>
            <Button
              asChild
              variant="ghost"
              className="text-gray-500 hover:text-gray-900 px-5 h-10 rounded-lg text-sm font-medium"
            >
              <Link href="/login">Request a demo</Link>
            </Button>
          </div>
        </div>
      </section>


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

      <style jsx global>{`
        html {
          scroll-behavior: smooth;
        }
        .landing-page {
          background: #ffffff !important;
          background-image: none !important;
        }
        @keyframes landing-fade-slide {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .landing-fade-in {
          animation: landing-fade-slide 0.25s ease-out forwards;
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(-12deg); }
          40% { transform: rotate(10deg); }
          60% { transform: rotate(-6deg); }
          80% { transform: rotate(4deg); }
        }
        .group:hover .group-hover\:landing-wiggle,
        button.group:hover > .landing-wiggle,
        button:hover > div {
          animation: wiggle 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
