"use client";

import React from "react";
import { Menu, Search, LogOut, ChevronDown, GraduationCap, Building2, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/hooks/useAuth";
import { useUIStore } from "@/lib/stores/uiStore";
import { getInitials } from "@/lib/utils/formatters";
import { NotificationDropdown } from "@/components/layout/NotificationDropdown";
import { ActionsNeededButton } from "@/components/layout/ActionsNeededButton";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const ROLE_ICONS: Record<string, React.ReactNode> = {
  "General Manager": <Globe className="h-3.5 w-3.5" />,
  "Branch Manager": <Building2 className="h-3.5 w-3.5" />,
  "Instructor": <GraduationCap className="h-3.5 w-3.5" />,
};

const ROLE_LABELS: Record<string, string> = {
  "General Manager": "General Manager",
  "Branch Manager": "Branch Manager",
  "Instructor": "Instructor",
};

export function Topbar() {
  const { user, role, activeRole, switchableRoles, switchRole, logout } = useAuth();
  const { toggleSidebar } = useUIStore();
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [searchFocused, setSearchFocused] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const displayRole = activeRole || role;
  const canSwitch = switchableRoles.length > 1;

  return (
    <header className="h-16 bg-white/70 dark:bg-slate-900/75 backdrop-blur-xl border-b border-white/40 dark:border-white/[0.08] flex items-center justify-between px-4 lg:px-6 shrink-0 sticky top-0 z-30 shadow-[0_1px_20px_rgba(0,0,0,0.06)]">

      {/* Left: Mobile menu + Search */}
      <div className="flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={toggleSidebar}
          className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center text-text-secondary hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <Menu className="h-5 w-5" />
        </motion.button>

        {/* Search Bar */}
        <motion.div
          animate={{
            width: searchFocused ? 340 : 280,
            boxShadow: searchFocused
              ? "0 0 0 2px rgba(26,158,143,0.3), 0 4px 16px rgba(0,0,0,0.08)"
              : "0 0 0 0px transparent, 0 1px 4px rgba(0,0,0,0.04)",
          }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="hidden md:flex items-center bg-black/[0.04] dark:bg-white/[0.06] rounded-xl px-3 py-2 border border-transparent focus-within:border-primary/30 transition-colors"
        >
          <motion.div
            animate={{ color: searchFocused ? "var(--color-primary)" : "var(--color-text-tertiary)" }}
            transition={{ duration: 0.2 }}
          >
            <Search className="h-3.5 w-3.5 mr-2 shrink-0" />
          </motion.div>
          <input
            type="text"
            placeholder="Search students, batches, fees..."
            className="bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none w-full"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </motion.div>
      </div>

      {/* Right: Role Switcher + Notifications + User */}
      <div className="flex items-center gap-1.5">
        {/* Role Switcher */}
        {canSwitch && (
          <div className="flex items-center bg-black/[0.04] dark:bg-white/[0.05] rounded-xl p-0.5 border border-white/30 dark:border-white/10">
            {switchableRoles.map((r) => (
              <motion.button
                key={r}
                whileTap={{ scale: 0.96 }}
                onClick={() => switchRole(r)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-semibold transition-all ${
                  displayRole === r
                    ? "text-white"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {displayRole === r && (
                  <motion.span
                    layoutId="activeRole"
                    className="absolute inset-0 bg-primary rounded-[10px] shadow-[0_2px_8px_rgba(26,158,143,0.4)]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative flex items-center gap-1.5">
                  {ROLE_ICONS[r]}
                  <span className="hidden sm:inline">{ROLE_LABELS[r] || r}</span>
                </span>
              </motion.button>
            ))}
          </div>
        )}

        {/* Notification Bell */}
        <NotificationDropdown />

        {/* Actions Needed Button */}
        <ActionsNeededButton />

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Menu */}
        <div className="relative" ref={menuRef}>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-teal-600 flex items-center justify-center text-white text-xs font-black shadow-md shadow-primary/25 ring-2 ring-white/40 dark:ring-white/10">
              {user?.full_name ? getInitials(user.full_name) : "U"}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-text-primary leading-tight">{user?.full_name || "User"}</p>
              <p className="text-[11px] text-text-tertiary leading-tight">{displayRole || "—"}</p>
            </div>
            <motion.div
              animate={{ rotate: showUserMenu ? 180 : 0 }}
              transition={{ duration: 0.22 }}
              className="hidden sm:block"
            >
              <ChevronDown className="h-3.5 w-3.5 text-text-tertiary" />
            </motion.div>
          </motion.button>

          {/* Dropdown */}
          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.97 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="absolute right-0 top-full mt-2 w-56 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.14)] border border-white/50 dark:border-white/10 overflow-hidden z-50"
              >
                <div className="px-4 py-3 border-b border-black/[0.06] dark:border-white/[0.06]">
                  <p className="text-sm font-semibold text-text-primary">{user?.full_name}</p>
                  <p className="text-xs text-text-tertiary truncate">{user?.email}</p>
                </div>

                {canSwitch && (
                  <div className="p-1 border-b border-black/[0.06] dark:border-white/[0.06]">
                    <p className="px-3 py-1 text-[10px] text-text-tertiary font-black uppercase tracking-widest">Switch Role</p>
                    {switchableRoles.map((r) => (
                      <motion.button
                        key={r}
                        whileHover={{ x: 2 }}
                        onClick={() => {
                          setShowUserMenu(false);
                          switchRole(r);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-xl transition-colors ${
                          displayRole === r
                            ? "text-primary bg-primary/8 font-semibold"
                            : "text-text-secondary hover:bg-black/[0.04] dark:hover:bg-white/[0.04]"
                        }`}
                      >
                        {ROLE_ICONS[r]}
                        {ROLE_LABELS[r] || r}
                        {displayRole === r && (
                          <span className="ml-auto text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">Active</span>
                        )}
                      </motion.button>
                    ))}
                  </div>
                )}

                <div className="p-1">
                  <motion.button
                    whileHover={{ x: 2 }}
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-error hover:bg-error/8 rounded-xl transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
