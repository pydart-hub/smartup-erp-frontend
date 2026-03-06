import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AcademicYearStore {
  /** Currently selected academic year (e.g. "2025-2026") */
  selectedYear: string;
  /** Set the active academic year */
  setSelectedYear: (year: string) => void;
}

/**
 * Global academic-year filter.
 * Persisted to localStorage so the choice survives page reloads.
 * Default is "2025-2026" — will update once the list is fetched.
 */
export const useAcademicYearStore = create<AcademicYearStore>()(
  persist(
    (set) => ({
      selectedYear: "2025-2026",
      setSelectedYear: (year) => set({ selectedYear: year }),
    }),
    { name: "smartup-academic-year" },
  ),
);
