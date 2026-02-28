"use client";

import { useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCourseSchedules } from "@/lib/api/courseSchedule";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  useNotificationStore,
  type ClassReminder,
} from "@/lib/stores/notificationStore";

/**
 * Polls today's course schedules for the current instructor and converts
 * upcoming / in-progress classes into ClassReminder notifications.
 *
 * Only activates when the logged-in user IS an instructor.
 * Refreshes every 2 minutes so the "minutes until" stays roughly up to date.
 */
export function useClassReminders() {
  const { isInstructor, instructorName, allowedCompanies } = useAuth();
  const { setReminders, reminders, dismissReminder, dismissAll, unreadCount } =
    useNotificationStore();

  const today = new Date().toISOString().split("T")[0];

  // Fetch today's schedules for this instructor (all branches they belong to)
  const { data: schedRes } = useQuery({
    queryKey: ["class-reminders", instructorName, today],
    queryFn: () =>
      getCourseSchedules({
        date: today,
        branches:
          allowedCompanies.length > 0 ? allowedCompanies : undefined,
        limit_page_length: 100,
      }),
    enabled: !!isInstructor && !!instructorName,
    // Poll every 2 minutes
    refetchInterval: 2 * 60_000,
    staleTime: 60_000,
  });

  // Convert schedules → reminders whenever data changes
  const buildReminders = useCallback(() => {
    const schedules = schedRes?.data ?? [];
    if (schedules.length === 0) {
      setReminders([]);
      return;
    }

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const items: ClassReminder[] = schedules.map((s) => {
      const [h, m] = s.from_time.split(":").map(Number);
      const startMinutes = h * 60 + m;
      const minutesUntil = startMinutes - nowMinutes;

      return {
        id: s.name, // unique per schedule
        scheduleId: s.name,
        course: s.course,
        studentGroup: s.student_group,
        room: s.room,
        fromTime: s.from_time,
        toTime: s.to_time,
        scheduleDate: s.schedule_date,
        minutesUntil,
        dismissed: false,
        createdAt: Date.now(),
      };
    });

    // Sort: soonest first, then in-progress, then past
    items.sort((a, b) => {
      // Show upcoming (positive) first, then in-progress (≤0 but within class time), then past
      const aWeight = a.minutesUntil > 0 ? 0 : a.minutesUntil > -120 ? 1 : 2;
      const bWeight = b.minutesUntil > 0 ? 0 : b.minutesUntil > -120 ? 1 : 2;
      if (aWeight !== bWeight) return aWeight - bWeight;
      return a.minutesUntil - b.minutesUntil;
    });

    setReminders(items);
  }, [schedRes, setReminders]);

  useEffect(() => {
    buildReminders();
  }, [buildReminders]);

  // Re-compute "minutes until" every 60s without re-fetching
  useEffect(() => {
    if (!isInstructor) return;
    const interval = setInterval(buildReminders, 60_000);
    return () => clearInterval(interval);
  }, [isInstructor, buildReminders]);

  return {
    reminders,
    dismissReminder,
    dismissAll,
    unreadCount: unreadCount(),
    isInstructor: !!isInstructor,
  };
}
