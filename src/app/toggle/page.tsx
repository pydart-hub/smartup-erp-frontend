"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  RotateCcw,
  Shield,
  LayoutDashboard,
  GraduationCap,
  Layers,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Terminal,
  ExternalLink,
} from "lucide-react";
import {
  useFeatureFlagsStore,
  DEFAULT_FLAGS,
  type FeatureFlags,
} from "@/lib/stores/featureFlagsStore";

// ─────────────────────────────────────────────────────────────────────────────
// Toggle Switch
// ─────────────────────────────────────────────────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
        "transition-colors duration-200 ease-in-out focus:outline-none",
        "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1117]",
        checked
          ? "bg-emerald-500 focus-visible:ring-emerald-500"
          : "bg-[#30363d] focus-visible:ring-[#30363d]",
        disabled ? "opacity-40 cursor-not-allowed" : "",
      ].join(" ")}
    >
      <span
        className={[
          "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg",
          "transform ring-0 transition duration-200 ease-in-out",
          checked ? "translate-x-5" : "translate-x-0",
        ].join(" ")}
      />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Flag Row
// ─────────────────────────────────────────────────────────────────────────────

function FlagRow({
  label,
  description,
  value,
  flagKey,
  onToggle,
  tag,
}: {
  label: string;
  description: string;
  value: boolean;
  flagKey: keyof FeatureFlags;
  onToggle: (key: keyof FeatureFlags, v: boolean) => void;
  tag?: string;
}) {
  return (
    <motion.div
      layout
      className="flex items-center justify-between gap-4 py-3.5 border-b border-[#21262d] last:border-0"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[#e6edf3] text-sm font-medium">{label}</span>
          {tag && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#1f2937] text-[#6e7681] font-mono border border-[#30363d]">
              {tag}
            </span>
          )}
          {value ? (
            <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400">
              <CheckCircle2 className="h-3 w-3" /> ON
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-medium text-[#8b949e]">
              <XCircle className="h-3 w-3" /> OFF
            </span>
          )}
        </div>
        <p className="text-xs text-[#8b949e] mt-0.5 leading-relaxed">{description}</p>
      </div>
      <ToggleSwitch
        checked={value}
        onChange={(v) => onToggle(flagKey, v)}
      />
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section Card
// ─────────────────────────────────────────────────────────────────────────────

function SectionCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ease: "easeOut", duration: 0.3 }}
      className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden"
    >
      {/* Card Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[#21262d]">
        <div className="w-9 h-9 rounded-xl bg-[#21262d] flex items-center justify-center text-[#58a6ff]">
          {icon}
        </div>
        <div>
          <p className="text-[#e6edf3] font-semibold text-sm">{title}</p>
          <p className="text-[#8b949e] text-xs">{subtitle}</p>
        </div>
      </div>
      {/* Card Body */}
      <div className="px-5 py-1">{children}</div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function TogglePage() {
  const { flags, setFlag, resetFlags } = useFeatureFlagsStore();
  const [mounted, setMounted] = useState(false);
  const [justReset, setJustReset] = useState(false);

  // Avoid hydration mismatch — store loads from localStorage on client
  useEffect(() => {
    setMounted(true);
  }, []);

  function handleReset() {
    resetFlags();
    setJustReset(true);
    setTimeout(() => setJustReset(false), 1500);
  }

  // Count how many flags differ from defaults
  const changedCount = mounted
    ? (Object.keys(DEFAULT_FLAGS) as (keyof FeatureFlags)[]).filter(
        (k) => flags[k] !== DEFAULT_FLAGS[k]
      ).length
    : 0;

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e6edf3] font-sans">
      {/* ── Top Bar ── */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-3.5 bg-[#0d1117]/95 backdrop-blur border-b border-[#21262d]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#58a6ff]/10 border border-[#58a6ff]/30 flex items-center justify-center">
            <Terminal className="h-4 w-4 text-[#58a6ff]" />
          </div>
          <div>
            <span className="text-[#e6edf3] font-bold text-sm">Developer Toggles</span>
            <span className="ml-2 text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/25 px-1.5 py-0.5 rounded-md">
              DEV ONLY
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Changed badge */}
          {mounted && changedCount > 0 && (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-xs bg-amber-500/15 text-amber-400 border border-amber-500/25 px-2.5 py-1 rounded-full"
            >
              {changedCount} flag{changedCount !== 1 ? "s" : ""} changed
            </motion.span>
          )}

          {/* Reset */}
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-[#e6edf3] border border-[#30363d] transition-colors"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${justReset ? "animate-spin" : ""}`} />
            {justReset ? "Resetting…" : "Reset all"}
          </button>

          {/* Go to app */}
          <a
            href="/dashboard/branch-manager"
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#58a6ff]/10 hover:bg-[#58a6ff]/20 text-[#58a6ff] border border-[#58a6ff]/25 transition-colors"
          >
            Open App
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        {/* Notice banner */}
        <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3">
          <span className="text-amber-400 mt-0.5 text-base">⚠️</span>
          <div>
            <p className="text-amber-300 text-sm font-medium">Developer screen</p>
            <p className="text-amber-400/70 text-xs mt-0.5">
              Only accessible at <code className="font-mono bg-amber-500/10 px-1 rounded">localhost:3000/toggle</code>.
              Changes persist in <code className="font-mono bg-amber-500/10 px-1 rounded">localStorage</code> and affect all
              open tabs immediately. Toggle off auth to bypass the login screen.
            </p>
          </div>
        </div>

        {!mounted ? (
          /* Loading skeleton */
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-36 bg-[#161b22] border border-[#30363d] rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* ── Auth ── */}
            <SectionCard
              icon={<Shield className="h-5 w-5" />}
              title="Authentication"
              subtitle="Control whether the login screen is enforced"
            >
              <FlagRow
                flagKey="auth"
                label="Login Screen"
                description="When OFF — hitting any /dashboard route skips the auth check. Login page auto-redirects to dashboard."
                value={flags.auth}
                onToggle={setFlag}
                tag="middleware"
              />
            </SectionCard>

            {/* ── Layout ── */}
            <SectionCard
              icon={<LayoutDashboard className="h-5 w-5" />}
              title="Layout"
              subtitle="Dashboard shell visibility"
            >
              <FlagRow
                flagKey="sidebar"
                label="Sidebar"
                description="Show or hide the entire sidebar navigation panel."
                value={flags.sidebar}
                onToggle={setFlag}
                tag="layout"
              />
              <FlagRow
                flagKey="topbar_search"
                label="Header Search Bar"
                description="Show or hide the global search input in the top navigation bar."
                value={flags.topbar_search}
                onToggle={setFlag}
                tag="topbar"
              />
              <FlagRow
                flagKey="topbar_notifications"
                label="Notification Bell"
                description="Show or hide the notification bell icon (with red dot) in the header."
                value={flags.topbar_notifications}
                onToggle={setFlag}
                tag="topbar"
              />
              <FlagRow
                flagKey="topbar_profile"
                label="Profile Button & Dropdown"
                description="Show or hide the user avatar, name, role chip, and sign-out dropdown in the header."
                value={flags.topbar_profile}
                onToggle={setFlag}
                tag="topbar"
              />
              <FlagRow
                flagKey="overview"
                label="Dashboard Overview"
                description="Overview/stats link visible in sidebar nav."
                value={flags.overview}
                onToggle={setFlag}
                tag="nav"
              />
            </SectionCard>

            {/* ── Students ── */}
            <SectionCard
              icon={<GraduationCap className="h-5 w-5" />}
              title="Students Module"
              subtitle="Granular control over student CRUD features"
            >
              <FlagRow
                flagKey="students"
                label="Students (nav + list)"
                description="Show/hide the Students link in sidebar and the entire students list page."
                value={flags.students}
                onToggle={setFlag}
                tag="nav + page"
              />
              <FlagRow
                flagKey="students_create"
                label="New Admission Button"
                description="Show the '+ New Student' button on the students list page."
                value={flags.students_create}
                onToggle={setFlag}
                tag="students/page"
              />
              <FlagRow
                flagKey="students_view"
                label="View Student (Eye)"
                description="Show the eye icon button linking to the student detail/view page."
                value={flags.students_view}
                onToggle={setFlag}
                tag="students/[id]"
              />
              <FlagRow
                flagKey="students_edit"
                label="Edit Student (Pencil)"
                description="Show the pencil icon button linking to the student edit page."
                value={flags.students_edit}
                onToggle={setFlag}
                tag="students/[id]/edit"
              />
            </SectionCard>

            {/* ── Navigation Items ── */}
            <SectionCard
              icon={<Layers className="h-5 w-5" />}
              title="Other Navigation Items"
              subtitle="Show/hide scaffolded sidebar links"
            >
              <FlagRow
                flagKey="classes"
                label="Classes"
                description="Classes nav item in sidebar."
                value={flags.classes}
                onToggle={setFlag}
                tag="scaffold"
              />
              <FlagRow
                flagKey="batches"
                label="Batches"
                description="Batches nav item in sidebar."
                value={flags.batches}
                onToggle={setFlag}
                tag="scaffold"
              />
              <FlagRow
                flagKey="attendance"
                label="Attendance"
                description="Attendance nav item in sidebar."
                value={flags.attendance}
                onToggle={setFlag}
                tag="scaffold"
              />
              <FlagRow
                flagKey="fees"
                label="Fees"
                description="Fees nav item in sidebar."
                value={flags.fees}
                onToggle={setFlag}
                tag="scaffold"
              />
            </SectionCard>

            {/* ── Current State Dump ── */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#21262d]">
                <span className="text-[#8b949e] text-xs font-mono">
                  Current flags (localStorage)
                </span>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500/80 animate-pulse" />
                  <span className="text-emerald-400 text-xs">live</span>
                </div>
              </div>
              <pre className="px-5 py-4 text-[11px] font-mono text-[#8b949e] leading-relaxed overflow-x-auto">
                {JSON.stringify(flags, null, 2)}
              </pre>
            </div>

            {/* ── Visibility Preview ── */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[#21262d]">
                <span className="text-[#8b949e] text-xs font-mono">UI visibility preview</span>
              </div>
              <div className="px-5 py-4 grid grid-cols-2 gap-2">
                {(Object.keys(flags) as (keyof FeatureFlags)[]).map((key) => (
                  <div
                    key={key}
                    className="flex items-center gap-2 py-1.5"
                  >
                    {flags[key] ? (
                      <Eye className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5 text-[#30363d] shrink-0" />
                    )}
                    <span
                      className={`text-xs font-mono ${
                        flags[key] ? "text-[#e6edf3]" : "text-[#30363d] line-through"
                      }`}
                    >
                      {key}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="text-center py-6 text-[#484f58] text-xs">
        Smartup ERP · Developer Tools · Not visible in production
      </footer>
    </div>
  );
}
