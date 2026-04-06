"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Clock,
  BookOpen,
  Users,
  MapPin,
  CheckCheck,
  X,
  AlertCircle,
  ArrowRightLeft,
} from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import type { DotLottie } from "@lottiefiles/dotlottie-react";
import Link from "next/link";
import { useClassReminders } from "@/lib/hooks/useClassReminders";
import { useTransferNotifications } from "@/lib/hooks/useTransferNotifications";
import type { ClassReminder } from "@/lib/stores/notificationStore";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function urgencyLabel(mins: number): {
  text: string;
  color: string;
  bg: string;
} {
  if (mins <= 0 && mins > -120)
    return { text: "In progress", color: "text-success", bg: "bg-success/10" };
  if (mins > 0 && mins <= 15)
    return { text: `In ${mins} min`, color: "text-error", bg: "bg-error/10" };
  if (mins > 15 && mins <= 30)
    return { text: `In ${mins} min`, color: "text-warning", bg: "bg-warning/10" };
  if (mins > 30 && mins <= 60)
    return { text: `In ${mins} min`, color: "text-primary", bg: "bg-primary/10" };
  if (mins > 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return {
      text: m > 0 ? `In ${h}h ${m}m` : `In ${h}h`,
      color: "text-text-secondary",
      bg: "bg-surface-secondary",
    };
  }
  return { text: "Ended", color: "text-text-tertiary", bg: "bg-surface-secondary" };
}

// ── Notification Dropdown ───────────────────────────────────────────────────

