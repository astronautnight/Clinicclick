// src/utils/doctor-color.ts
export const DOCTOR_COLORS = [
    "#7C3AED" /* violet */,
    "#2563EB" /* blue */,
    "#06B6D4" /* teal */,
    "#059669" /* green */,
    "#D97706" /* amber/orange */,
    "#DC2626" /* red */,
    "#BE185D" /* pink */,
    "#4B5563" /* gray */,
    "#0EA5A4" /* cyan */,
    "#6366F1" /* indigo */,
  ];
  
  // simple string -> number hash (deterministic fallback)
  function hashStringToInt(s: string) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return Math.abs(h);
  }
  
  /**
   * Pick a color that isn't used by existing doctors.
   * - existingDoctors: Doctor[] (may be empty)
   * - preferredName: string (optional) used for deterministic fallback hashing
   */
  export function pickDoctorColor(existingDoctors: { color?: string }[], preferredName = ""): string {
    const used = new Set(existingDoctors.map(d => d.color).filter(Boolean));
    for (const c of DOCTOR_COLORS) {
      if (!used.has(c)) return c;
    }
    // if all colors used, pick deterministic one based on name hash to keep stable output
    const idx = preferredName ? (hashStringToInt(preferredName) % DOCTOR_COLORS.length) : (Math.floor(Math.random() * DOCTOR_COLORS.length));
    return DOCTOR_COLORS[idx];
  }
  