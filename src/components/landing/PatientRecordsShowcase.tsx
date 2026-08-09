'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList,
  Check,
  Edit3,
  Trash2,
  ChevronUp,
  Upload,
  DollarSign,
  Pill,
  Printer,
  MousePointer2,
  FileText,
  History as HistoryIcon
} from 'lucide-react';

export default function PatientRecordsShowcase() {
  const [patientStep, setPatientStep] = useState(0);

  useEffect(() => {
    let mounted = true;
    const cycle = async () => {
      while (mounted) {
        setPatientStep(0); // Dental Chart view (interactive teeth fill)
        await new Promise((r) => setTimeout(r, 3000));
        if (!mounted) break;
        setPatientStep(1); // Click History tab
        await new Promise((r) => setTimeout(r, 500));
        if (!mounted) break;
        setPatientStep(2); // History active
        await new Promise((r) => setTimeout(r, 2500));
        if (!mounted) break;
        setPatientStep(3); // Click Attachments tab
        await new Promise((r) => setTimeout(r, 500));
        if (!mounted) break;
        setPatientStep(4); // Attachments active
        await new Promise((r) => setTimeout(r, 2500));
        if (!mounted) break;
        setPatientStep(5); // Click Billing tab
        await new Promise((r) => setTimeout(r, 500));
        if (!mounted) break;
        setPatientStep(6); // Billing active
        await new Promise((r) => setTimeout(r, 2500));
        if (!mounted) break;
        setPatientStep(7); // Click Prescriptions tab
        await new Promise((r) => setTimeout(r, 500));
        if (!mounted) break;
        setPatientStep(8); // Prescriptions active
        await new Promise((r) => setTimeout(r, 2500));
        if (!mounted) break;
      }
    };
    cycle();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="w-full flex flex-col border-[0.5px] border-gray-200 rounded-3xl overflow-hidden shadow-sm bg-white mb-12">
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
        <h3 className="text-2xl sm:text-3xl font-extrabold text-[#1a1a1a] tracking-tight leading-tight max-w-[700px]">
          Complete patient records with interactive dental charting, history, attachments, billing &amp; prescriptions.
        </h3>
      </div>

      {/* Colored Container with Mock UI */}
      <div className="w-full bg-[#ef6453] overflow-hidden relative h-[450px] sm:h-[550px] md:h-[700px] lg:h-[420px] xl:h-[450px]">
        {/* Mock UI Container */}
        <div className="w-[1000px] absolute top-6 left-1/2 -translate-x-1/2 transform scale-[0.45] sm:scale-[0.6] md:scale-[0.75] lg:scale-[0.52] xl:scale-[0.55] origin-top bg-white rounded-2xl shadow-2xl border-[0.5px] border-gray-200 flex flex-col h-[900px] overflow-hidden">
          {/* Animated Cursor */}
          <motion.div
            className="absolute z-50 pointer-events-none"
            initial={{ x: 120, y: 220, opacity: 0 }}
            animate={{
              x:
                patientStep === 0 || patientStep === 8
                  ? 120
                  : patientStep === 1 || patientStep === 2
                  ? 240
                  : patientStep === 3 || patientStep === 4
                  ? 360
                  : patientStep === 5 || patientStep === 6
                  ? 480
                  : 600,
              y: 220,
              opacity: 1,
              scale: patientStep % 2 === 1 ? 0.85 : 1,
            }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            <MousePointer2 className="w-8 h-8 text-black fill-white drop-shadow-md" />
          </motion.div>

          {/* 1. PATIENT HEADER */}
          <div className="p-8 border-b border-gray-100 bg-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-gray-400 font-bold text-sm">AK</span>
                <span className="font-bold text-gray-900 text-lg">Ananya Kulkarni</span>
                <span className="text-gray-400 text-sm font-medium">1234567891</span>
              </div>
              <ChevronUp className="w-5 h-5 text-gray-400" />
            </div>

            <div className="flex items-start justify-between">
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-full border-2 border-blue-500 bg-white flex items-center justify-center text-2xl font-bold text-gray-800 shadow-sm">
                  AK
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-extrabold text-gray-900">Ananya Kulkarni</h2>
                    <span className="text-gray-400 text-sm font-medium">Primary Patient</span>
                  </div>
                  <div className="grid grid-cols-3 gap-x-8 gap-y-1 text-sm font-medium text-gray-700">
                    <div>
                      <span className="font-bold text-gray-900">DOB:</span> 01/01/2004
                    </div>
                    <div>
                      <span className="font-bold text-gray-900">Phone:</span> 1234567891
                    </div>
                    <div>
                      <span className="font-bold text-gray-900">WhatsApp:</span> N/A
                    </div>
                    <div>
                      <span className="font-bold text-gray-900">Email:</span> N/A
                    </div>
                    <div>
                      <span className="font-bold text-gray-900">Address:</span> N/A
                    </div>
                    <div>
                      <span className="font-bold text-gray-900">Gender:</span> Female
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 border border-gray-200 bg-white px-4 py-2 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 shadow-sm">
                  <Edit3 className="w-4 h-4" /> Edit Record
                </button>
                <button className="bg-red-500 text-white p-2.5 rounded-xl hover:bg-red-600 shadow-sm">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 2. TABS BAR */}
          <div className="px-8 py-4 bg-[#f4f4f5]/60 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2 bg-gray-200/50 p-1.5 rounded-2xl border border-gray-200/60">
              <button
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                  patientStep === 0 || patientStep === 1 || patientStep === 8
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <ClipboardList className="w-4 h-4" /> Dental Chart
              </button>
              <button
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                  patientStep === 2 ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <HistoryIcon className="w-4 h-4" /> History
              </button>
              <button
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                  patientStep === 4 ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Upload className="w-4 h-4" /> Attachments
              </button>
              <button
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                  patientStep === 6 ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <DollarSign className="w-4 h-4" /> Billing
              </button>
              <button
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${
                  patientStep === 8 ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Pill className="w-4 h-4" /> Prescriptions
              </button>
            </div>

            <button className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:bg-gray-50">
              <Printer className="w-4 h-4" /> Print
            </button>
          </div>

          {/* 3. DYNAMIC VIEW AREA */}
          <div className="p-8 flex-1 bg-white relative overflow-hidden">
            <AnimatePresence mode="wait">
              {/* DENTAL CHART */}
              {(patientStep === 0 || patientStep === 1 || patientStep === 8) && (
                <motion.div
                  key="tab-dental-chart"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center gap-6"
                >
                  <div className="bg-gray-100/70 p-1 rounded-xl flex items-center gap-1 border border-gray-200/60">
                    <button className="bg-white text-gray-900 font-bold px-5 py-1.5 rounded-lg text-sm shadow-sm border border-gray-200">
                      Permanent Dentition
                    </button>
                    <button className="text-gray-500 font-semibold px-5 py-1.5 rounded-lg text-sm hover:text-gray-700">
                      Pediatric (Deciduous)
                    </button>
                  </div>

                  <div className="w-full border border-gray-200/80 rounded-2xl p-8 bg-[#fafafa]/50 flex flex-col gap-6">
                    <div className="flex justify-between items-center px-4">
                      <div className="flex gap-4">
                        {[18, 17, 16, 15, 14, 13, 12, 11].map((t) => {
                          const isRed = t === 16;
                          const isYellow = t === 13;
                          return (
                            <div key={t} className="flex flex-col items-center gap-1.5">
                              <div
                                className={`w-9 h-11 rounded-xl border-2 flex items-center justify-center p-1 bg-white shadow-sm transition-all duration-300 ${
                                  isRed ? 'border-red-500 bg-red-50' : isYellow ? 'border-amber-400 bg-amber-50' : 'border-gray-300'
                                }`}
                              >
                                <svg viewBox="0 0 24 28" className="w-full h-full">
                                  <motion.path
                                    d="M12 2C8 2 5 4.5 5 9C5 13.5 7.5 17 8.5 22C9.2 25 10 26 12 26C14 26 14.8 25 15.5 22C16.5 17 19 13.5 19 9C19 4.5 16 2 12 2Z"
                                    stroke={isRed ? '#ef4444' : isYellow ? '#eab308' : '#9ca3af'}
                                    strokeWidth="2.5"
                                    fill={isRed ? '#ef444444' : isYellow ? '#eab30844' : 'transparent'}
                                  />
                                </svg>
                              </div>
                              <span className="text-xs font-bold text-gray-700">{t}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="w-[1px] h-12 bg-gray-200"></div>
                      <div className="flex gap-4">
                        {[21, 22, 23, 24, 25, 26, 27, 28].map((t) => {
                          const isPurple = t === 23;
                          const isRed = t === 27;
                          return (
                            <div key={t} className="flex flex-col items-center gap-1.5">
                              <div
                                className={`w-9 h-11 rounded-xl border-2 flex items-center justify-center p-1 bg-white shadow-sm transition-all duration-300 ${
                                  isPurple ? 'border-purple-500 bg-purple-50' : isRed ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                }`}
                              >
                                <svg viewBox="0 0 24 28" className="w-full h-full">
                                  <motion.path
                                    d="M12 2C8 2 5 4.5 5 9C5 13.5 7.5 17 8.5 22C9.2 25 10 26 12 26C14 26 14.8 25 15.5 22C16.5 17 19 13.5 19 9C19 4.5 16 2 12 2Z"
                                    stroke={isPurple ? '#a855f7' : isRed ? '#ef4444' : '#9ca3af'}
                                    strokeWidth="2.5"
                                    fill={isPurple ? '#a855f744' : isRed ? '#ef444444' : 'transparent'}
                                  />
                                </svg>
                              </div>
                              <span className="text-xs font-bold text-gray-700">{t}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="w-full h-[1px] bg-gray-200"></div>

                    <div className="flex justify-between items-center px-4">
                      <div className="flex gap-4">
                        {[48, 47, 46, 45, 44, 43, 42, 41].map((t) => {
                          const isYellow = t === 45;
                          const isRed = t === 44;
                          return (
                            <div key={t} className="flex flex-col items-center gap-1.5">
                              <div
                                className={`w-9 h-11 rounded-xl border-2 flex items-center justify-center p-1 bg-white shadow-sm transition-all duration-300 ${
                                  isYellow ? 'border-amber-400 bg-amber-50' : isRed ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                }`}
                              >
                                <svg viewBox="0 0 24 28" className="w-full h-full">
                                  <motion.path
                                    d="M12 2C8 2 5 4.5 5 9C5 13.5 7.5 17 8.5 22C9.2 25 10 26 12 26C14 26 14.8 25 15.5 22C16.5 17 19 13.5 19 9C19 4.5 16 2 12 2Z"
                                    stroke={isYellow ? '#eab308' : isRed ? '#ef4444' : '#9ca3af'}
                                    strokeWidth="2.5"
                                    fill={isYellow ? '#eab30844' : isRed ? '#ef444444' : 'transparent'}
                                  />
                                </svg>
                              </div>
                              <span className="text-xs font-bold text-gray-700">{t}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="w-[1px] h-12 bg-gray-200"></div>
                      <div className="flex gap-4">
                        {[31, 32, 33, 34, 35, 36, 37, 38].map((t) => {
                          const isBlue = t === 32;
                          const isYellow = t === 36;
                          return (
                            <div key={t} className="flex flex-col items-center gap-1.5">
                              <div
                                className={`w-9 h-11 rounded-xl border-2 flex items-center justify-center p-1 bg-white shadow-sm transition-all duration-300 ${
                                  isBlue ? 'border-blue-500 bg-blue-50' : isYellow ? 'border-amber-400 bg-amber-50' : 'border-gray-300'
                                }`}
                              >
                                <svg viewBox="0 0 24 28" className="w-full h-full">
                                  <motion.path
                                    d="M12 2C8 2 5 4.5 5 9C5 13.5 7.5 17 8.5 22C9.2 25 10 26 12 26C14 26 14.8 25 15.5 22C16.5 17 19 13.5 19 9C19 4.5 16 2 12 2Z"
                                    stroke={isBlue ? '#3b82f6' : isYellow ? '#eab308' : '#9ca3af'}
                                    strokeWidth="2.5"
                                    fill={isBlue ? '#3b82f644' : isYellow ? '#eab30844' : 'transparent'}
                                  />
                                </svg>
                              </div>
                              <span className="text-xs font-bold text-gray-700">{t}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* HISTORY */}
              {(patientStep === 2 || patientStep === 3) && (
                <motion.div
                  key="tab-history"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col gap-4"
                >
                  <h4 className="text-lg font-bold text-gray-900">Treatment History &amp; Visits</h4>
                  <div className="flex flex-col gap-3">
                    <div className="p-4 border border-gray-200 rounded-xl bg-white shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold">16</div>
                        <div>
                          <div className="font-bold text-gray-900 text-base">Root Canal Treatment</div>
                          <div className="text-sm text-gray-500 font-medium">14/07/2026 • Dr. Sharma</div>
                        </div>
                      </div>
                      <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full">Completed</span>
                    </div>

                    <div className="p-4 border border-gray-200 rounded-xl bg-white shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold">27</div>
                        <div>
                          <div className="font-bold text-gray-900 text-base">Composite Resin Restoration</div>
                          <div className="text-sm text-gray-500 font-medium">02/07/2026 • Dr. Kulkarni</div>
                        </div>
                      </div>
                      <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full">Completed</span>
                    </div>

                    <div className="p-4 border border-gray-200 rounded-xl bg-white shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">ALL</div>
                        <div>
                          <div className="font-bold text-gray-900 text-base">Full Mouth Scaling &amp; Polishing</div>
                          <div className="text-sm text-gray-500 font-medium">18/06/2026 • Dr. Sharma</div>
                        </div>
                      </div>
                      <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full">Completed</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ATTACHMENTS */}
              {(patientStep === 4 || patientStep === 5) && (
                <motion.div
                  key="tab-attachments"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col gap-4"
                >
                  <h4 className="text-lg font-bold text-gray-900">Patient Attachments &amp; Scans</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border border-gray-200 rounded-xl bg-white shadow-sm flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-gray-900 text-sm truncate">Bitewing_XRay_14_25.png</div>
                        <div className="text-xs text-gray-500">2.4 MB • Uploaded 14/07/2026</div>
                      </div>
                    </div>

                    <div className="p-4 border border-gray-200 rounded-xl bg-white shadow-sm flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-gray-900 text-sm truncate">Panorex_FullScan.jpg</div>
                        <div className="text-xs text-gray-500">5.1 MB • Uploaded 02/07/2026</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* BILLING */}
              {(patientStep === 6 || patientStep === 7) && (
                <motion.div
                  key="tab-billing"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col gap-4"
                >
                  <div className="flex justify-between items-center">
                    <h4 className="text-lg font-bold text-gray-900">Invoices &amp; Billing Summary</h4>
                    <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">Total Paid: ₹5,350</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="p-4 border border-gray-200 rounded-xl bg-white shadow-sm flex items-center justify-between">
                      <div>
                        <div className="font-bold text-gray-900 text-base">Invoice #INV-2026-089</div>
                        <div className="text-sm text-gray-500">Root Canal Treatment &amp; Crown</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900 text-base">₹4,500</div>
                        <span className="text-xs font-bold text-emerald-600">Paid ✓</span>
                      </div>
                    </div>

                    <div className="p-4 border border-gray-200 rounded-xl bg-white shadow-sm flex items-center justify-between">
                      <div>
                        <div className="font-bold text-gray-900 text-base">Invoice #INV-2026-042</div>
                        <div className="text-sm text-gray-500">Scaling &amp; Polishing</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900 text-base">₹850</div>
                        <span className="text-xs font-bold text-emerald-600">Paid ✓</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
