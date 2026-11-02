"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, X, Check, Sparkles, RotateCcw } from "lucide-react";

export interface TimePreset {
  label: string;
  value: string; // "HH:mm" in 24-hr format
}

export interface InteractiveTimePickerProps {
  value: string; // "HH:mm" (e.g. "17:00")
  onChange: (val: string) => void;
  size?: "sm" | "md";
  className?: string;
  presets?: TimePreset[];
  disabled?: boolean;
}

const DEFAULT_PRESETS: TimePreset[] = [
  { label: "05:00 PM", value: "17:00" },
  { label: "05:30 PM", value: "17:30" },
  { label: "06:00 PM", value: "18:00" },
  { label: "09:00 PM", value: "21:00" },
  { label: "09:30 PM", value: "21:30" },
];

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES_5 = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

export function InteractiveTimePicker({
  value,
  onChange,
  size = "sm",
  className = "",
  presets = DEFAULT_PRESETS,
  disabled = false,
}: InteractiveTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<"hours" | "minutes">("hours");

  const modalRef = useRef<HTMLDivElement>(null);
  const dialRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Parse incoming 24-hr value ("HH:mm") into 12-hr parts
  let currentHour12 = 5;
  let currentMinute = 0;
  let currentPeriod: "AM" | "PM" = "PM";

  if (value && value.includes(":")) {
    const [hStr, mStr] = value.split(":");
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (!isNaN(h)) {
      currentPeriod = h >= 12 ? "PM" : "AM";
      currentHour12 = h % 12 === 0 ? 12 : h % 12;
      currentMinute = isNaN(m) ? 0 : m;
    }
  }

  const [selectedHour, setSelectedHour] = useState(currentHour12);
  const [selectedMinute, setSelectedMinute] = useState(currentMinute);
  const [selectedPeriod, setSelectedPeriod] = useState<"AM" | "PM">(currentPeriod);

  // Sync state when external value changes
  useEffect(() => {
    if (value && value.includes(":")) {
      const [hStr, mStr] = value.split(":");
      const h = parseInt(hStr, 10);
      const m = parseInt(mStr, 10);
      if (!isNaN(h)) {
        setSelectedPeriod(h >= 12 ? "PM" : "AM");
        setSelectedHour(h % 12 === 0 ? 12 : h % 12);
        setSelectedMinute(isNaN(m) ? 0 : m);
      }
    }
  }, [value]);

  // Convert 12-hour selection to 24-hour "HH:mm" string and fire onChange
  const emitChange = useCallback(
    (h12: number, min: number, period: "AM" | "PM") => {
      let h24 = h12 % 12;
      if (period === "PM") h24 += 12;
      const formatted = `${h24.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
      onChange(formatted);
    },
    [onChange]
  );

  // When hour is selected: update and auto-transition to minutes!
  const handleSelectHour = (h: number) => {
    setSelectedHour(h);
    emitChange(h, selectedMinute, selectedPeriod);
    setTimeout(() => {
      setViewMode("minutes");
    }, 220);
  };

  const handleSelectMinute = (m: number) => {
    setSelectedMinute(m);
    emitChange(selectedHour, m, selectedPeriod);
  };

  const handleTogglePeriod = () => {
    const nextP = selectedPeriod === "AM" ? "PM" : "AM";
    setSelectedPeriod(nextP);
    emitChange(selectedHour, selectedMinute, nextP);
  };

  const handleSelectPreset = (presetValue: string) => {
    onChange(presetValue);
    if (presetValue && presetValue.includes(":")) {
      const [hStr, mStr] = presetValue.split(":");
      const h = parseInt(hStr, 10);
      const m = parseInt(mStr, 10);
      if (!isNaN(h)) {
        const p = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 === 0 ? 12 : h % 12;
        setSelectedPeriod(p);
        setSelectedHour(h12);
        setSelectedMinute(isNaN(m) ? 0 : m);
      }
    }
  };

  const openPicker = () => {
    if (disabled) return;
    setViewMode("hours");
    setIsOpen(true);
  };

  // Close when pressing Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const displayHour = selectedHour.toString().padStart(2, "0");
  const displayMinute = selectedMinute.toString().padStart(2, "0");
  const displayPeriod = selectedPeriod;

  // Geometry for Clock Face
  const dialDiameter = 220;
  const center = dialDiameter / 2;
  const radius = 82;

  // Clock Hand angle calculation
  const handAngleDeg =
    viewMode === "hours"
      ? (selectedHour % 12) * 30 - 90
      : (selectedMinute % 60) * 6 - 90;

  const handRad = (handAngleDeg * Math.PI) / 180;
  const handX = center + radius * Math.cos(handRad);
  const handY = center + radius * Math.sin(handRad);

  // Click on the dial face directly to calculate angle
  const handleDialClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left - center;
    const clickY = e.clientY - rect.top - center;

    let deg = (Math.atan2(clickY, clickX) * 180) / Math.PI + 90;
    if (deg < 0) deg += 360;

    if (viewMode === "hours") {
      let h = Math.round(deg / 30);
      if (h === 0) h = 12;
      handleSelectHour(h);
    } else {
      let m = Math.round(deg / 6);
      if (m === 60) m = 0;
      handleSelectMinute(m);
    }
  };

  return (
    <div className="relative inline-block">
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={openPicker}
        className={`group inline-flex items-center gap-1.5 rounded-lg border font-semibold transition-all cursor-pointer select-none ${
          size === "md"
            ? "h-9 px-2.5 py-1 text-xs sm:text-sm rounded-[10px]"
            : "h-7 px-1.5 py-0.5 text-[11px] rounded-[6px]"
        } ${
          isOpen
            ? "bg-primary/10 border-primary text-primary shadow-2xs ring-1 ring-primary/30"
            : "bg-surface border-border-input hover:border-primary/50 text-text-primary hover:bg-surface-muted"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
        title="Click to choose time from clock"
      >
        <Clock
          className={`${
            size === "md" ? "h-3.5 w-3.5" : "h-3 w-3"
          } text-primary group-hover:scale-110 transition-transform flex-shrink-0`}
        />
        <span className="font-bold tracking-tight">
          {displayHour}:{displayMinute}
        </span>
        <span
          className={`px-1 rounded font-bold transition-colors ${
            size === "md" ? "text-[10px] py-0.5" : "text-[9px] py-0"
          } ${
            selectedPeriod === "PM"
              ? "bg-primary/15 text-primary"
              : "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"
          }`}
        >
          {displayPeriod}
        </span>
      </button>

      {/* CENTERED MODAL DIALOG WITH BACKDROP BLUR */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
                aria-modal="true"
                role="dialog"
              >
                {/* Backdrop Blur Overlay */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setIsOpen(false)}
                  className="fixed inset-0 bg-black/50 backdrop-blur-sm cursor-pointer"
                />

                {/* Centered Modal Card */}
                <motion.div
                  ref={modalRef}
                  initial={{ opacity: 0, scale: 0.92, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 12 }}
                  transition={{ type: "spring", stiffness: 420, damping: 28 }}
                  className="relative z-10 w-full max-w-[310px] bg-surface border border-border-card rounded-2xl shadow-2xl p-4 flex flex-col gap-3 text-text-primary select-none max-h-[92vh] overflow-y-auto"
                >
                  {/* Modal Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-border-light">
                    <span className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-primary" /> Select Time
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="p-1 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-muted transition-colors cursor-pointer"
                      title="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Header Display: Clickable Hour & Minute + AM/PM */}
                  <div className="flex items-center justify-between px-3 py-1.5 bg-surface-muted/60 rounded-xl border border-border-light">
                    <div className="flex items-center gap-1 text-2xl font-black">
                      {/* Hour Segment */}
                      <button
                        type="button"
                        onClick={() => setViewMode("hours")}
                        className={`px-2.5 py-0.5 rounded-lg transition-all cursor-pointer ${
                          viewMode === "hours"
                            ? "bg-primary text-white shadow-xs font-black ring-2 ring-primary/30"
                            : "text-text-secondary hover:text-primary hover:bg-surface font-bold"
                        }`}
                        title="Click to pick Hour"
                      >
                        {displayHour}
                      </button>

                      <span className="text-text-tertiary font-bold leading-none">:</span>

                      {/* Minute Segment */}
                      <button
                        type="button"
                        onClick={() => setViewMode("minutes")}
                        className={`px-2.5 py-0.5 rounded-lg transition-all cursor-pointer ${
                          viewMode === "minutes"
                            ? "bg-primary text-white shadow-xs font-black ring-2 ring-primary/30"
                            : "text-text-secondary hover:text-primary hover:bg-surface font-bold"
                        }`}
                        title="Click to pick Minute"
                      >
                        {displayMinute}
                      </button>
                    </div>

                    {/* AM / PM Segmented Switch */}
                    <div className="flex items-center p-0.5 bg-surface border border-border-input rounded-lg text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedPeriod !== "AM") handleTogglePeriod();
                        }}
                        className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                          selectedPeriod === "AM"
                            ? "bg-primary text-white shadow-2xs font-bold"
                            : "text-text-tertiary hover:text-text-secondary"
                        }`}
                      >
                        AM
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedPeriod !== "PM") handleTogglePeriod();
                        }}
                        className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                          selectedPeriod === "PM"
                            ? "bg-primary text-white shadow-2xs font-bold"
                            : "text-text-tertiary hover:text-text-secondary"
                        }`}
                      >
                        PM
                      </button>
                    </div>
                  </div>

                  {/* Mode Status Pill */}
                  <div className="flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wider text-text-tertiary px-1">
                    <span className="flex items-center gap-1 text-primary">
                      <Clock className="h-3 w-3" />
                      {viewMode === "hours" ? "1. Pick Hour" : "2. Pick Minute"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setViewMode(viewMode === "hours" ? "minutes" : "hours")}
                      className="text-text-tertiary hover:text-primary flex items-center gap-1 transition-colors cursor-pointer normal-case font-semibold text-xs"
                    >
                      <RotateCcw className="h-3 w-3" />
                      {viewMode === "hours" ? "Go to minutes" : "Back to hours"}
                    </button>
                  </div>

                  {/* RADIAL CLOCK DIAL */}
                  <div
                    ref={dialRef}
                    onClick={handleDialClick}
                    style={{ width: `${dialDiameter}px`, height: `${dialDiameter}px` }}
                    className="mx-auto rounded-full bg-surface-muted/40 border-2 border-border-light relative shadow-inner cursor-pointer select-none overflow-hidden my-1"
                  >
                    {/* SVG Clock Hand & Pivot */}
                    <svg
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      viewBox={`0 0 ${dialDiameter} ${dialDiameter}`}
                    >
                      <line
                        x1={center}
                        y1={center}
                        x2={handX}
                        y2={handY}
                        stroke="currentColor"
                        className="text-primary"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      <circle
                        cx={center}
                        cy={center}
                        r="4.5"
                        className="fill-primary"
                      />
                    </svg>

                    {/* Clock Hand Thumb Circle */}
                    <div
                      style={{
                        left: `${handX}px`,
                        top: `${handY}px`,
                        transform: "translate(-50%, -50%)",
                      }}
                      className="absolute w-7 h-7 rounded-full bg-primary text-white font-black text-xs shadow-md flex items-center justify-center pointer-events-none z-20"
                    >
                      {viewMode === "hours" ? selectedHour : displayMinute}
                    </div>

                    {/* Clock Dial Numbers */}
                    <AnimatePresence mode="wait">
                      {viewMode === "hours" ? (
                        <motion.div
                          key="hours-dial"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.15 }}
                          className="absolute inset-0"
                        >
                          {HOURS.map((h) => {
                            const angleDeg = h * 30 - 90;
                            const rad = (angleDeg * Math.PI) / 180;
                            const x = center + radius * Math.cos(rad);
                            const y = center + radius * Math.sin(rad);
                            const isSelected = selectedHour === h;

                            return (
                              <button
                                key={h}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectHour(h);
                                }}
                                style={{
                                  left: `${x}px`,
                                  top: `${y}px`,
                                  transform: "translate(-50%, -50%)",
                                }}
                                className={`absolute w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all z-10 cursor-pointer ${
                                  isSelected
                                    ? "opacity-0"
                                    : "text-text-primary hover:text-primary hover:bg-brand-wash"
                                }`}
                              >
                                {h}
                              </button>
                            );
                          })}
                        </motion.div>
                      ) : (
                        <motion.div
                          key="minutes-dial"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.15 }}
                          className="absolute inset-0"
                        >
                          {MINUTES_5.map((m) => {
                            const angleDeg = m * 6 - 90;
                            const rad = (angleDeg * Math.PI) / 180;
                            const x = center + radius * Math.cos(rad);
                            const y = center + radius * Math.sin(rad);
                            const isSelected = selectedMinute === m;

                            return (
                              <button
                                key={m}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectMinute(m);
                                }}
                                style={{
                                  left: `${x}px`,
                                  top: `${y}px`,
                                  transform: "translate(-50%, -50%)",
                                }}
                                className={`absolute w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all z-10 cursor-pointer ${
                                  isSelected
                                    ? "opacity-0"
                                    : "text-text-primary hover:text-primary hover:bg-brand-wash"
                                }`}
                              >
                                {m.toString().padStart(2, "0")}
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Quick Minute Interval Chips */}
                  {viewMode === "minutes" && (
                    <div className="flex items-center justify-center gap-1.5 pt-0.5">
                      {[0, 15, 30, 45].map((min) => (
                        <button
                          key={min}
                          type="button"
                          onClick={() => handleSelectMinute(min)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            selectedMinute === min
                              ? "bg-primary text-white shadow-2xs"
                              : "bg-surface-muted/70 text-text-secondary hover:text-primary hover:bg-brand-wash border border-border-light"
                          }`}
                        >
                          :{min.toString().padStart(2, "0")}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Quick Coaching Shift Presets */}
                  {presets && presets.length > 0 && (
                    <div className="flex flex-col gap-1.5 pt-2 border-t border-border-light/60">
                      <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-primary" /> Coaching Shifts
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {presets.map((p) => {
                          const isMatch = value === p.value;
                          return (
                            <button
                              key={p.value}
                              type="button"
                              onClick={() => handleSelectPreset(p.value)}
                              className={`px-2 py-0.5 rounded-md text-[10.5px] font-semibold transition-all active:scale-95 cursor-pointer ${
                                isMatch
                                  ? "bg-primary text-white font-bold shadow-2xs"
                                  : "bg-surface hover:bg-brand-wash text-text-secondary hover:text-primary border border-border-input"
                              }`}
                            >
                              {p.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Done / Confirm Button */}
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="w-full mt-1 h-10 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold shadow-xs active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="h-4 w-4" /> Done
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
