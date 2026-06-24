"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Menu, Search, LogOut, ChevronDown, GraduationCap, Building2, Globe, School } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/hooks/useAuth";
import { useUIStore } from "@/lib/stores/uiStore";
import { getInitials } from "@/lib/utils/formatters";
import { NotificationDropdown } from "@/components/layout/NotificationDropdown";
import { ActionsNeededButton } from "@/components/layout/ActionsNeededButton";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useAuthStore } from "@/lib/stores/authStore";

const ROLE_ICONS: Record<string, React.ReactNode> = {
  "General Manager": <Globe className="h-3.5 w-3.5" />,
  Director: <Globe className="h-3.5 w-3.5" />,
  Management: <Globe className="h-3.5 w-3.5" />,
  "Branch Manager": <Building2 className="h-3.5 w-3.5" />,
  "Class Incharge": <School className="h-3.5 w-3.5" />,
  Instructor: <GraduationCap className="h-3.5 w-3.5" />,
  Parent: <School className="h-3.5 w-3.5" />,
  Mentor: <School className="h-3.5 w-3.5" />,
  "HR Manager": <Building2 className="h-3.5 w-3.5" />,
  "Sales User": <Building2 className="h-3.5 w-3.5" />,
};

const ROLE_LABELS: Record<string, string> = {
  "General Manager": "General Manager",
  Director: "Director",
  Management: "Management",
  "Branch Manager": "Branch Manager",
  "Class Incharge": "Class Incharge",
  Instructor: "Instructor",
  Parent: "Parent",
  Mentor: "Mentor",
  "HR Manager": "HR Manager",
  "Sales User": "Sales User",
};

const DASHBOARD_ROLE_PREFIXES: Array<{ prefix: string; role: string }> = [
  { prefix: "/dashboard/director", role: "Director" },
  { prefix: "/dashboard/general-manager", role: "General Manager" },
  { prefix: "/dashboard/branch-manager", role: "Branch Manager" },
  { prefix: "/dashboard/mentor", role: "Mentor" },
  { prefix: "/dashboard/hr-manager", role: "HR Manager" },
  { prefix: "/dashboard/sales-user", role: "Sales User" },
  { prefix: "/dashboard/class-incharge", role: "Class Incharge" },
  { prefix: "/dashboard/instructor", role: "Instructor" },
  { prefix: "/dashboard/parent", role: "Parent" },
];

