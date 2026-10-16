import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ExamDisplayStore {
  /** If true, Diagnosis Exam is hidden masterly across all Vennala students */
  hideVennalaDiagnosis: boolean;
  setHideVennalaDiagnosis: (hide: boolean) => void;
  toggleHideVennalaDiagnosis: () => void;
}

export const useExamDisplayStore = create<ExamDisplayStore>()(
  persist(
    (set) => ({
      // Safe by default: start hidden so there is zero risk of accidental exposure
      hideVennalaDiagnosis: true,
      setHideVennalaDiagnosis: (hide: boolean) => set({ hideVennalaDiagnosis: hide }),
      toggleHideVennalaDiagnosis: () =>
        set((state) => ({ hideVennalaDiagnosis: !state.hideVennalaDiagnosis })),
    }),
    {
      name: "smartup-vennala-diagnosis-display",
    },
  ),
);
