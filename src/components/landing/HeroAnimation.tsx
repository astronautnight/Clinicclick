'use client';

import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Building2,
  Users,
  CalendarDays,
  ClipboardList,
  Stethoscope,
  PersonStanding,
  Pill,
  Package,
  DollarSign,
  Brain,
  Microscope,
  GraduationCap,
  MessageSquare,
  Settings,
  Bell,
  Sun,
  UserCircle,
  ChevronLeft,
  ChevronRight,
  Edit,
  Printer,
  Syringe,
  BookOpen
} from 'lucide-react';
import { LogoCC } from '../icons';
import { useEffect, useState } from 'react';

// --- Helper Components for Mock UI ---

const SidebarItem = ({ icon: Icon, text, colorClass, active = false }: { icon: any, text: string, colorClass: string, active?: boolean }) => (
  <div className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-gray-100/80 text-gray-900' : 'text-gray-500'}`}>
    <div className="w-7 h-7 rounded-[8px] bg-white flex items-center justify-center shadow-[0_1px_3px_rgba(0,0,0,0.06)] border border-gray-100 shrink-0">
      <Icon className={`w-[15px] h-[15px] ${colorClass}`} strokeWidth={2.5} />
    </div>
    {text}
  </div>
);

const AppointmentBlock = ({ 
  name, doctor, time, colorClass, borderClass, textClass, delay 
}: { 
  name: string, doctor: string, time: string, colorClass: string, borderClass: string, textClass: string, delay: number 
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9, y: 10 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    transition={{ duration: 0.4, delay: delay, type: 'spring', stiffness: 100 }}
    className={`p-2 rounded-md border ${colorClass} ${borderClass} mb-2 shadow-sm text-xs`}
  >
    <div className={`font-semibold ${textClass}`}>{name}</div>
    <div className="text-gray-700 font-medium">{doctor}</div>
    <div className="text-gray-600 text-[10px] mt-1">{time}</div>
  </motion.div>
);

const Tooth = ({ num, highlightDelay = 0, strokeColor = '#94a3b8', label }: { num: number, highlightDelay?: number, strokeColor?: string, label?: string }) => {
  return (
    <div className="relative flex flex-col items-center gap-0.5">
      {/* Animated Angled Label */}
      {label && highlightDelay > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 5, x: 0, rotate: -25 }}
          animate={{ opacity: 1, scale: 1, y: -16, x: -6, rotate: -25 }}
          transition={{ delay: highlightDelay + 0.1, duration: 0.4, type: 'spring' }}
          className="absolute top-0 pointer-events-none z-10"
        >
          <div 
            className="text-[6.5px] font-bold px-1 rounded-sm shadow-[0_1px_2px_rgba(0,0,0,0.1)] bg-white border"
            style={{ color: strokeColor, borderColor: strokeColor }}
          >
            {label}
          </div>
        </motion.div>
      )}

      <motion.div 
        className="w-4 h-5 flex items-center justify-center"
        initial={{ color: '#cbd5e1' }}
        animate={{ 
          color: highlightDelay > 0 ? strokeColor : '#94a3b8',
        }}
        transition={{ delay: highlightDelay, duration: 0.5 }}
      >
        <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.5 4C15.5 4 14 5 12 5C10 5 8.5 4 6.5 4C4 4 3 6.5 3 9.5C3 12.5 5 15 6 19C6.5 21 8.5 21 9 19C9.5 17 10 15 12 15C14 15 14.5 17 15 19C15.5 21 17.5 21 18 19C19 15 21 12.5 21 9.5C21 6.5 20 4 17.5 4Z"/>
          <path d="M15 7C14 7 13 8 12 8C11 8 10 7 9 7C7.5 7 7 8 7 10C7 12 8 14 8.5 16C9 15.5 10 14 12 14C14 14 15 15.5 15.5 16C16 14 17 12 17 10C17 8 16.5 7 15 7Z" opacity="0.4"/>
        </svg>
      </motion.div>
      <span className="text-[7.5px] text-gray-700 font-medium font-sans">{num}</span>
    </div>
  );
};

// --- Main Hero Animation Component ---

