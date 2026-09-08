"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { ShieldAlert, AlertOctagon, EyeOff } from "lucide-react";

interface ExamSecurityGuardProps {
  studentName?: string;
  studentPhone?: string | null;
  attemptId: string;
  children: React.ReactNode;
}

export default function ExamSecurityGuard({
  studentName = "Candidate",
  studentPhone,
  attemptId,
  children,
}: ExamSecurityGuardProps) {
  const [isObscured, setIsObscured] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showSecurityWarning = useCallback((msg: string) => {
    setWarningMessage(msg);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    warningTimerRef.current = setTimeout(() => {
      setWarningMessage(null);
    }, 3500);
  }, []);

  const clearSystemClipboard = useCallback(async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(
          "SmartUp Exam Security Notice: Screenshots, screen captures, and copying are strictly prohibited during the exam."
        );
      }
    } catch {
      // Clipboard write may fail if document is out of focus, which is fine
    }
  }, []);

  // 1. Keystroke Interception & Shortcut Suppression
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      const code = e.code;
      const ctrlOrMeta = e.ctrlKey || e.metaKey;

      // PrintScreen key (standard & fn keys)
      if (key === "PrintScreen" || code === "PrintScreen" || e.keyCode === 44) {
        e.preventDefault();
        e.stopPropagation();
        void clearSystemClipboard();
        setIsObscured(true);
        showSecurityWarning("Screenshot attempt blocked! Capturing screenshots is strictly prohibited.");
        setTimeout(() => setIsObscured(false), 2000);
        return false;
      }

      // Windows Snipping Tool (Win + Shift + S) or Mac Screenshot (Cmd + Shift + 3/4/5)
      if (e.shiftKey && ctrlOrMeta && ["S", "3", "4", "5"].includes(key.toUpperCase())) {
        e.preventDefault();
        e.stopPropagation();
        void clearSystemClipboard();
        setIsObscured(true);
        showSecurityWarning("Screen capture shortcut blocked! Capturing exam content is prohibited.");
        setTimeout(() => setIsObscured(false), 2000);
        return false;
      }

      // Print page (Ctrl + P or Cmd + P)
      if (ctrlOrMeta && key.toLowerCase() === "p") {
        e.preventDefault();
        e.stopPropagation();
        showSecurityWarning("Printing this exam paper is disabled.");
        return false;
      }

      // Save page (Ctrl + S or Cmd + S)
      if (ctrlOrMeta && key.toLowerCase() === "s") {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Copy attempt (Ctrl + C / Cmd + C) or Select All (Ctrl + A / Cmd + A)
      if (ctrlOrMeta && (key.toLowerCase() === "c" || key.toLowerCase() === "a")) {
        e.preventDefault();
        e.stopPropagation();
        void clearSystemClipboard();
        showSecurityWarning("Copying exam content is disabled.");
        return false;
      }

      // Developer Tools shortcuts (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U)
      if (
        key === "F12" ||
        (ctrlOrMeta && e.shiftKey && ["I", "J", "C"].includes(key.toUpperCase())) ||
        (ctrlOrMeta && key.toLowerCase() === "u")
      ) {
        e.preventDefault();
        e.stopPropagation();
        showSecurityWarning("Developer inspection tools are prohibited.");
        return false;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen" || e.code === "PrintScreen" || e.keyCode === 44) {
        void clearSystemClipboard();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("keyup", handleKeyUp, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("keyup", handleKeyUp, true);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, [clearSystemClipboard, showSecurityWarning]);

  // 2. Focus & Blur "Blackout Shield"
  // When a user activates Snipping Tool or switches windows, the browser loses focus.
  // We immediately obscure the exam so any capture tool records only a black screen.
  useEffect(() => {
    const handleBlur = () => {
      setIsObscured(true);
      void clearSystemClipboard();
    };

    const handleFocus = () => {
      setIsObscured(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        setIsObscured(true);
        void clearSystemClipboard();
      } else {
        setIsObscured(false);
      }
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [clearSystemClipboard]);

  // 3. Mouse & Clipboard Event Suppression
  useEffect(() => {
    const preventAction = (e: Event) => {
      e.preventDefault();
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      showSecurityWarning("Right-click context menu is disabled during the exam.");
    };

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      void clearSystemClipboard();
      showSecurityWarning("Copying text is disabled during the exam.");
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("cut", preventAction);
    document.addEventListener("dragstart", preventAction);
    document.addEventListener("selectstart", preventAction);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("cut", preventAction);
      document.removeEventListener("dragstart", preventAction);
      document.removeEventListener("selectstart", preventAction);
    };
  }, [clearSystemClipboard, showSecurityWarning]);

  // Generate watermark identifier string
  const watermarkText = `${studentName.toUpperCase()} • ${studentPhone || "CANDIDATE"} • ID:${attemptId.slice(0, 8)}`;

  return (
    <div className="relative w-full select-none -webkit-user-select-none exam-security-locked">
      {/* Dynamic CSS for Print & Selection Protection */}
      <style jsx global>{`
        .exam-security-locked {
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
          -webkit-touch-callout: none !important;
        }

        /* Completely blank out if printed */
        @media print {
          body,
          html,
          .exam-security-locked {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            overflow: hidden !important;
          }
        }
      `}</style>

      {/* Forensic Anti-Leak Watermark Layer */}
      <div
        className="pointer-events-none fixed inset-0 z-30 overflow-hidden select-none opacity-[0.055] dark:opacity-[0.08]"
        aria-hidden="true"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-y-24 gap-x-16 -rotate-12 transform scale-110 p-6">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="text-[11px] sm:text-xs font-mono font-bold tracking-widest text-slate-900 whitespace-nowrap"
            >
              {watermarkText}
            </div>
          ))}
        </div>
      </div>

      {/* Floating Security Warning Notification */}
      {warningMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100000] max-w-md w-[92%] sm:w-auto animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center gap-3 px-4 py-3 bg-rose-600 text-white font-medium text-xs sm:text-sm rounded-2xl shadow-xl shadow-rose-600/30 border border-rose-400">
            <AlertOctagon className="w-5 h-5 shrink-0 text-white animate-pulse" />
            <span className="flex-1">{warningMessage}</span>
          </div>
        </div>
      )}

      {/* Blackout Shield (Activated on blur / Snipping Tool / window switch) */}
      {isObscured && (
        <div
          onClick={() => setIsObscured(false)}
          className="fixed inset-0 z-[99999] bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-white select-none transition-all duration-150 cursor-pointer"
        >
          <div className="max-w-md w-full bg-slate-900/90 border border-slate-700/80 rounded-3xl p-8 shadow-2xl text-center flex flex-col items-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-9 h-9 animate-pulse" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Security Shield Active
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                The exam content is hidden because the window lost focus or an external screen capture tool was detected.
              </p>
            </div>

            <div className="w-full bg-slate-800/60 rounded-2xl p-3 text-[11px] text-slate-400 flex items-center justify-center gap-2 border border-slate-700/50">
              <EyeOff className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Screenshots and external window switching are monitored.</span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsObscured(false);
                window.focus();
              }}
              className="w-full py-3 px-5 rounded-xl bg-[#5C34A4] hover:bg-[#4d298c] text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-purple-900/30 cursor-pointer"
            >
              Resume Exam
            </button>
          </div>
        </div>
      )}

      {/* Main Exam Content */}
      <div className={isObscured ? "filter blur-2xl opacity-0 pointer-events-none transition-all" : ""}>
        {children}
      </div>
    </div>
  );
}
