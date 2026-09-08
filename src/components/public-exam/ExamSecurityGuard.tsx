"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { ShieldAlert, AlertOctagon, Maximize2, AlertTriangle, EyeOff } from "lucide-react";

interface ExamSecurityGuardProps {
  studentName?: string;
  studentPhone?: string | null;
  attemptId: string;
  onAutoSubmit?: () => Promise<void> | void;
  children: React.ReactNode;
}

export default function ExamSecurityGuard({
  studentName = "Candidate",
  studentPhone,
  attemptId,
  onAutoSubmit,
  children,
}: ExamSecurityGuardProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasStartedFullscreen, setHasStartedFullscreen] = useState(false);
  const [isObscured, setIsObscured] = useState(false);
  const [strikes, setStrikes] = useState(0);
  const [isDisqualified, setIsDisqualified] = useState(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const MAX_STRIKES = 4;
  const strikesRef = useRef(0);
  strikesRef.current = strikes;

  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSubmitCalledRef = useRef(false);

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
    } catch {}
  }, []);

  const triggerStrike = useCallback(
    (reason: string) => {
      if (autoSubmitCalledRef.current) return;

      const nextStrikes = strikesRef.current + 1;
      setStrikes(nextStrikes);
      setIsObscured(true);

      if (nextStrikes >= MAX_STRIKES) {
        setIsDisqualified(true);
        autoSubmitCalledRef.current = true;
        showSecurityWarning(`Maximum security strikes exceeded (${MAX_STRIKES}/${MAX_STRIKES}). Auto-submitting exam...`);
        setTimeout(() => {
          if (onAutoSubmit) {
            void onAutoSubmit();
          }
        }, 1500);
      } else {
        showSecurityWarning(`Security Violation (Strike ${nextStrikes}/${MAX_STRIKES}): ${reason}`);
      }
    },
    [onAutoSubmit, showSecurityWarning]
  );

  const checkFullscreenState = useCallback(() => {
    const isFs = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );
    setIsFullscreen(isFs);
    return isFs;
  }, []);

  const enterFullscreen = async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        await (elem as any).webkitRequestFullscreen();
      } else if ((elem as any).msRequestFullscreen) {
        await (elem as any).msRequestFullscreen();
      }
      setIsFullscreen(true);
      setHasStartedFullscreen(true);
      setIsObscured(false);
    } catch (err) {
      console.warn("Fullscreen request error:", err);
      // Even if fullscreen is blocked by browser permissions, allow student to view
      setHasStartedFullscreen(true);
      setIsObscured(false);
    }
  };

  // 1. Fullscreen Change Listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = checkFullscreenState();
      if (!isFs && hasStartedFullscreen && !autoSubmitCalledRef.current) {
        triggerStrike("Fullscreen mode was exited.");
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
    };
  }, [checkFullscreenState, hasStartedFullscreen, triggerStrike]);

  // 2. Keystroke Suppression & Screenshot Interception
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      const code = e.code;
      const ctrlOrMeta = e.ctrlKey || e.metaKey;

      // PrintScreen key
      if (key === "PrintScreen" || code === "PrintScreen" || e.keyCode === 44) {
        e.preventDefault();
        e.stopPropagation();
        void clearSystemClipboard();
        triggerStrike("Screenshot hotkey (PrintScreen) detected.");
        return false;
      }

      // Windows Snipping Tool (Win + Shift + S) or Mac Screenshot (Cmd + Shift + 3/4/5)
      if (e.shiftKey && ctrlOrMeta && ["S", "3", "4", "5"].includes(key.toUpperCase())) {
        e.preventDefault();
        e.stopPropagation();
        void clearSystemClipboard();
        triggerStrike("Screen capture shortcut detected.");
        return false;
      }

      // Print page (Ctrl + P / Cmd + P)
      if (ctrlOrMeta && key.toLowerCase() === "p") {
        e.preventDefault();
        e.stopPropagation();
        showSecurityWarning("Printing is disabled.");
        return false;
      }

      // Save page (Ctrl + S / Cmd + S)
      if (ctrlOrMeta && key.toLowerCase() === "s") {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Copy (Ctrl + C / Cmd + C) or Select All (Ctrl + A / Cmd + A)
      if (ctrlOrMeta && (key.toLowerCase() === "c" || key.toLowerCase() === "a")) {
        e.preventDefault();
        e.stopPropagation();
        void clearSystemClipboard();
        showSecurityWarning("Copying exam content is disabled.");
        return false;
      }

      // Developer Tools shortcuts (F12, Ctrl+Shift+I/J/C, Ctrl+U)
      if (
        key === "F12" ||
        (ctrlOrMeta && e.shiftKey && ["I", "J", "C"].includes(key.toUpperCase())) ||
        (ctrlOrMeta && key.toLowerCase() === "u")
      ) {
        e.preventDefault();
        e.stopPropagation();
        showSecurityWarning("Developer tools are prohibited.");
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
  }, [clearSystemClipboard, showSecurityWarning, triggerStrike]);

  // 3. Focus, Blur & Visibility Monitoring (Tab Switch / Window Switch)
  useEffect(() => {
    const handleBlur = () => {
      if (hasStartedFullscreen && !autoSubmitCalledRef.current) {
        triggerStrike("Window focus lost or screen capture tool invoked.");
      } else {
        setIsObscured(true);
      }
      void clearSystemClipboard();
    };

    const handleFocus = () => {
      if (strikesRef.current < MAX_STRIKES && !autoSubmitCalledRef.current) {
        setIsObscured(false);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (hasStartedFullscreen && !autoSubmitCalledRef.current) {
          triggerStrike("Browser tab was switched away from the exam.");
        } else {
          setIsObscured(true);
        }
        void clearSystemClipboard();
      } else {
        if (strikesRef.current < MAX_STRIKES && !autoSubmitCalledRef.current) {
          setIsObscured(false);
        }
      }
    };

    // Mouse leave detection (user moving pointer outside the browser window)
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 || e.clientX <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        setIsObscured(true);
      }
    };

    const handleMouseEnter = () => {
      if (strikesRef.current < MAX_STRIKES && !autoSubmitCalledRef.current) {
        setIsObscured(false);
      }
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.documentElement.addEventListener("mouseleave", handleMouseLeave);
    document.documentElement.addEventListener("mouseenter", handleMouseEnter);

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.documentElement.removeEventListener("mouseleave", handleMouseLeave);
      document.documentElement.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, [clearSystemClipboard, hasStartedFullscreen, triggerStrike]);

  // 4. Mouse & Context Menu Protections
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

  return (
    <div className="relative w-full select-none -webkit-user-select-none exam-security-locked">
      {/* Global Anti-Print and Anti-Selection CSS */}
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

      {/* Floating Security Warning Notification */}
      {warningMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100001] max-w-md w-[92%] sm:w-auto animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center gap-3 px-4 py-3 bg-rose-600 text-white font-semibold text-xs sm:text-sm rounded-2xl shadow-xl shadow-rose-600/30 border border-rose-400">
            <AlertOctagon className="w-5 h-5 shrink-0 text-white animate-pulse" />
            <span className="flex-1">{warningMessage}</span>
          </div>
        </div>
      )}

      {/* Initial Fullscreen Gate Overlay (Before student starts) */}
      {!hasStartedFullscreen && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/95 backdrop-blur-3xl flex flex-col items-center justify-center p-6 text-white select-none">
          <div className="max-w-md w-full bg-slate-900 border border-slate-700/80 rounded-3xl p-8 shadow-2xl text-center flex flex-col items-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-[#9B6BFF]">
              <Maximize2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Secure Exam Environment
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                To guarantee test integrity, this exam must be taken in <strong className="text-white">Fullscreen Mode</strong>. Exiting fullscreen, switching tabs, or taking screenshots will trigger security strikes.
              </p>
            </div>

            <div className="w-full bg-slate-800/60 rounded-2xl p-3 text-[11px] text-slate-400 flex items-center justify-center gap-2 border border-slate-700/50">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>4 Security Strikes will automatically submit your exam.</span>
            </div>

            <button
              type="button"
              onClick={enterFullscreen}
              className="w-full py-3.5 px-5 rounded-xl bg-[#5C34A4] hover:bg-[#4d298c] text-white font-bold text-sm transition-all shadow-lg shadow-purple-900/40 cursor-pointer flex items-center justify-center gap-2"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Enter Fullscreen &amp; Begin</span>
            </button>
          </div>
        </div>
      )}

      {/* Disqualification / Strike 4 Terminal Screen */}
      {isDisqualified && (
        <div className="fixed inset-0 z-[100000] bg-rose-950/95 backdrop-blur-3xl flex flex-col items-center justify-center p-6 text-white select-none">
          <div className="max-w-md w-full bg-slate-900 border border-rose-600 rounded-3xl p-8 shadow-2xl text-center flex flex-col items-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <AlertOctagon className="w-9 h-9 animate-pulse" />
            </div>
            <h2 className="text-xl font-black text-rose-400 tracking-tight">
              Exam Disqualified
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              You have exceeded the maximum allowed security strikes (4/4) by exiting fullscreen or switching windows. Your responses are being automatically submitted.
            </p>
            <div className="text-xs text-slate-400 font-mono">
              Submitting test... please wait.
            </div>
          </div>
        </div>
      )}

      {/* Security Violation Strike Modal / Blur Shield */}
      {hasStartedFullscreen && isObscured && !isDisqualified && (
        <div className="fixed inset-0 z-[99998] bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-white select-none transition-all duration-150">
          <div className="max-w-md w-full bg-slate-900/90 border border-amber-500/40 rounded-3xl p-8 shadow-2xl text-center flex flex-col items-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-9 h-9 animate-bounce" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
                Strike {strikes} of {MAX_STRIKES}
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Security Alert: Focus Lost
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                You exited fullscreen or switched away from the exam window. Exam content is hidden while out of focus.
              </p>
            </div>

            <div className="w-full bg-rose-950/40 border border-rose-800/40 rounded-2xl p-3 text-[11px] text-rose-300 flex items-center justify-center gap-2">
              <EyeOff className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                {MAX_STRIKES - strikes > 0
                  ? `Warning: ${MAX_STRIKES - strikes} more violation(s) will automatically submit your exam.`
                  : "Final strike reached."}
              </span>
            </div>

            <button
              type="button"
              onClick={enterFullscreen}
              className="w-full py-3.5 px-5 rounded-xl bg-[#5C34A4] hover:bg-[#4d298c] text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-purple-900/30 cursor-pointer flex items-center justify-center gap-2"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Return to Fullscreen &amp; Continue</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Exam Content (blurred and hidden when obscured or before fullscreen) */}
      <div className={isObscured || !hasStartedFullscreen ? "filter blur-3xl opacity-0 pointer-events-none transition-all duration-200" : "transition-all duration-200"}>
        {children}
      </div>
    </div>
  );
}
