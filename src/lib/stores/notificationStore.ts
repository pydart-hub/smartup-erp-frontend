import { create } from "zustand";

// ── Notification Types ───────────────────────────────────────────────────────

export interface ClassReminder {
  id: string;
  /** Course Schedule `name` (e.g. "EDU-CSH-2025-00123") */
  scheduleId: string;
  course: string;
  studentGroup: string;
  room?: string;
  fromTime: string;
  toTime: string;
  scheduleDate: string;
  /** Minutes until class starts (negative = already started) */
  minutesUntil: number;
  /** Whether user has dismissed this reminder */
  dismissed: boolean;
  /** Timestamp when the notification was created */
  createdAt: number;
}

// ── Store ────────────────────────────────────────────────────────────────────

interface NotificationStore {
  reminders: ClassReminder[];
  setReminders: (reminders: ClassReminder[]) => void;
  dismissReminder: (id: string) => void;
  dismissAll: () => void;
  /** Count of unread (not dismissed) reminders */
  unreadCount: () => number;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  reminders: [],

  setReminders: (reminders) => {
    // Preserve dismissed state for reminders that already exist
    const existing = get().reminders;
    const dismissedIds = new Set(
      existing.filter((r) => r.dismissed).map((r) => r.id),
    );
    const merged = reminders.map((r) => ({
      ...r,
      dismissed: dismissedIds.has(r.id) ? true : r.dismissed,
    }));
    set({ reminders: merged });
  },

  dismissReminder: (id) =>
    set((state) => ({
      reminders: state.reminders.map((r) =>
        r.id === id ? { ...r, dismissed: true } : r,
      ),
    })),

  dismissAll: () =>
    set((state) => ({
      reminders: state.reminders.map((r) => ({ ...r, dismissed: true })),
    })),

  unreadCount: () => get().reminders.filter((r) => !r.dismissed).length,
}));
