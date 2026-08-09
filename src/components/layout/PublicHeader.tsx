'use client';

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
import { Menu } from 'lucide-react';

export function PublicHeader() {
  return (
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
        <Link href="/features" className="text-sm font-semibold text-[#1a1a1a]/70 hover:text-[#1a1a1a] transition-colors">
          Features
        </Link>
        <Link href="/#how-it-works" className="text-sm font-semibold text-[#1a1a1a]/70 hover:text-[#1a1a1a] transition-colors">
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
                  <Link href="/#how-it-works" className="text-[28px] font-semibold text-[#1a1a1a] tracking-tight hover:opacity-70 transition-opacity">
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
  );
}