export function Topbar() {
  const { user, role, activeRole, switchableRoles, switchRole, logout } = useAuth();
  const setActiveRole = useAuthStore((state) => state.setActiveRole);
  const { toggleSidebar } = useUIStore();
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [searchFocused, setSearchFocused] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const switchableRolesKey = switchableRoles.join('|');

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  React.useEffect(() => {
    const matchedRole = DASHBOARD_ROLE_PREFIXES.find(({ prefix }) => pathname.startsWith(prefix))?.role;
    if (!matchedRole) return;

    const canUseRole = matchedRole === role || switchableRolesKey.split("|").includes(matchedRole);

    if (canUseRole && activeRole !== matchedRole) {
      setActiveRole(matchedRole);
    }
  }, [activeRole, pathname, role, setActiveRole, switchableRolesKey]);

  const displayRole = activeRole || role;
  const canSwitch = switchableRoles.length > 1;

  return (
    <header
      className="h-16 flex items-center justify-between px-4 lg:px-6 shrink-0 sticky top-0 z-30
        bg-gradient-to-b from-white to-slate-50/90
        dark:from-slate-800 dark:to-slate-900
        border-b border-slate-200/70 dark:border-white/[0.07]
        shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_4px_24px_rgba(0,0,0,0.09),0_1px_0_rgba(0,0,0,0.05)]
        dark:shadow-[0_4px_24px_rgba(0,0,0,0.35),0_1px_0_rgba(0,0,0,0.25)]"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:hidden" />

      <div className="flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.9, y: 1 }}
          onClick={toggleSidebar}
          className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors"
          style={{
            background: "linear-gradient(to bottom, #ffffff, #f1f5f9)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9), 0 2px 6px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)",
          }}
        >
          <Menu className="h-4.5 w-4.5" />
        </motion.button>

        <motion.div
          animate={{ width: searchFocused ? 340 : 260 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="hidden md:flex items-center rounded-xl px-3 py-2 border transition-colors"
          style={{
            background: searchFocused
              ? "linear-gradient(to bottom, #f0fdf9, #f8fffe)"
              : "linear-gradient(to bottom, #f1f5f9, #f8fafc)",
            boxShadow: searchFocused
              ? "inset 0 2px 4px rgba(0,0,0,0.08), 0 0 0 2px rgba(103,58,183,0.25)"
              : "inset 0 2px 4px rgba(0,0,0,0.07), inset 0 0 0 1px rgba(0,0,0,0.05)",
            borderColor: searchFocused ? "rgba(103,58,183,0.3)" : "rgba(203,213,225,0.8)",
          }}
        >
          <motion.div
            animate={{ color: searchFocused ? "var(--color-primary)" : "#94a3b8" }}
            transition={{ duration: 0.2 }}
          >
            <Search className="h-3.5 w-3.5 mr-2 shrink-0" />
          </motion.div>
          <input
            type="text"
            placeholder="Search students, batches, fees..."
            className="bg-transparent text-sm text-text-primary placeholder:text-slate-400 outline-none w-full"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </motion.div>
      </div>

      <div className="flex items-center gap-2">
        {canSwitch && (
          <div
            className="flex items-center rounded-xl p-0.5"
            style={{
              background: "linear-gradient(to bottom, #e2e8f0, #f1f5f9)",
              boxShadow: "inset 0 2px 4px rgba(0,0,0,0.1), inset 0 0 0 1px rgba(0,0,0,0.06)",
            }}
          >
            {switchableRoles.map((r) => (
              <motion.button
                key={r}
                whileTap={{ scale: 0.95, y: 1 }}
                onClick={() => switchRole(r)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-semibold transition-all ${
                  displayRole === r ? "text-white" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {displayRole === r && (
                  <motion.span
                    layoutId="activeRole"
                    className="absolute inset-0 rounded-[10px]"
                    style={{
                      background: "linear-gradient(to bottom, #7E57C2, #673AB7)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 3px 8px rgba(103,58,183,0.45)",
                    }}
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

        <NotificationDropdown />
        <ActionsNeededButton />
        <ThemeToggle />

        <div className="relative" ref={menuRef}>
          <motion.button
            whileTap={{ scale: 0.97, y: 1 }}
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-xl transition-all"
            style={{
              background: showUserMenu
                ? "linear-gradient(to bottom, #e2e8f0, #f1f5f9)"
                : "linear-gradient(to bottom, #ffffff, #f8fafc)",
              boxShadow: showUserMenu
                ? "inset 0 2px 4px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.07)"
                : "inset 0 1px 0 rgba(255,255,255,0.9), 0 2px 6px rgba(0,0,0,0.09), 0 1px 2px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.05)",
            }}
          >
            <div
              className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-teal-600 flex items-center justify-center text-white text-[11px] font-black"
              style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 6px rgba(103,58,183,0.4)" }}
            >
              {user?.full_name ? getInitials(user.full_name) : "U"}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-tight">{user?.full_name || "User"}</p>
              <p className="text-[10px] text-slate-400 leading-tight">{displayRole || "-"}</p>
            </div>
            <motion.div
              animate={{ rotate: showUserMenu ? 180 : 0 }}
              transition={{ duration: 0.22 }}
              className="hidden sm:block ml-0.5"
            >
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </motion.div>
          </motion.button>

          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: -8, rotateX: -12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, rotateX: -8, scale: 0.96 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformOrigin: "top right", perspective: 800 }}
                className="absolute right-0 top-full mt-2 w-60 z-[200]"
              >
                <div className="relative rounded-2xl overflow-hidden bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-white/[0.08] shadow-[0_0_0_1px_rgba(255,255,255,0.6)_inset,0_20px_50px_rgba(0,0,0,0.22),0_6px_16px_rgba(0,0,0,0.12)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset,0_20px_50px_rgba(0,0,0,0.5),0_6px_16px_rgba(0,0,0,0.3)]">
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-white/20 to-transparent pointer-events-none z-10" />

                  <div className="px-4 py-3.5 bg-gradient-to-b from-slate-50 to-white dark:from-slate-800/60 dark:to-[#0f172a] border-b border-slate-100 dark:border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-teal-600 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-primary/30 ring-2 ring-white dark:ring-white/10 shrink-0">
                        {user?.full_name ? getInitials(user.full_name) : "U"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-white leading-tight truncate">{user?.full_name}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{user?.email}</p>
                      </div>
                    </div>
                  </div>

                  {canSwitch && (
                    <div className="p-1.5 border-b border-slate-100 dark:border-white/[0.06]">
                      <p className="px-3 py-1 text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">Switch Role</p>
                      {switchableRoles.map((r) => (
                        <motion.button
                          key={r}
                          whileHover={{ x: 3, backgroundColor: displayRole === r ? undefined : "rgba(0,0,0,0.03)" }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setShowUserMenu(false);
                            switchRole(r);
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-xl transition-colors ${
                            displayRole === r
                              ? "text-primary bg-primary/8 font-semibold"
                              : "text-slate-600 dark:text-slate-300"
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

                  <div className="p-1.5">
                    <motion.button
                      whileHover={{ x: 3 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors font-medium"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </motion.button>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-black/10 dark:via-black/30 to-transparent pointer-events-none" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}