export function NotificationDropdown() {
  const { reminders, dismissReminder, dismissAll, unreadCount, isInstructor } =
    useClassReminders();
  const { pendingTransfers, pendingCount } = useTransferNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const totalUnread = unreadCount + pendingCount;

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Non-instructors don't have class reminders, show a static bell
  const activeReminders = reminders.filter((r) => !r.dismissed);
  const dismissedReminders = reminders.filter((r) => r.dismissed);

  // Lottie instance ref — play on hover
  const [dotLottie, setDotLottie] = useState<DotLottie | null>(null);
  const dotLottieRefCallback = useCallback((instance: DotLottie | null) => {
    setDotLottie(instance);
  }, []);

  return (
    <div className="relative" ref={ref}>
      {/* Bell button (Lottie) */}
      <button
        onClick={() => setOpen(!open)}
        onMouseEnter={() => dotLottie?.play()}
        onMouseLeave={() => dotLottie?.stop()}
        className="w-10 h-10 rounded-[10px] flex items-center justify-center text-text-secondary hover:bg-app-bg transition-colors relative"
      >
        <DotLottieReact
          src="https://lottie.host/13b2cdc8-e2eb-4f7f-985a-bdd185922c77/ijcu68KH9p.lottie"
          autoplay={false}
          loop={false}
          dotLottieRefCallback={dotLottieRefCallback}
          className="w-6 h-6"
        />
        {totalUnread > 0 && (
          <span className="absolute top-1.5 right-1.5 flex items-center justify-center min-w-[16px] h-4 px-1 bg-error rounded-full text-[10px] font-bold text-white">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1 w-80 sm:w-96 bg-surface rounded-[12px] shadow-dropdown border border-border-light overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-light">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-text-primary">
                  Notifications
                </h3>
                {totalUnread > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-primary/10 text-primary rounded-full text-[11px] font-bold">
                    {totalUnread}
                  </span>
                )}
              </div>
              {activeReminders.length > 0 && (
                <button
                  onClick={() => dismissAll()}
                  className="flex items-center gap-1 text-xs text-text-tertiary hover:text-primary transition-colors"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Dismiss all
                </button>
              )}
            </div>

            {/* Content */}
            <div className="max-h-[400px] overflow-y-auto">
              {/* ── Transfer notifications ── */}
              {pendingCount > 0 && (
                <div className="p-2 space-y-1">
                  <div className="px-2 py-1">
                    <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">
                      Pending Transfers
                    </p>
                  </div>
                  {pendingTransfers.map((t) => (
                    <Link
                      key={t.name}
                      href="/dashboard/branch-manager/transfers"
                      onClick={() => setOpen(false)}
                      className="block"
                    >
                      <motion.div
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="relative rounded-[10px] p-3 bg-warning/5 border border-warning/15 hover:bg-warning/10 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 p-1.5 rounded-[8px] bg-warning/10">
                            <ArrowRightLeft className="h-4 w-4 text-warning" />
                          </div>
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <p className="font-semibold text-sm text-text-primary truncate">
                              {t.student_name}
                            </p>
                            <p className="text-xs text-text-secondary">
                              Transfer from {t.from_branch?.replace("Smart Up ", "")}
                            </p>
                            <p className="text-[11px] text-warning font-medium">Awaiting your review</p>
                          </div>
                        </div>
                      </motion.div>
                    </Link>
                  ))}
                </div>
              )}

              {/* ── Class reminders ── */}
              {!isInstructor && pendingCount === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Bell className="h-8 w-8 text-text-tertiary mx-auto mb-2 opacity-40" />
                  <p className="text-sm text-text-tertiary">No notifications</p>
                </div>
              ) : !isInstructor && pendingCount > 0 ? (
                null /* transfers already shown above */
              ) : reminders.length === 0 && pendingCount === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Bell className="h-8 w-8 text-text-tertiary mx-auto mb-2 opacity-40" />
                  <p className="text-sm text-text-tertiary">
                    No classes scheduled for today
                  </p>
                </div>
              ) : (
                <>
                  {/* Active reminders */}
                  {activeReminders.length > 0 && (
                    <div className="p-2 space-y-1">
                      {activeReminders.map((r) => (
                        <ReminderItem
                          key={r.id}
                          reminder={r}
                          onDismiss={dismissReminder}
                        />
                      ))}
                    </div>
                  )}

                  {/* Dismissed section */}
                  {dismissedReminders.length > 0 && (
                    <>
                      {activeReminders.length > 0 && (
                        <div className="px-4 py-1.5">
                          <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">
                            Dismissed
                          </p>
                        </div>
                      )}
                      <div className="p-2 pt-0 space-y-1 opacity-60">
                        {dismissedReminders.map((r) => (
                          <ReminderItem
                            key={r.id}
                            reminder={r}
                            onDismiss={dismissReminder}
                            isDismissed
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {isInstructor && reminders.length > 0 && (
              <div className="px-4 py-2 border-t border-border-light bg-surface-secondary/50">
                <p className="text-[11px] text-text-tertiary text-center">
                  Today&apos;s class reminders · Auto-refreshes every 2 min
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Single Reminder Item ────────────────────────────────────────────────────

function ReminderItem({
  reminder: r,
  onDismiss,
  isDismissed,
}: {
  reminder: ClassReminder;
  onDismiss: (id: string) => void;
  isDismissed?: boolean;
}) {
  const urgency = urgencyLabel(r.minutesUntil);
  const isUrgent = r.minutesUntil > 0 && r.minutesUntil <= 15;
  const isInProgress = r.minutesUntil <= 0 && r.minutesUntil > -120;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      className={`
        relative rounded-[10px] p-3 transition-colors group
        ${isUrgent && !isDismissed
          ? "bg-error/5 border border-error/15"
          : isInProgress && !isDismissed
            ? "bg-success/5 border border-success/15"
            : "hover:bg-surface-secondary border border-transparent"
        }
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`mt-0.5 p-1.5 rounded-[8px] ${urgency.bg}`}>
          {isUrgent ? (
            <AlertCircle className={`h-4 w-4 ${urgency.color}`} />
          ) : (
            <Clock className={`h-4 w-4 ${urgency.color}`} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-sm text-text-primary truncate">
              {r.course}
            </span>
            <span className={`text-xs font-medium whitespace-nowrap ${urgency.color}`}>
              {urgency.text}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-text-secondary">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(r.fromTime)} – {formatTime(r.toTime)}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-text-secondary">
            <span className="flex items-center gap-1 truncate">
              <Users className="h-3 w-3" />
              {r.studentGroup}
            </span>
            {r.room && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3" />
                {r.room}
              </span>
            )}
          </div>
        </div>

        {/* Dismiss button */}
        {!isDismissed && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(r.id);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-[6px] hover:bg-surface-secondary text-text-tertiary"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
