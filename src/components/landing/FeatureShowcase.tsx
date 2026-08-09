'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  Info, 
  Plus, 
  FileText, 
  Calendar, 
  DollarSign, 
  ChevronUp, 
  Edit3, 
  Trash2, 
  Camera,
  ClipboardList,
  Search,
  Link as LinkIcon,
  Pill,
  Microscope,
  MousePointer2,
  X,
  ChevronDown,
  Users,
  Accessibility,
  CalendarCheck,
  CalendarX,
  ChevronLeft,
  ChevronRight,
  Printer,
  Upload,
  History as HistoryIcon,
  Check,
  Clock,
  Zap
} from 'lucide-react';

export default function FeatureShowcase() {
  const [patientStep, setPatientStep] = useState(0);
  const [procStep, setProcStep] = useState(0);
  const [staffStep, setStaffStep] = useState(0);
  const [acadStep, setAcadStep] = useState(0);
  const [attendStep, setAttendStep] = useState(0);

  // Independent cycle for Patient Records animation loop
  useEffect(() => {
    let mounted = true;
    const cycle = async () => {
      while (mounted) {
        setPatientStep(0); // Dental Chart view (interactive teeth fill)
        await new Promise(r => setTimeout(r, 3000)); if (!mounted) break;
        setPatientStep(1); // Click History tab
        await new Promise(r => setTimeout(r, 500)); if (!mounted) break;
        setPatientStep(2); // History active
        await new Promise(r => setTimeout(r, 2500)); if (!mounted) break;
        setPatientStep(3); // Click Attachments tab
        await new Promise(r => setTimeout(r, 500)); if (!mounted) break;
        setPatientStep(4); // Attachments active
        await new Promise(r => setTimeout(r, 2500)); if (!mounted) break;
        setPatientStep(5); // Click Billing tab
        await new Promise(r => setTimeout(r, 500)); if (!mounted) break;
        setPatientStep(6); // Billing active
        await new Promise(r => setTimeout(r, 2500)); if (!mounted) break;
        setPatientStep(7); // Click Prescriptions tab
        await new Promise(r => setTimeout(r, 500)); if (!mounted) break;
        setPatientStep(8); // Prescriptions active
        await new Promise(r => setTimeout(r, 2500)); if (!mounted) break;
      }
    };
    cycle();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    const cycle = async () => {
      while (mounted) {
        setProcStep(0); setStaffStep(0); setAcadStep(0);
        await new Promise(r => setTimeout(r, 1000)); if (!mounted) break;
        setProcStep(1); setStaffStep(1); setAcadStep(1);
        await new Promise(r => setTimeout(r, 600)); if (!mounted) break;
        setProcStep(2); setStaffStep(2); setAcadStep(2);
        await new Promise(r => setTimeout(r, 200)); if (!mounted) break;
        setProcStep(3); setStaffStep(3);
        await new Promise(r => setTimeout(r, 600)); if (!mounted) break;
        setProcStep(4); setStaffStep(4);
        await new Promise(r => setTimeout(r, 1200)); if (!mounted) break;
        setProcStep(5); setStaffStep(5);
        await new Promise(r => setTimeout(r, 600)); if (!mounted) break;
        setProcStep(6); setStaffStep(6);
        await new Promise(r => setTimeout(r, 200)); if (!mounted) break;
        setProcStep(7); setStaffStep(7);
        await new Promise(r => setTimeout(r, 2500)); if (!mounted) break;
      }
    };
    cycle();
    return () => { mounted = false; };
  }, []);

  // Independent cycle for attendance animation
  useEffect(() => {
    let mounted = true;
    const cycle = async () => {
      while (mounted) {
        setAttendStep(0); // calendar view
        await new Promise(r => setTimeout(r, 2000)); if (!mounted) break;
        setAttendStep(1); // cursor moves to Mark Attendance button
        await new Promise(r => setTimeout(r, 700)); if (!mounted) break;
        setAttendStep(2); // click — popup opens
        await new Promise(r => setTimeout(r, 2500)); if (!mounted) break;
        setAttendStep(3); // cursor moves to Save Attendance
        await new Promise(r => setTimeout(r, 700)); if (!mounted) break;
        setAttendStep(4); // saved — dot appears on calendar
        await new Promise(r => setTimeout(r, 2000)); if (!mounted) break;
      }
    };
    cycle();
    return () => { mounted = false; };
  }, []);

  return (
    <section id="features" className="px-6 py-20 bg-[#f6f5f4] relative overflow-hidden scroll-mt-14">
      
      {/* Decorative Floating Icons */}
      <div className="absolute inset-0 max-w-[1200px] mx-auto pointer-events-none hidden lg:block z-0">
          
          {/* Blue Pill (Top Left) */}
          <motion.div 
            className="absolute top-32 left-10 flex items-center gap-2"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          >
            <div className="relative">
              <div className="w-12 h-12 bg-[#4EA6F6] rounded-xl border-2 border-gray-900 flex items-center justify-center shadow-sm rotate-12">
                <Pill className="w-6 h-6 text-gray-900" strokeWidth={2.5} />
              </div>
              <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-white rounded-full border border-gray-200 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F87C41" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="4"></circle></svg>
              </div>
            </div>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-900 -mt-8">
              <path d="M12 2L13 9L20 10L13 11L12 18L11 11L4 10L11 9L12 2Z" fill="currentColor" />
            </svg>
          </motion.div>

          {/* Green Microscope (Middle Right) */}
          <motion.div 
            className="absolute top-1/2 right-4 lg:right-10 flex items-center gap-2"
            animate={{ y: [0, 15, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          >
            <div className="relative">
              <div className="w-14 h-14 bg-[#34D399] rounded-full border-2 border-gray-900 flex items-center justify-center shadow-sm -rotate-6">
                <Microscope className="w-7 h-7 text-gray-900" strokeWidth={2.5} />
              </div>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-gray-900 mt-6">
              <path d="M2 12L7 2L12 12L17 2L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.div>

          {/* Pink Calendar (Bottom Left) */}
          <motion.div 
            className="absolute bottom-32 left-16 flex items-center gap-2"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          >
            <svg width="40" height="30" viewBox="0 0 40 30" fill="none" className="text-gray-800 rotate-12 mt-4 mr-2">
              <path d="M35 25 Q 20 5 0 15" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
            <div className="relative">
              <div className="w-12 h-12 bg-[#ec4899] rounded-xl border-2 border-gray-900 flex items-center justify-center shadow-sm rotate-12">
                <Calendar className="w-6 h-6 text-gray-900" strokeWidth={2.5} />
              </div>
            </div>
          </motion.div>
      </div>

      <div className="max-w-[1024px] xl:max-w-[1100px] mx-auto flex flex-col gap-16 relative z-10">
        
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
{/* --- CARD 1: PROCEDURE MANAGEMENT (RED/PINK) --- */}
        <div className="flex flex-col border-[0.5px] border-gray-200 rounded-3xl overflow-hidden shadow-sm">
          {/* Header Text */}
          <div className="p-8 pb-6 bg-white shrink-0">
            <div className="flex justify-between items-start mb-3">
              {/* Character Icon (Image 2 style) */}
              <div className="relative w-12 h-12">
                <div className="w-12 h-12 rounded-full bg-[#fca5a5] border-[2.5px] border-[#1a1a1a] flex items-center justify-center shadow-sm">
                  <ClipboardList className="w-6 h-6 text-[#1a1a1a]" strokeWidth={2.5} />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border-[2px] border-[#1a1a1a] flex items-center justify-center shadow-sm">
                  <Check className="w-3.5 h-3.5 text-[#1a1a1a]" strokeWidth={3} />
                </div>
              </div>
              <span className="text-sm text-gray-500 font-bold tracking-wide uppercase">For Clinics</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#1a1a1a] tracking-tight leading-tight max-w-[600px]">
              Streamline procedures, materials, and pricing across your clinic.
            </h3>
          </div>
          
          {/* Colored Container with Mock UI */}
          <div className="w-full bg-[#ef6453] overflow-hidden relative h-[450px] sm:h-[550px] md:h-[700px] lg:h-[360px] xl:h-[390px]">
            
            {/* Mock UI Container */}
            <div className="w-[1000px] absolute top-6 left-1/2 -translate-x-1/2 transform scale-[0.45] sm:scale-[0.6] md:scale-[0.75] lg:scale-[0.44] xl:scale-[0.48] origin-top bg-[#fafafa] rounded-2xl shadow-2xl border-[0.5px] border-gray-200 flex flex-col h-[900px] overflow-hidden">
              
              {/* --- POPUP OVERLAY --- */}
              <AnimatePresence>
                {procStep >= 3 && procStep < 7 && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px] z-40 flex items-center justify-center"
                  >
                    <motion.div 
                      initial={{ scale: 0.95, opacity: 0, y: 10 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.95, opacity: 0, y: 10 }}
                      className="bg-white rounded-2xl shadow-2xl w-[500px] flex flex-col overflow-hidden"
                    >
                      <div className="px-6 py-5 flex items-center justify-between">
                        <h4 className="text-[19px] font-bold text-gray-900">Link "Bitewing X-Ray (2 Films)"</h4>
                        <button className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                      </div>
                      
                      <div className="px-6 pb-6 pt-2 flex flex-col gap-6">
                        {/* Select Patient */}
                        <div className="flex flex-col gap-2.5">
                          <label className="text-[15px] font-bold text-gray-800">Select Patient</label>
                          <div className="w-full border border-gray-200 rounded-xl px-4 py-3.5 flex items-center justify-between bg-white cursor-pointer hover:border-gray-300 transition-colors">
                            <span className="text-[15px] text-gray-800">Priya Deshmukh</span>
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>

                        {/* Tooth Number / Notes */}
                        <div className="flex flex-col gap-2.5">
                          <label className="text-[15px] font-bold text-gray-800">Tooth Number / Notes (Optional)</label>
                          <div className={`w-full border rounded-xl px-4 py-3.5 bg-white transition-colors duration-300 ${procStep >= 4 ? 'border-[#3b82f6] ring-2 ring-blue-500/20' : 'border-gray-200'}`}>
                            <span className="text-[15px] text-gray-800 flex items-center h-5">
                              {procStep >= 4 ? "14, 25" : ""}
                              {procStep >= 4 && procStep < 5 && <span className="inline-block w-[2px] h-[1em] bg-blue-500 ml-1 animate-pulse" />}
                            </span>
                          </div>
                        </div>

                        {/* Quantity */}
                        <div className="flex flex-col gap-2.5">
                          <label className="text-[15px] font-bold text-gray-800">Quantity</label>
                          <div className="w-full border border-gray-200 rounded-xl px-4 py-3.5 bg-white">
                            <span className="text-[15px] text-gray-800">1</span>
                          </div>
                        </div>
                      </div>

                      <div className="px-6 py-5 flex justify-end gap-3">
                        <button className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold text-[15px] hover:bg-gray-50 transition-colors">
                          Cancel
                        </button>
                        <button className={`px-6 py-2.5 rounded-xl font-bold text-[15px] text-white transition-all duration-200 ${procStep === 6 ? 'bg-blue-700 scale-95' : 'bg-[#2b64ff] hover:bg-blue-600'}`}>
                          Link Procedure
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Animated Cursor */}
              <motion.div
                className="absolute z-50 pointer-events-none"
                initial={{ x: 800, y: 600, opacity: 0 }}
                animate={{
                  x: procStep === 0 ? 800 
                   : (procStep === 1 || procStep === 2) ? 840 
                   : (procStep === 5 || procStep === 6) ? 670 
                   : 800,
                  y: procStep === 0 ? 600 
                   : (procStep === 1 || procStep === 2) ? 400 
                   : (procStep === 5 || procStep === 6) ? 630 
                   : 600,
                  opacity: (procStep >= 3 && procStep <= 4) || procStep === 7 ? 0 : 1,
                  scale: (procStep === 2 || procStep === 6) ? 0.9 : 1
                }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              >
                <MousePointer2 className="w-8 h-8 text-black fill-white drop-shadow-md" />
              </motion.div>
              
              {/* 1. TOP BAR */}
              <div className="flex items-center justify-between px-8 py-5 border-b border-gray-200 bg-white rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-red-50 text-red-500 flex items-center justify-center border border-red-100 shadow-sm">
                    <ClipboardList className="w-5 h-5" strokeWidth={2.5} />
                  </div>
                  <span className="font-extrabold text-2xl text-gray-900 tracking-tight">Procedure Management</span>
                </div>

                <button className="flex items-center gap-2 bg-[#2383e2] text-white px-5 py-3 rounded-lg font-semibold text-sm hover:bg-blue-600 shadow-sm transition-colors">
                  <Plus className="w-4 h-4" /> Add New Procedure
                </button>
              </div>

              {/* 2. MAIN CONTENT */}
              <div className="flex-1 px-8 py-6 flex flex-col gap-6">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col">
                  
                  <div className="flex items-center gap-3 mb-1">
                    <div className="text-blue-500"><ClipboardList className="w-5 h-5" strokeWidth={2.5} /></div>
                    <h2 className="text-[22px] font-bold text-gray-900 tracking-tight">Available Procedures</h2>
                  </div>
                  <p className="text-gray-500 text-[15px] mb-6 font-medium">Browse, manage, and link procedures to patients. Procedures are grouped by category.</p>

                  {/* Search Bar */}
                  <div className="flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-xl mb-6 bg-[#fcfcfc]">
                    <Search className="w-5 h-5 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Search by name or description..." 
                      className="bg-transparent border-none outline-none w-full text-[15px] text-gray-700 placeholder:text-gray-400 font-medium"
                      readOnly
                    />
                  </div>

                  {/* Accordion / Category */}
                  <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between px-6 py-5 bg-white border-b border-gray-100">
                      <span className="font-bold text-lg text-gray-900">Consultation (5)</span>
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    </div>

                    <div className="p-6 bg-[#fcfcfc]">
                        {/* Procedure Card */}
                        <div className="bg-white border border-gray-200 rounded-xl p-7 shadow-sm flex flex-col">
                          
                          <div className="flex justify-between items-start mb-1">
                            <h3 className="text-2xl font-bold text-gray-900">Bitewing X-Ray (2 Films)</h3>
                            <button className={`flex items-center gap-2 text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow-sm transition-all duration-200 ${procStep === 2 ? 'bg-[#db2777] scale-95' : 'bg-[#ec4899] hover:bg-[#db2777]'}`}>
                              <LinkIcon className="w-4 h-4" /> Link to Patient
                            </button>
                          </div>
                          <p className="text-gray-500 text-[15px] mb-6 font-medium">Interproximal caries detection radiographs.</p>

                          <div className="flex flex-col gap-4 mb-8">
                            <div className="text-[15px] text-gray-800"><span className="font-extrabold text-gray-900">Cost:</span> ₹250</div>
                            <div className="text-[15px] text-gray-800"><span className="font-extrabold text-gray-900">Est. Duration:</span> 10 mins</div>
                            <div className="mt-1">
                              <div className="font-extrabold text-gray-900 text-[15px] mb-3">Required Materials:</div>
                              <div className="flex gap-2">
                                <span className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full text-sm font-semibold tracking-tight shadow-sm">X-Ray Film/Sensor</span>
                                <span className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full text-sm font-semibold tracking-tight shadow-sm">Bitewing Tabs/Holders</span>
                                <span className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full text-sm font-semibold tracking-tight shadow-sm">Lead Apron</span>
                                <span className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full text-sm font-semibold tracking-tight shadow-sm">X-Ray Machine</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                            <button className="flex items-center gap-2 px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 text-sm shadow-sm">
                              <Edit3 className="w-4 h-4" /> Edit
                            </button>
                            <button className="flex items-center gap-2 px-6 py-2.5 rounded-lg border border-[#ef4444] bg-[#ef4444] text-white font-semibold hover:bg-red-600 text-sm shadow-sm transition-colors">
                              <Trash2 className="w-4 h-4" /> Delete
                            </button>
                          </div>

                        </div>
                    </div>
                  </div>
                  
                </div>
              </div>

            </div>
          </div>
        </div>


        {/* --- CARD 3: STAFF & ATTENDANCE (GREEN) --- */}
        <div className="flex flex-col border-[0.5px] border-gray-200 rounded-3xl overflow-hidden shadow-sm">
          {/* Header Text */}
          <div className="p-8 pb-6 bg-white shrink-0">
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm text-gray-500 font-medium tracking-wide uppercase">For Clinics</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#1a1a1a] tracking-tight leading-tight max-w-[600px]">
              Manage staff attendance, payroll, and view comprehensive reports.
            </h3>
          </div>
          
          {/* Colored Container with Mock UI */}
          <div className="w-full bg-[#10b981] overflow-hidden relative h-[450px] sm:h-[550px] md:h-[700px] lg:h-[360px] xl:h-[390px]">
            
            {/* Mock UI Container */}
            <div className="w-[1000px] absolute top-6 left-1/2 -translate-x-1/2 transform scale-[0.45] sm:scale-[0.6] md:scale-[0.75] lg:scale-[0.44] xl:scale-[0.48] origin-top bg-[#fafafa] rounded-2xl shadow-2xl border-[0.5px] border-gray-200 flex flex-col h-[900px] overflow-hidden">
              
              {/* --- POPUP OVERLAY --- */}
              <AnimatePresence>
                {staffStep >= 5 && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px] z-40 flex items-center justify-center"
                  >
                    <motion.div 
                      initial={{ scale: 0.95, opacity: 0, y: 10 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.95, opacity: 0, y: 10 }}
                      className="bg-white rounded-3xl shadow-2xl w-[450px] flex flex-col overflow-hidden"
                    >
                      <div className="px-6 py-5 flex flex-col">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-xl font-bold text-gray-900">Attendance for Pari Verma</h4>
                            <p className="text-gray-500 text-sm font-medium mt-1">Click a day to mark attendance.</p>
                          </div>
                          <button className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>
                      </div>
                      
                      <div className="px-6 pb-6 pt-0 flex flex-col gap-6 items-center">
                        {/* Calendar Header */}
                        <div className="flex items-center justify-between w-full px-4 mb-2">
                          <button className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"><ChevronLeft className="w-5 h-5" /></button>
                          <span className="font-bold text-[17px] text-gray-900">July 2026</span>
                          <button className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"><ChevronRight className="w-5 h-5" /></button>
                        </div>
                        
                        {/* Calendar Grid */}
                        <div className="w-full">
                          <div className="grid grid-cols-7 text-center mb-4 text-sm font-semibold text-gray-400">
                            <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
                          </div>
                          <div className="grid grid-cols-7 gap-y-3 gap-x-2 text-center text-[15px] font-semibold text-gray-700">
                            {/* Week 1 */}
                            <div className="text-gray-300 font-medium">28</div>
                            <div className="text-gray-300 font-medium">29</div>
                            <div className="text-gray-300 font-medium">30</div>
                            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-green-200/60 text-green-700 mx-auto">1</div>
                            <div className="w-10 h-10 flex items-center justify-center mx-auto">2</div>
                            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-green-200/60 text-green-700 mx-auto">3</div>
                            <div className="w-10 h-10 flex items-center justify-center mx-auto">4</div>
                            {/* Week 2 */}
                            <div className="w-10 h-10 flex items-center justify-center mx-auto">5</div>
                            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-yellow-200/70 text-yellow-700 mx-auto">6</div>
                            <div className="w-10 h-10 flex items-center justify-center mx-auto">7</div>
                            <div className="w-10 h-10 flex items-center justify-center mx-auto">8</div>
                            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-green-200/60 text-green-700 mx-auto">9</div>
                            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-yellow-200/70 text-yellow-700 mx-auto">10</div>
                            <div className="w-10 h-10 flex items-center justify-center mx-auto">11</div>
                            {/* Week 3 */}
                            <div className="w-10 h-10 flex items-center justify-center mx-auto">12</div>
                            <div className="w-10 h-10 flex items-center justify-center mx-auto">13</div>
                            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-green-200/60 text-green-700 mx-auto">14</div>
                            <div className="w-10 h-10 flex items-center justify-center mx-auto">15</div>
                            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-green-200/60 text-green-700 mx-auto">16</div>
                            <div className="w-10 h-10 flex items-center justify-center mx-auto">17</div>
                            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-yellow-200/70 text-yellow-700 mx-auto">18</div>
                            {/* Week 4 */}
                            <div className="w-10 h-10 flex items-center justify-center mx-auto">19</div>
                            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-pink-500 text-white shadow-sm mx-auto">20</div>
                            <div className="text-gray-300 font-medium">21</div>
                            <div className="text-gray-300 font-medium">22</div>
                            <div className="text-gray-300 font-medium">23</div>
                            <div className="text-gray-300 font-medium">24</div>
                            <div className="text-gray-300 font-medium">25</div>
                            {/* Week 5 */}
                            <div className="text-gray-300 font-medium">26</div>
                            <div className="text-gray-300 font-medium">27</div>
                            <div className="text-gray-300 font-medium">28</div>
                            <div className="text-gray-300 font-medium">29</div>
                            <div className="text-gray-300 font-medium">30</div>
                            <div className="text-gray-300 font-medium">31</div>
                            <div className="text-gray-300 font-medium">1</div>
                          </div>
                        </div>

                        {/* Summary */}
                        <div className="w-full border border-gray-200 rounded-2xl p-5 mt-2 flex justify-between text-center shadow-sm">
                          <div className="flex-1">
                            <div className="font-extrabold text-green-600 text-lg">5</div>
                            <div className="text-[13px] font-bold text-gray-700 mt-1">Present</div>
                          </div>
                          <div className="flex-1 border-x border-gray-200">
                            <div className="font-extrabold text-yellow-500 text-lg">3</div>
                            <div className="text-[13px] font-bold text-gray-700 mt-1">Absent</div>
                          </div>
                          <div className="flex-1">
                            <div className="font-extrabold text-gray-500 text-lg">12</div>
                            <div className="text-[13px] font-bold text-gray-700 mt-1">Unmarked</div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Animated Cursor */}
              <motion.div
                className="absolute z-50 pointer-events-none"
                initial={{ x: 300, y: 700, opacity: 0 }}
                animate={{
                  x: staffStep === 0 ? 300 
                   : (staffStep === 1 || staffStep === 2) ? 160 // "Present" button on Pari Verma
                   : (staffStep === 3 || staffStep === 4) ? 140 // "View Attendance" button
                   : 300,
                  y: staffStep === 0 ? 700 
                   : (staffStep === 1 || staffStep === 2) ? 370 
                   : (staffStep === 3 || staffStep === 4) ? 440 
                   : 700,
                  opacity: staffStep >= 5 ? 0 : 1,
                  scale: (staffStep === 2 || staffStep === 4) ? 0.9 : 1
                }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              >
                <MousePointer2 className="w-8 h-8 text-black fill-white drop-shadow-md" />
              </motion.div>
              
              {/* 1. TOP BAR */}
              <div className="flex items-center justify-between px-8 py-5 border-b border-gray-200 bg-white rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-blue-50 text-[#2383e2] flex items-center justify-center border border-blue-100 shadow-sm">
                    <Accessibility className="w-6 h-6" strokeWidth={2.5} />
                  </div>
                  <span className="font-extrabold text-2xl text-gray-900 tracking-tight">Staff Management</span>
                </div>

                <div className="flex gap-3">
                  <button className="flex items-center gap-2 bg-[#fcfcfc] border border-gray-200 text-gray-700 px-5 py-3 rounded-lg font-semibold text-sm hover:bg-gray-50 shadow-sm transition-colors">
                    Filter
                  </button>
                  <button className="flex items-center gap-2 bg-[#2383e2] text-white px-5 py-3 rounded-lg font-semibold text-sm hover:bg-blue-600 shadow-sm transition-colors">
                    <Plus className="w-4 h-4" /> Add Staff Member
                  </button>
                </div>
              </div>

              {/* 2. MAIN CONTENT */}
              <div className="flex-1 px-8 py-8 flex flex-col gap-6 bg-[#fafafa]">
                
                <div className="grid grid-cols-2 gap-6">
                  {/* Pari Verma Card */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-7 flex flex-col flex-1 border-b border-gray-100">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="text-2xl font-bold text-gray-900">Pari Verma</h3>
                        {staffStep >= 2 ? (
                          <span className="bg-green-100 text-green-700 font-bold text-xs px-3 py-1.5 rounded-full">Present</span>
                        ) : (
                          <span className="bg-gray-100 text-gray-600 font-bold text-xs px-3 py-1.5 rounded-full">Not Marked</span>
                        )}
                      </div>
                      <div className="text-[#2383e2] font-semibold text-[15px] mb-6">Dental Assistant</div>
                      
                      <p className="text-gray-500 font-medium text-[15px] mb-6">No description provided.</p>

                      <div className="flex flex-col gap-1 text-[15px] text-gray-800 font-medium">
                        <div><span className="font-bold text-gray-900">Contact:</span> 88811</div>
                        <div><span className="font-bold text-gray-900">Email:</span> pari.verma@gmail.com</div>
                      </div>
                    </div>

                    <div className="p-6 bg-white flex flex-col gap-4">
                      {/* Mark Attendance Buttons */}
                      <div className="flex gap-3 w-full">
                        <button className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[15px] transition-colors duration-200 text-white ${staffStep >= 2 ? 'bg-[#10b981] ring-2 ring-green-500/20' : 'bg-[#22c55e] hover:bg-[#16a34a]'}`}>
                          <CalendarCheck className="w-5 h-5" /> Present
                        </button>
                        <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[15px] bg-[#eab308] hover:bg-[#ca8a04] text-white transition-colors duration-200">
                          <CalendarX className="w-5 h-5" /> Absent
                        </button>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-3 mt-1">
                        <button className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border font-bold text-sm shadow-sm transition-colors duration-200 ${staffStep === 4 ? 'bg-gray-100 border-gray-300 text-gray-900' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                          <Calendar className="w-4 h-4" /> View Attendance
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 font-bold text-sm shadow-sm hover:bg-gray-50 transition-colors">
                          <Edit3 className="w-4 h-4" /> Edit
                        </button>
                        <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-red-500 bg-[#ef4444] text-white font-bold text-sm shadow-sm hover:bg-red-600 transition-colors">
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Riya Sharma Card */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-7 flex flex-col flex-1 border-b border-gray-100">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="text-2xl font-bold text-gray-900">Riya Sharma</h3>
                        <span className="bg-green-100 text-green-700 font-bold text-xs px-3 py-1.5 rounded-full">Present</span>
                      </div>
                      <div className="text-[#2383e2] font-semibold text-[15px] mb-6">Receptionist</div>
                      
                      <p className="text-gray-500 font-medium text-[15px] mb-6">No description provided.</p>

                      <div className="flex flex-col gap-1 text-[15px] text-gray-800 font-medium">
                        <div><span className="font-bold text-gray-900">Contact:</span> 8879108764</div>
                        <div><span className="font-bold text-gray-900">Email:</span> riya.sharma@gmail.com</div>
                      </div>
                    </div>

                    <div className="p-6 bg-white flex flex-col gap-4">
                      {/* Mark Attendance Buttons */}
                      <div className="flex gap-3 w-full">
                        <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[15px] bg-[#10b981] ring-2 ring-green-500/20 text-white transition-colors duration-200">
                          <CalendarCheck className="w-5 h-5" /> Present
                        </button>
                        <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[15px] bg-[#eab308] hover:bg-[#ca8a04] text-white transition-colors duration-200">
                          <CalendarX className="w-5 h-5" /> Absent
                        </button>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-3 mt-1">
                        <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 font-bold text-sm shadow-sm hover:bg-gray-50 transition-colors">
                          <Calendar className="w-4 h-4" /> View Attendance
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 font-bold text-sm shadow-sm hover:bg-gray-50 transition-colors">
                          <Edit3 className="w-4 h-4" /> Edit
                        </button>
                        <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-red-500 bg-[#ef4444] text-white font-bold text-sm shadow-sm hover:bg-red-600 transition-colors">
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </div>

        </div>
        {/* 2-col grid: Blue Academics + Attendance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
{/* --- CARD 2: ACADEMICS (BLUE) --- */}
        <div className="flex flex-col border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
          {/* Header Text */}
          <div className="p-8 pb-6 bg-white shrink-0">
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm text-gray-500 font-medium tracking-wide uppercase">For Students</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#1a1a1a] tracking-tight leading-tight max-w-[600px]">
              Record case histories, manage attendance, and financials for students.
            </h3>
          </div>
          {/* Colored Container with Mock UI */}
          <div className="w-full bg-[#4ea6f6] overflow-hidden relative h-[450px] sm:h-[550px] md:h-[700px] lg:h-[360px] xl:h-[390px]">
            
            {/* Mock UI Container */}
            <div className="w-[1000px] absolute top-6 left-1/2 -translate-x-1/2 transform scale-[0.45] sm:scale-[0.6] md:scale-[0.75] lg:scale-[0.44] xl:scale-[0.48] origin-top bg-[#fafafa] rounded-2xl shadow-2xl border border-gray-200 flex flex-col h-[900px] overflow-hidden">
              
              {/* 1. TOP BAR */}
              <div className="flex items-center justify-between px-8 py-5 border-b border-gray-200 bg-white rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-purple-100 text-purple-600 flex items-center justify-center border border-purple-200 shadow-sm">
                    <BookOpen className="w-5 h-5" strokeWidth={2.5} />
                  </div>
                  <span className="font-extrabold text-2xl text-gray-900 tracking-tight">My Academics</span>
                </div>
                <div className="flex items-center gap-3 bg-purple-50 text-purple-700 px-6 py-3 rounded-xl border border-purple-100 max-w-lg shadow-sm">
                  <Info className="w-5 h-5 shrink-0" />
                  <p className="text-sm font-medium leading-snug">
                    Your personal records are always private — <br/><span className="font-normal">they are never shared with or overridden by any clinic.</span>
                  </p>
                </div>
                <button className="flex items-center gap-2 bg-[#2383e2] text-white px-5 py-3 rounded-lg font-semibold text-sm hover:bg-blue-600 shadow-sm transition-colors">
                  <Plus className="w-4 h-4" /> Add Case History
                </button>
              </div>

              {/* 2. TABS */}
              <div className="px-8 pt-6 pb-2">
                <div className="flex items-center gap-1 bg-gray-100/80 w-fit p-1 rounded-xl border border-gray-200/50">
                  <button className="flex items-center gap-2 bg-white text-gray-900 px-5 py-2 rounded-lg shadow-sm font-semibold border border-gray-200/50 text-sm">
                    <FileText className="w-4 h-4 text-gray-600" strokeWidth={2.5} /> My Case Histories
                  </button>
                  <button className="flex items-center gap-2 text-gray-500 px-5 py-2 rounded-lg font-medium hover:text-gray-700 text-sm">
                    <Calendar className="w-4 h-4" /> Manage Postings &amp; Attendance
                  </button>
                  <button className="flex items-center gap-2 text-gray-500 px-5 py-2 rounded-lg font-medium hover:text-gray-700 text-sm">
                    <DollarSign className="w-4 h-4" /> My Finances
                  </button>
                </div>
              </div>

              {/* 3. MAIN CONTENT — 3-screen animation */}
              <div className="flex-1 px-8 py-6 flex flex-col gap-4 relative overflow-hidden">

                {/* SCREEN 3 OVERLAY: Photo Lightbox */}
                <AnimatePresence>
                  {acadStep >= 2 && (
                    <motion.div
                      key="photo-overlay"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      className="absolute inset-0 bg-gray-900/50 backdrop-blur-[2px] z-30 flex items-center justify-center"
                    >
                      <motion.div
                        initial={{ scale: 0.92, opacity: 0, y: 16 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.92, opacity: 0, y: 16 }}
                        transition={{ duration: 0.35 }}
                        className="bg-white rounded-2xl shadow-2xl overflow-hidden w-[520px] flex flex-col"
                      >
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                          <span className="font-bold text-gray-900 text-[17px]">Clinical Photo</span>
                          <button className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                        </div>
                        {/* Exact dental diagram image */}
                        <div className="bg-white flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/dental-diagram.png" alt="Dental access cavity diagram" className="w-full object-contain" />
                        </div>
                        <div className="p-4">
                          <button className="w-full bg-[#ef4444] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-[15px] shadow-sm">
                            <Trash2 className="w-5 h-5" /> Delete Photo
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Always visible: list container */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 tracking-tight">My Submitted Case Histories</h2>
                  <div className="flex flex-col gap-3">

                    {/* Row 1 – Priyanka Deshmukh (expands on Screen 2+) */}
                    <div className={`border rounded-2xl overflow-hidden transition-colors duration-300 ${acadStep >= 1 ? 'border-blue-200/80' : 'border-gray-200'}`}>
                      <div className="flex items-center justify-between p-6 bg-white">
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-[17px] text-gray-900">Priyanka Deshmukh</span>
                          <span className="text-blue-600 bg-white border border-blue-200 px-3 py-1 rounded-full text-xs font-semibold">Periodontics</span>
                          <div className="flex items-center gap-1.5 text-gray-400 text-xs font-semibold">
                            <Calendar className="w-3.5 h-3.5" /> 08/07/2026
                          </div>
                          <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Submitted
                          </span>
                        </div>
                        {acadStep >= 1 ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                      </div>

                      {/* Expanded body — visible on Screen 2+ */}
                      <AnimatePresence>
                        {acadStep >= 1 && (
                          <motion.div
                            key="expanded-body"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.4 }}
                            className="overflow-hidden"
                          >
                            <div className="p-8 flex flex-col gap-8 bg-white border-t border-gray-100">
                              <div className="bg-[#f9fafa] border-l-[3px] border-blue-500 rounded-r-xl p-5">
                                <div className="text-[11px] font-bold text-blue-500 tracking-widest uppercase mb-1.5">Diagnosis</div>
                                <div className="text-[15px] font-semibold text-gray-900">Generalized plaque-induced gingivitis.</div>
                              </div>
                              <div className="grid grid-cols-2 gap-x-16 gap-y-8">
                                <div>
                                  <div className="text-[11px] font-bold text-gray-400 tracking-widest uppercase mb-2">Chief Complaint</div>
                                  <div className="text-[14px] font-medium text-gray-800 leading-relaxed">Bleeding gums while brushing and bad breath for the last 3 months.</div>
                                </div>
                                <div>
                                  <div className="text-[11px] font-bold text-gray-400 tracking-widest uppercase mb-2">Medical History</div>
                                  <div className="text-[14px] font-medium text-gray-800 leading-relaxed">Hypothyroidism controlled with medication. No known drug allergies.</div>
                                </div>
                                <div>
                                  <div className="text-[11px] font-bold text-gray-400 tracking-widest uppercase mb-2">Examination Findings</div>
                                  <div className="text-[14px] font-medium text-gray-800 leading-relaxed">Extraoral examination: Normal. Generalized gingival inflammation. Bleeding on probing present.</div>
                                </div>
                                <div>
                                  <div className="text-[11px] font-bold text-gray-400 tracking-widest uppercase mb-2">Treatment Plan</div>
                                  <div className="text-[14px] font-medium text-gray-800 leading-relaxed">Full mouth scaling and polishing. Oral hygiene instructions. Chlorhexidine mouthwash for 2 weeks.</div>
                                </div>
                              </div>
                              <div>
                                <div className="text-[11px] font-bold text-gray-400 tracking-widest uppercase mb-3">Clinical Photos</div>
                                <div className="flex gap-4">
                                  <motion.div
                                    className={`w-24 h-24 rounded-xl border flex items-center justify-center overflow-hidden cursor-pointer ${acadStep >= 2 ? 'border-blue-400 ring-2 ring-blue-200' : 'border-gray-200 bg-gray-50'}`}
                                    animate={acadStep >= 2 ? { scale: [1, 0.95, 1] } : {}}
                                    transition={{ duration: 0.2 }}
                                  >
                                    <div className="flex flex-col items-center justify-center text-pink-300 w-full h-full bg-[#f9fcfb] opacity-80">
                                      <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 4C15.5 4 14 5 12 5C10 5 8.5 4 6.5 4C4 4 3 6.5 3 9.5C3 12.5 5 15 6 19C6.5 21 8.5 21 9 19C9.5 17 10 15 12 15C14 15 14.5 17 15 19C15.5 21 17.5 21 18 19C19 15 21 12.5 21 9.5C21 6.5 20 4 17.5 4Z"/></svg>
                                    </div>
                                  </motion.div>
                                  <button className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1.5 text-gray-500">
                                    <Camera className="w-5 h-5" />
                                    <span className="text-[11px] font-bold tracking-wide">Add</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between p-6 border-t border-gray-100 bg-white">
                              <div className="flex gap-3">
                                <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 font-semibold text-sm shadow-sm">
                                  <Edit3 className="w-4 h-4" /> Edit
                                </button>
                                <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 font-semibold text-sm shadow-sm">
                                  <Trash2 className="w-4 h-4" /> Delete
                                </button>
                              </div>
                              <button className="px-5 py-2 rounded-lg border border-blue-200 text-blue-600 font-semibold bg-white text-sm shadow-sm">
                                View dental chart
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Row 2 – Rahul Patil */}
                    <div className="border border-gray-200 rounded-2xl overflow-hidden">
                      <div className="flex items-center justify-between p-6 bg-white">
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-[17px] text-gray-900">Rahul Patil</span>
                          <span className="text-blue-600 bg-white border border-blue-200 px-3 py-1 rounded-full text-xs font-semibold">Orofacial Pain</span>
                          <div className="flex items-center gap-1.5 text-gray-400 text-xs font-semibold"><Calendar className="w-3.5 h-3.5" /> 08/07/2026</div>
                          <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Submitted
                          </span>
                        </div>
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>

                    {/* Row 3 – Vikram Patil */}
                    <div className="border border-gray-200 rounded-2xl overflow-hidden">
                      <div className="flex items-center justify-between p-6 bg-white">
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-[17px] text-gray-900">Vikram Patil</span>
                          <span className="text-blue-600 bg-white border border-blue-200 px-3 py-1 rounded-full text-xs font-semibold">General Dentistry</span>
                          <div className="flex items-center gap-1.5 text-gray-400 text-xs font-semibold"><Calendar className="w-3.5 h-3.5" /> 08/07/2026</div>
                          <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            Submitted
                          </span>
                        </div>
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>

                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* --- CARD 4: STUDENT ATTENDANCE (TEAL) --- */}
        <div className="flex flex-col border-[0.5px] border-gray-200 rounded-3xl overflow-hidden shadow-sm">
          {/* Header Text */}
          <div className="p-8 pb-6 bg-white shrink-0">
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm text-gray-500 font-medium tracking-wide uppercase">For Students</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#1a1a1a] tracking-tight leading-tight max-w-[600px]">
              Track your monthly attendance, postings, and absences in one place.
            </h3>
          </div>

          {/* Colored Container with Mock UI */}
          <div className="w-full bg-[#6366f1] overflow-hidden relative h-[450px] sm:h-[550px] md:h-[700px] lg:h-[360px] xl:h-[390px]">

            {/* Mock UI Container */}
            <div className="w-[1000px] absolute top-6 left-1/2 -translate-x-1/2 transform scale-[0.45] sm:scale-[0.6] md:scale-[0.75] lg:scale-[0.44] xl:scale-[0.48] origin-top bg-[#fafafa] rounded-2xl shadow-2xl border-[0.5px] border-gray-200 flex flex-col h-[900px] overflow-hidden">

              {/* POPUP OVERLAY — Mark Attendance */}
              <AnimatePresence>
                {attendStep >= 2 && attendStep <= 3 && (
                  <motion.div
                    key="attend-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px] z-40 flex items-center justify-center"
                  >
                    <motion.div
                      initial={{ scale: 0.94, opacity: 0, y: 12 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.94, opacity: 0, y: 12 }}
                      transition={{ duration: 0.3 }}
                      className="bg-white rounded-2xl shadow-2xl w-[500px] flex flex-col overflow-hidden"
                    >
                      {/* Modal Header */}
                      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                        <h4 className="text-xl font-bold text-gray-900">Mark Attendance</h4>
                        <button className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                      </div>

                      {/* Modal Body */}
                      <div className="px-6 py-6 flex flex-col gap-5">
                        {/* Date */}
                        <div>
                          <label className="text-[13px] font-semibold text-gray-700 mb-1.5 block">Date</label>
                          <div className="flex items-center gap-2 border border-blue-400 ring-1 ring-blue-300 rounded-lg px-4 py-3 bg-white text-gray-900 font-medium text-[15px]">
                            <span>03/07/2026</span>
                            <div className="ml-auto w-5 h-5 border border-gray-400 rounded flex items-center justify-center text-gray-500 text-xs">▦</div>
                          </div>
                        </div>

                        {/* Department Posting */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[13px] font-semibold text-gray-700">Department Posting</label>
                            <button className="flex items-center gap-1 text-[13px] text-blue-600 font-semibold">
                              <Plus className="w-4 h-4" /> Add
                            </button>
                          </div>
                          <div className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3 bg-white text-gray-800 font-medium text-[15px]">
                            <span>Pediatric Dentistry</span>
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>

                        {/* Status */}
                        <div>
                          <label className="text-[13px] font-semibold text-gray-700 mb-1.5 block">Status</label>
                          <div className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3 bg-white text-gray-800 font-medium text-[15px]">
                            <span>Absent</span>
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                      </div>

                      {/* Modal Footer */}
                      <div className="flex items-center justify-end gap-3 px-6 pb-6 pt-2">
                        <button className="px-6 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-semibold text-[15px] hover:bg-gray-50">Cancel</button>
                        <motion.button
                          className={`px-6 py-2.5 rounded-lg font-bold text-[15px] text-white transition-colors ${attendStep === 3 ? 'bg-blue-700 scale-95' : 'bg-[#2383e2]'}`}
                          animate={attendStep === 3 ? { scale: 0.96 } : { scale: 1 }}
                          transition={{ duration: 0.15 }}
                        >
                          Save Attendance
                        </motion.button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Animated Cursor */}
              <motion.div
                className="absolute z-50 pointer-events-none"
                animate={{
                  x: attendStep === 0 ? 500 : attendStep === 1 ? 820 : attendStep >= 2 && attendStep <= 3 ? 380 : 500,
                  y: attendStep === 0 ? 800 : attendStep === 1 ? 155 : attendStep === 2 ? 550 : attendStep === 3 ? 590 : 800,
                  opacity: attendStep === 2 ? 0 : 1,
                  scale: attendStep === 1 || attendStep === 3 ? 0.9 : 1,
                }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              >
                <MousePointer2 className="w-8 h-8 text-black fill-white drop-shadow-md" />
              </motion.div>

              {/* === STATS BAR === */}
              <div className="px-8 py-5 border-b border-gray-200 bg-white flex flex-col gap-1 rounded-t-2xl">
                <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 tracking-widest uppercase mb-1">
                  <span>Current Posting</span>
                  <span>Posting Period</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-50 border border-blue-200 text-blue-600 px-3 py-0.5 rounded-full text-sm font-semibold">Pediatric Dentistry</span>
                    <span className="text-gray-700 font-semibold text-sm">Block 1</span>
                  </div>
                  <span className="text-gray-900 font-bold text-sm">01 Jul – 31 Jul 2026</span>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 divide-x divide-gray-200 border-b border-gray-200 bg-white">
                <div className="flex flex-col items-center py-7">
                  <span className="text-4xl font-extrabold text-green-500">{attendStep >= 4 ? 5 : 4}</span>
                  <span className="text-[13px] text-gray-500 font-medium mt-1">Days present</span>
                </div>
                <div className="flex flex-col items-center py-7">
                  <span className="text-4xl font-extrabold text-red-400">{attendStep >= 4 ? 3 : 2}</span>
                  <span className="text-[13px] text-gray-500 font-medium mt-1">Days absent</span>
                </div>
                <div className="flex flex-col items-center py-7">
                  <span className="text-4xl font-extrabold text-gray-900">{attendStep >= 4 ? '63%' : '67%'}</span>
                  <span className="text-[13px] text-gray-500 font-medium mt-1">Attendance</span>
                </div>
              </div>

              {/* Monthly View header */}
              <div className="flex items-center justify-between px-8 py-5 bg-white">
                <span className="text-xl font-bold text-gray-900">Monthly View</span>
                <button className="flex items-center gap-2 bg-[#2383e2] text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm">
                  <Plus className="w-4 h-4" /> Mark Attendance
                </button>
              </div>

              {/* Calendar */}
              <div className="flex-1 px-8 pb-8 bg-[#fafafa]">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 w-[380px] mx-auto">
                  {/* Calendar nav */}
                  <div className="flex items-center justify-between mb-4">
                    <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-bold text-[17px] text-gray-900">July 2026</span>
                    <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Day headers */}
                  <div className="grid grid-cols-7 text-center text-[12px] font-bold text-gray-400 mb-2">
                    {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d}>{d}</div>)}
                  </div>

                  {/* Date grid */}
                  <div className="grid grid-cols-7 gap-y-1 text-center text-[14px] font-medium text-gray-700">
                    {/* Week 0 — previous month */}
                    {[28,29,30].map(d => <div key={`p-${d}`} className="py-2 text-gray-300">{d}</div>)}
                    {/* Jul 1 */}
                    <div className="py-2 text-blue-500 font-bold relative">1<span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400 block"></span></div>
                    <div className="py-2">2</div>
                    {/* Jul 3 — absent (red dot) */}
                    <div className="py-2 relative">3<span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-red-400 block"></span></div>
                    <div className="py-2">4</div>
                    {/* Week 2 */}
                    <div className="py-2">5</div>
                    <div className="py-2">6</div>
                    {/* Jul 7 — absent */}
                    <div className="py-2 relative">7<span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-red-400 block"></span></div>
                    <div className="py-2">8</div>
                    {/* Jul 9 — present */}
                    <div className="py-2 relative">9<span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-green-500 block"></span></div>
                    <div className="py-2">10</div>
                    <div className="py-2">11</div>
                    {/* Week 3 */}
                    <div className="py-2">12</div>
                    {/* Jul 13 — present */}
                    <div className="py-2 relative">13<span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-green-500 block"></span></div>
                    <div className="py-2">14</div>
                    <div className="py-2">15</div>
                    <div className="py-2">16</div>
                    {/* Jul 17 — present */}
                    <div className="py-2 relative">17<span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-green-500 block"></span></div>
                    <div className="py-2">18</div>
                    {/* Week 4 */}
                    <div className="py-2">19</div>
                    {/* Jul 20 — today (pink highlight) */}
                    <div className="py-0.5">
                      <span className="w-8 h-8 flex items-center justify-center rounded-xl bg-pink-500 text-white font-bold mx-auto">20</span>
                    </div>
                    <div className="py-2">21</div>
                    <div className="py-2">22</div>
                    <div className="py-2">23</div>
                    <div className="py-2">24</div>
                    <div className="py-2">25</div>
                    {/* Week 5 */}
                    <div className="py-2">26</div>
                    <div className="py-2">27</div>
                    <div className="py-2">28</div>
                    {/* Jul 29 — present (new, step 4) */}
                    <div className="py-2 relative">29
                      {attendStep >= 4 && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-green-500 block"
                        />
                      )}
                    </div>
                    <div className="py-2">30</div>
                    <div className="py-2">31</div>
                    <div className="py-2 text-gray-300">1</div>
                  </div>

                  {/* Legend */}
                  <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span><span className="text-[12px] text-gray-600 font-medium">Present</span></div>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400 inline-block"></span><span className="text-[12px] text-gray-600 font-medium">Absent</span></div>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span><span className="text-[12px] text-gray-600 font-medium">Today</span></div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        </div>{/* end 2-col grid */}

        {/* --- CARD 5: CONSULTATIONS (RED/PINK) - FULL WIDTH AT BOTTOM --- */}
        <div className="flex flex-col border-[0.5px] border-gray-200 rounded-3xl overflow-hidden shadow-sm mt-8">
          {/* Header Text */}
          <div className="p-8 pb-6 bg-white shrink-0">
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm text-gray-500 font-medium tracking-wide uppercase">For Consultations</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#1a1a1a] tracking-tight leading-tight max-w-[600px]">
              Manage private consultations and clinic work side-by-side.
            </h3>
          </div>
          
          {/* Colored Container with Mock UI */}
          <div className="w-full bg-[#ef6453] overflow-hidden relative h-[450px] sm:h-[550px] md:h-[700px] lg:h-[480px] xl:h-[550px]">
            
            {/* Mock UI Container (Full-width style) */}
            <div className="w-[1000px] absolute top-8 sm:top-12 left-1/2 -translate-x-1/2 transform scale-[0.45] sm:scale-[0.6] md:scale-[0.75] lg:scale-[0.8] xl:scale-[0.9] origin-top bg-[#fafafa] rounded-t-2xl shadow-2xl border-[0.5px] border-gray-200 flex flex-col h-[900px] overflow-hidden">

              {/* Animated Cursor */}
              <motion.div
                className="absolute z-50 pointer-events-none"
                initial={{ x: 800, y: 600, opacity: 0 }}
                animate={{
                  x: procStep === 0 ? 800 
                   : (procStep === 1 || procStep === 2) ? 750 
                   : (procStep === 5 || procStep === 6) ? 550 
                   : 800,
                  y: procStep === 0 ? 600 
                   : (procStep === 1 || procStep === 2) ? 155 
                   : (procStep === 5 || procStep === 6) ? 155 
                   : 600,
                  opacity: procStep === 3 || procStep === 4 || procStep === 7 ? 0 : 1,
                  scale: (procStep === 2 || procStep === 6) ? 0.9 : 1
                }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              >
                <MousePointer2 className="w-8 h-8 text-black fill-white drop-shadow-md" />
              </motion.div>
              
              {/* 1. TOP BAR */}
              <div className="flex items-center justify-between px-8 py-5 border-b border-gray-200 bg-white rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-500 flex items-center justify-center border border-pink-200 shadow-sm">
                    <Users className="w-5 h-5" strokeWidth={2.5} />
                  </div>
                  <span className="font-extrabold text-2xl text-gray-900 tracking-tight">Consultation Dashboard</span>
                </div>

                {/* Pink Banner */}
                <div className="flex items-center gap-3 bg-pink-50 text-pink-700 px-6 py-3 rounded-xl border border-pink-100 max-w-lg shadow-sm">
                  <span className="text-pink-500 text-base">🔒</span>
                  <p className="text-sm font-medium leading-snug">
                    Your personal records are always private — <br/><span className="font-normal text-pink-600">they are never shared with or overridden by any clinic.</span>
                  </p>
                </div>
              </div>

              {/* 2. TABS */}
              <div className="px-8 pt-6 pb-2">
                <div className="flex items-center gap-1 bg-gray-100/80 w-fit p-1 rounded-xl border border-gray-200/50">
                  <span className="px-4 py-2 text-gray-400 font-semibold text-sm">Clinic Patients (0)</span>
                  <span className="px-4 py-2 text-gray-400 font-semibold text-sm">Clinic Appointments (0)</span>
                  <span className="px-4 py-2 text-gray-400 font-semibold text-sm mr-4 border-r border-gray-200">Clinic Financials</span>
                  
                  {/* Tab 1: My Patients */}
                  <button className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-sm transition-all shadow-sm ${procStep < 4 ? 'bg-white text-pink-600 border border-gray-200/50' : 'text-gray-500 hover:text-gray-700'}`}>
                    <span>🔒</span> My Patients (1)
                  </button>

                  {/* Tab 2: My Appointments */}
                  <button className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-sm transition-all shadow-sm ${procStep >= 4 ? 'bg-white text-pink-600 border border-gray-200/50' : 'text-gray-500 hover:text-gray-700'}`}>
                    <span>🔒</span> My Appointments (1)
                  </button>
                  
                  <span className="flex items-center gap-1.5 px-4 py-2 text-gray-400 font-semibold text-sm">
                    <span>🔒</span> My Financials (0)
                  </span>
                </div>
              </div>

              {/* 3. MAIN CONTENT */}
              <div className="flex-1 px-8 py-6 flex flex-col gap-6">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col min-h-[500px]">
                  
                  <AnimatePresence mode="wait">
                    {procStep < 4 ? (
                      <motion.div
                        key="tab-patients"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25 }}
                        className="flex flex-col w-full"
                      >
                        {/* Table Header */}
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-pink-500">🔒</span>
                              <h2 className="text-[22px] font-bold text-gray-900 tracking-tight">My Personal Patients</h2>
                            </div>
                            <p className="text-gray-500 text-[15px] font-medium">Stored privately in your account — never shared with any clinic.</p>
                          </div>
                          <button className="flex items-center gap-1.5 border border-pink-200 text-pink-600 bg-pink-50/50 px-4 py-2 rounded-xl font-bold text-sm shadow-sm">
                            <Plus className="w-4 h-4" /> Add Patient
                          </button>
                        </div>

                        {/* Patient Table */}
                        <div className="w-full">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-gray-100 text-gray-400 text-sm font-bold">
                                <th className="pb-4 font-semibold w-1/3">Name</th>
                                <th className="pb-4 font-semibold w-1/3">Contact</th>
                                <th className="pb-4 font-semibold w-1/4">Location</th>
                                <th className="pb-4 font-semibold text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="text-gray-800 text-[15px] font-semibold border-b border-gray-50">
                                <td className="py-5 text-gray-900 font-bold">Priya Sharma</td>
                                <td className="py-5 text-gray-600">123456789</td>
                                <td className="py-5 text-gray-600 flex items-center gap-1.5">
                                  <span>📍</span> Goregaon, Mumbai
                                </td>
                                <td className="py-5 text-right text-gray-400">
                                  <button className="hover:text-gray-600">🖊️</button>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="tab-appointments"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.25 }}
                        className="flex flex-col w-full"
                      >
                        {/* Table Header */}
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-pink-500">🔒</span>
                              <h2 className="text-[22px] font-bold text-gray-900 tracking-tight">My Personal Appointments</h2>
                            </div>
                            <p className="text-gray-500 text-[15px] font-medium">Stored privately in your account — never shared with any clinic.</p>
                          </div>
                          <button className="flex items-center gap-1.5 border border-pink-200 text-pink-600 bg-pink-50/50 px-4 py-2 rounded-xl font-bold text-sm shadow-sm">
                            <Plus className="w-4 h-4" /> Add Appointment
                          </button>
                        </div>

                        {/* Appointment Table */}
                        <div className="w-full">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-gray-100 text-gray-400 text-sm font-bold">
                                <th className="pb-4 font-semibold w-1/5">Date</th>
                                <th className="pb-4 font-semibold w-1/5">Time</th>
                                <th className="pb-4 font-semibold w-1/4">Patient</th>
                                <th className="pb-4 font-semibold w-1/5">Status</th>
                                <th className="pb-4 font-semibold w-1/5">Location</th>
                                <th className="pb-4 font-semibold text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="text-gray-800 text-[15px] font-semibold border-b border-gray-50">
                                <td className="py-5 text-gray-900">20/07/2026</td>
                                <td className="py-5 text-gray-600">10:00</td>
                                <td className="py-5 text-gray-900 font-bold">Priya Sharma</td>
                                <td className="py-5">
                                  <span className="px-2.5 py-1 rounded bg-gray-100 text-gray-600 text-xs font-bold border border-gray-200">Scheduled</span>
                                </td>
                                <td className="py-5 text-gray-500 flex items-center gap-1.5">
                                  <span>📍</span> N/A
                                </td>
                                <td className="py-5 text-right text-gray-400">
                                  <button className="hover:text-gray-600">🖊️</button>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