export default function HeroAnimation() {
  const [key, setKey] = useState(0); // Used to restart animation

  // Restart animation every 10 seconds for a continuous loop of awesomeness
  useEffect(() => {
    const interval = setInterval(() => {
      setKey(prev => prev + 1);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="w-full bg-[#fefefe] pt-4 pb-12 mb-8 overflow-hidden">
      <div className="max-w-[1200px] mx-auto relative">
        {/* Decorative Floating Elements (Notion Style) */}
        
        {/* Yellow Book (Top Left) */}
        <motion.div 
          className="absolute top-0 left-2 lg:left-6 z-0 hidden lg:flex items-center gap-2"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Motion lines SVG */}
          <svg width="40" height="30" viewBox="0 0 40 30" fill="none" className="text-gray-800 -rotate-12 mt-4">
            <path d="M5 25 Q 20 5 40 15" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M10 28 Q 25 10 40 20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
          <div className="relative">
            <div className="w-14 h-14 bg-[#FFC843] rounded-full border-2 border-gray-900 flex items-center justify-center shadow-sm -rotate-12">
              <svg className="w-7 h-7 text-gray-900" viewBox="0 0 24 24" fill="white" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 4C15.5 4 14 5 12 5C10 5 8.5 4 6.5 4C4 4 3 6.5 3 9.5C3 12.5 5 15 6 19C6.5 21 8.5 21 9 19C9.5 17 10 15 12 15C14 15 14.5 17 15 19C15.5 21 17.5 21 18 19C19 15 21 12.5 21 9.5C21 6.5 20 4 17.5 4Z"/></svg>
            </div>
            {/* Small badge */}
            <div className="absolute -bottom-1 -right-2 w-5 h-5 bg-gray-300 rounded-full border border-white flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
          </div>
        </motion.div>

        {/* Purple Checkbox (Top Right) */}
        <motion.div 
          className="absolute top-12 right-2 lg:right-6 z-0 hidden lg:flex items-center gap-2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        >
          <div className="relative">
            <div className="w-12 h-12 bg-[#B372F7] rounded-full border-2 border-gray-900 flex items-center justify-center shadow-sm rotate-12">
              <Stethoscope className="w-6 h-6 text-gray-900" strokeWidth={2.5} />
            </div>
            {/* Small badge */}
            <div className="absolute -bottom-1 -left-2 w-5 h-5 bg-white rounded-full border border-gray-200 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.699-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"/></svg>
            </div>
          </div>
          {/* Sparkles SVG */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-900 -mt-8 -ml-2">
            <path d="M12 2L13 9L20 10L13 11L12 18L11 11L4 10L11 9L12 2Z" fill="currentColor" />
            <path d="M20 4L20.5 6.5L23 7L20.5 7.5L20 10L19.5 7.5L17 7L19.5 6.5L20 4Z" fill="currentColor" />
          </svg>
        </motion.div>

        {/* Orange Lightbulb (Middle Left) */}
        <motion.div 
          className="absolute bottom-32 left-2 lg:left-6 z-0 hidden lg:flex items-center gap-2"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        >
          <div className="relative">
            <div className="w-12 h-12 bg-[#F87C41] rounded-full border-2 border-gray-900 flex items-center justify-center shadow-sm -rotate-6">
              <Syringe className="w-6 h-6 text-gray-900" strokeWidth={2.5} />
            </div>
            {/* Small badge */}
            <div className="absolute -top-2 -left-2 w-5 h-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] text-white font-bold">
              8
            </div>
          </div>
          {/* Zigzag lines */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-gray-900 -mt-8">
            <path d="M2 12L7 2L12 12L17 2L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.div>

        {/* Blue Folder (Bottom Right) */}
        <motion.div 
          className="absolute bottom-16 right-2 lg:right-6 z-0 hidden lg:flex items-center gap-2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-900 mb-6 mr-1">
            <path d="M12 2L13 9L20 10L13 11L12 18L11 11L4 10L11 9L12 2Z" fill="currentColor" />
          </svg>
          <div className="relative">
            <div className="w-14 h-14 bg-[#4EA6F6] rounded-xl border-2 border-gray-900 flex items-center justify-center shadow-sm rotate-12">
              <Pill className="w-7 h-7 text-gray-900" strokeWidth={2.5} />
            </div>
            {/* Small badge */}
            <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-white rounded-full border border-gray-200 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F87C41" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="4"></circle></svg>
            </div>
          </div>
        </motion.div>

        <div className="max-w-[1024px] mx-auto px-4 sm:px-6 relative z-10">
          <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="rounded-2xl overflow-hidden border border-gray-200 shadow-[0_30px_80px_-15px_rgba(0,0,0,0.15)] ring-1 ring-gray-900/5 bg-white flex flex-col h-[560px]"
      >
        {/* --- MOCK TOP NAVBAR --- */}
        <div className="h-12 border-b border-gray-100 flex items-center justify-between px-5 bg-white shrink-0 z-10">
          <div className="flex items-center gap-2">
            <LogoCC className="h-5 w-5 text-[#1a1a1a]" />
            <span className="font-bold text-[14px] tracking-tight text-[#1a1a1a]">
              Clinic<span className="text-gray-400">@</span>Click
            </span>
          </div>
          <div className="flex items-center gap-4 text-gray-400">
            <Sun className="w-4 h-4" />
            <div className="relative">
              <Bell className="w-4 h-4" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></div>
            </div>
            <UserCircle className="w-5 h-5 ml-2" />
          </div>
        </div>

        {/* --- MOCK APP LAYOUT --- */}
        <div className="flex flex-1 overflow-hidden bg-[#fafafa]/50">
          
          {/* MOCK SIDEBAR */}
          <div className="w-[180px] border-r border-gray-100 bg-[#fbfbfa] hidden md:flex flex-col py-3 px-2 gap-0.5 overflow-y-auto no-scrollbar shrink-0">
            <SidebarItem icon={LayoutDashboard} text="Dashboard" colorClass="text-blue-600" />
            <SidebarItem icon={Building2} text="My Clinic" colorClass="text-indigo-500" />
            <SidebarItem icon={Users} text="Patients" colorClass="text-violet-500" active />
            <SidebarItem icon={CalendarDays} text="Appointments" colorClass="text-orange-500" />
            <SidebarItem icon={ClipboardList} text="Procedures" colorClass="text-rose-500" />
            <SidebarItem icon={Stethoscope} text="Doctors" colorClass="text-indigo-600" />
            <SidebarItem icon={PersonStanding} text="Staff" colorClass="text-cyan-500" />
            <SidebarItem icon={Pill} text="Pharmacy" colorClass="text-teal-400" />
            <SidebarItem icon={Package} text="Inventory" colorClass="text-green-500" />
            <SidebarItem icon={DollarSign} text="Financials" colorClass="text-amber-500" />
            <div className="mt-3 mb-1 text-[9px] font-bold text-gray-400 uppercase tracking-wider px-3">Advanced</div>
            <SidebarItem icon={Brain} text="AI EHR" colorClass="text-slate-500" />
            <SidebarItem icon={Microscope} text="AI Diagnosis" colorClass="text-purple-500" />
            <SidebarItem icon={GraduationCap} text="Academics" colorClass="text-pink-500" />
          </div>

          {/* MAIN CONTENT AREA - 3 COLUMNS */}
          <div className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden relative" key={key}>
            
            {/* COLUMN 1: APPOINTMENTS */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-col h-full relative"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="font-semibold text-gray-800 text-sm">09/07/2026</div>
                <div className="flex gap-1">
                  <div className="p-1 border rounded text-gray-400"><ChevronLeft className="w-3 h-3"/></div>
                  <div className="p-1 border rounded text-gray-400"><ChevronRight className="w-3 h-3"/></div>
                </div>
              </div>
              
              <div className="flex-1 overflow-hidden relative pl-8">
                {/* Time indicators */}
                <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-[10px] text-gray-400 font-medium py-2">
                  <span>8AM</span>
                  <span>9AM</span>
                  <span>10AM</span>
                  <span>11AM</span>
                  <span>12PM</span>
                  <span>1PM</span>
                </div>
                
                {/* Grid lines */}
                <div className="absolute left-8 right-0 top-0 bottom-0 flex flex-col justify-between">
                  {[0,1,2,3,4,5].map(i => (
                    <div key={i} className="border-t border-gray-100 w-full"></div>
                  ))}
                </div>

                {/* Animated Appointments */}
                <div className="relative h-full w-full pt-1">
                  <AppointmentBlock delay={1.0} name="Ananya Kulkarni" doctor="Dr. Tom Holland" time="08:00 - 10:30" colorClass="bg-violet-100" borderClass="border-violet-300" textClass="text-violet-900" />
                  <AppointmentBlock delay={1.5} name="Priya Deshmukh" doctor="Dr. Tony Stark" time="09:00 - 10:30" colorClass="bg-orange-100" borderClass="border-orange-300" textClass="text-orange-900" />
                  <AppointmentBlock delay={2.0} name="Rahul Sharma" doctor="Dr. Jane Doe" time="09:30 - 11:30" colorClass="bg-teal-100" borderClass="border-teal-300" textClass="text-teal-900" />
                  <AppointmentBlock delay={2.5} name="Priya Deshmukh" doctor="Dr. John Smith" time="11:00 - 12:30" colorClass="bg-rose-100" borderClass="border-rose-300" textClass="text-rose-900" />
                </div>
              </div>
            </motion.div>

            {/* COLUMN 2: PATIENTS (DENTAL CHART) */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-col h-full relative"
            >
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-100 shrink-0">
                <div className="w-10 h-10 rounded-full border border-blue-200 bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">AK</div>
                <div>
                  <div className="font-semibold text-gray-800 text-sm">Ananya Kulkarni</div>
                  <div className="text-[10px] text-gray-500">DOB: 01/01/2004</div>
                </div>
              </div>

              {/* Dental Chart Container */}
              <div className="flex-1 flex flex-col pt-1 overflow-y-auto no-scrollbar pb-6">
                
                {/* Teeth Grid */}
                <div className="flex flex-col justify-center gap-3 mb-8">
                  {/* Top row */}
                  <div className="flex justify-between w-full px-1 pt-4">
                    <div className="flex gap-1.5">
                      {[18, 17, 16, 15, 14, 13, 12, 11].map(num => (
                        <Tooth key={num} num={num} 
                          highlightDelay={num === 16 ? 3.0 : num === 13 ? 3.3 : 0}
                          strokeColor={num === 16 ? '#ef4444' : num === 13 ? '#eab308' : '#94a3b8'}
                          label={num === 16 ? 'Caries' : num === 13 ? 'RCT' : undefined}
                        />
                      ))}
                    </div>
                    <div className="w-px bg-gray-200 shrink-0 mx-1"></div>
                    <div className="flex gap-1.5">
                      {[21, 22, 23, 24, 25, 26, 27, 28].map(num => (
                        <Tooth key={num} num={num} 
                          highlightDelay={num === 23 ? 3.6 : num === 28 ? 3.9 : 0}
                          strokeColor={num === 23 ? '#a855f7' : num === 28 ? '#ef4444' : '#94a3b8'}
                          label={num === 23 ? 'Implant' : num === 28 ? 'Caries' : undefined}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="h-px w-full bg-gray-100 my-0.5"></div>

                  {/* Bottom row */}
                  <div className="flex justify-between w-full px-1">
                    <div className="flex gap-1.5">
                      {[48, 47, 46, 45, 44, 43, 42, 41].map(num => (
                        <Tooth key={num} num={num} 
                          highlightDelay={num === 45 ? 4.2 : 0}
                          strokeColor={num === 45 ? '#eab308' : '#94a3b8'}
                          label={num === 45 ? 'RCT' : undefined}
                        />
                      ))}
                    </div>
                    <div className="w-px bg-gray-200 shrink-0 mx-1"></div>
                    <div className="flex gap-1.5">
                      {[31, 32, 33, 34, 35, 36, 37, 38].map(num => (
                        <Tooth key={num} num={num} 
                          highlightDelay={num === 32 ? 4.5 : num === 36 ? 4.8 : 0}
                          strokeColor={num === 32 ? '#3b82f6' : num === 36 ? '#eab308' : '#94a3b8'}
                          label={num === 32 ? 'Filling' : num === 36 ? 'RCT' : undefined}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Staged Observations */}
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-gray-800 text-[11px]">Staged Observations</span>
                  <span className="text-gray-800 font-semibold flex items-center gap-1 text-[10px] cursor-pointer hover:bg-gray-50 px-2 py-1 rounded border border-transparent hover:border-gray-200 transition-colors"><Edit className="w-3 h-3"/> Edit</span>
                </div>
                <div className="text-gray-400 text-[11px] mb-4">None</div>

                <div className="h-px w-full bg-gray-100 mb-3"></div>

                {/* Legend */}
                <div>
                  <div className="font-bold text-gray-800 text-[11px] mb-2.5">Legend</div>
                  <div className="flex flex-wrap gap-x-3 gap-y-2 text-[9px] font-medium text-gray-700">
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>Caries</div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>Filling</div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>Rct</div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-gray-600"></div>Crown</div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-gray-300"></div>Missing</div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div>Implant</div>
                  </div>
                </div>

              </div>
            </motion.div>

            {/* COLUMN 3: PHARMACY (PRESCRIPTION) */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-col h-full relative"
            >
              <div className="font-semibold text-gray-800 text-sm mb-3">Generated Prescription</div>
              
              <div className="flex-1 bg-[#fcfcfc] border border-gray-100 rounded-lg p-3 flex flex-col shadow-inner overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-start mb-4 border-b border-gray-200 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-blue-100 text-blue-600 flex items-center justify-center"><Building2 className="w-4 h-4"/></div>
                    <div>
                      <div className="font-bold text-gray-800 text-xs">Molar Dental Clinic</div>
                      <div className="text-[9px] text-gray-500">Bandra West, Mumbai</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-800 text-xs">Dr. Jane Doe</div>
                    <div className="text-[8px] text-blue-600 font-bold tracking-wide uppercase">General Dentistry</div>
                  </div>
                </div>

                {/* Patient Info */}
                <div className="flex justify-between text-[10px] text-gray-600 mb-6 font-medium">
                  <div>Patient: <span className="text-gray-900">Priya Deshmukh</span></div>
                  <div>Date: <span className="text-gray-900">08/07/2026</span></div>
                </div>

                {/* Rx Symbol */}
                <div className="font-serif text-2xl font-bold text-gray-800 mb-4">Rx</div>

                {/* Animated Prescription Item */}
                <div className="space-y-3 flex-1 relative">
                  <motion.div 
                    initial={{ opacity: 0, width: "0%" }}
                    animate={{ opacity: 1, width: "100%" }}
                    transition={{ delay: 5.0, duration: 0.8, ease: "easeOut" }}
                    className="overflow-hidden whitespace-nowrap text-xs font-bold text-gray-800"
                  >
                    1. Aceclofenac + Paracetamol + Serratiopeptidase
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 5.8, duration: 0.4 }}
                    className="pl-3 text-[10px] text-gray-600 space-y-1 border-l-2 border-gray-200"
                  >
                    <div>Dosage: <span className="text-gray-800 font-semibold">1 tab</span></div>
                    <div>Frequency: <span className="text-gray-800 font-semibold">BD</span></div>
                    <div>Duration: <span className="text-gray-800 font-semibold">5 days</span></div>
                  </motion.div>
                  
                  <motion.div 
                    initial={{ opacity: 0, width: "0%" }}
                    animate={{ opacity: 1, width: "100%" }}
                    transition={{ delay: 6.5, duration: 0.8, ease: "easeOut" }}
                    className="overflow-hidden whitespace-nowrap text-xs font-bold text-gray-800 mt-4"
                  >
                    2. Amoxicillin + Clavulanic Acid
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 7.3, duration: 0.4 }}
                    className="pl-3 text-[10px] text-gray-600 space-y-1 border-l-2 border-gray-200"
                  >
                    <div>Dosage: <span className="text-gray-800 font-semibold">625mg</span></div>
                    <div>Frequency: <span className="text-gray-800 font-semibold">TDS</span></div>
                  </motion.div>
                </div>

                <div className="pt-4 border-t border-gray-200 flex justify-between items-center text-[10px]">
                  <div className="text-gray-400">Signature</div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 border border-gray-200 rounded hover:bg-gray-50 font-medium">Copy</button>
                    <button className="px-3 py-1.5 bg-gray-900 text-white rounded hover:bg-gray-800 font-medium flex items-center gap-1"><Printer className="w-3 h-3"/> Print</button>
                  </div>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </motion.div>
      </div>
      </div>
    </section>
  );
}
