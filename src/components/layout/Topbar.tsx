"use client";

import React from "react";
import { Menu, Search, LogOut, ChevronDown, ArrowLeftRight, GraduationCap, Building2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/hooks/useAuth";
import { useUIStore } from "@/lib/stores/uiStore";
import { getInitials } from "@/lib/utils/formatters";
import { NotificationDropdown } from "@/components/layout/NotificationDropdown";

const ROLE_ICONS: Record<string, React.ReactNode> = {
  "Branch Manager": <Building2 className="h-4 w-4" />,
  "Instructor": <GraduationCap className="h-4 w-4" />,
};

const ROLE_LABELS: Record<string, string> = {
  "Branch Manager": "Branch Manager",
  "Instructor": "Instructor",
};

export function Topbar() {
  const { user, role, activeRole, switchableRoles, switchRole, logout } = useAuth();
  const { toggleSidebar } = useUIStore();
  const [showUserMenu, setShowUserMenu] = React.useState(false);
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
    <header className="h-16 bg-surface border-b border-border-light flex items-center justify-between px-4 lg:px-6 shrink-0 sticky top-0 z-30">
      {/* Left: Mobile menu + Search */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="lg:hidden w-10 h-10 rounded-[10px] flex items-center justify-center text-text-secondary hover:bg-app-bg transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Search Bar */}
        <div className="hidden md:flex items-center bg-app-bg rounded-[10px] px-3 py-2 w-80 border border-transparent focus-within:border-primary/30 focus-within:bg-surface transition-all">
          <Search className="h-4 w-4 text-text-tertiary mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Search students, batches, fees..."
            className="bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none w-full"
          />
        </div>
      </div>

      {/* Right: Role Switcher + Notifications + User */}
      <div className="flex items-center gap-2">
        {/* Role Switcher — only for dual-role users */}
        {canSwitch && (
          <div className="flex items-center bg-app-bg rounded-[10px] p-0.5 border border-border-light">
            {switchableRoles.map((r) => (
              <button
                key={r}
                onClick={() => switchRole(r)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-medium transition-all ${
                  displayRole === r
                    ? "bg-primary text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface"
                }`}
              >
                {ROLE_ICONS[r]}
                <span className="hidden sm:inline">{ROLE_LABELS[r] || r}</span>
              </button>
            ))}
          </div>
        )}

        {/* Notification Bell */}
        <NotificationDropdown />

        {/* User Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-[10px] hover:bg-app-bg transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold">
              {user?.full_name ? getInitials(user.full_name) : "U"}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-text-primary leading-tight">
                {user?.full_name || "User"}
              </p>
              <p className="text-xs text-text-tertiary leading-tight">{displayRole || "—"}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-text-tertiary hidden sm:block" />
          </button>

          {/* Dropdown */}
          {showUserMenu && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-1 w-56 bg-surface rounded-[12px] shadow-dropdown border border-border-light overflow-hidden z-50"
            >
              <div className="px-4 py-3 border-b border-border-light">
                <p className="text-sm font-medium text-text-primary">{user?.full_name}</p>
                <p className="text-xs text-text-tertiary truncate">{user?.email}</p>
              </div>

              {/* Role switch options in dropdown (mobile-friendly duplicate) */}
              {canSwitch && (
                <div className="p-1 border-b border-border-light">
                  <p className="px-3 py-1 text-xs text-text-tertiary font-medium">Switch Role</p>
                  {switchableRoles.map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        setShowUserMenu(false);
                        switchRole(r);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-[8px] transition-colors ${
                        displayRole === r
                          ? "text-primary bg-primary-light font-medium"
                          : "text-text-secondary hover:bg-app-bg"
                      }`}
                    >
                      {ROLE_ICONS[r]}
                      {ROLE_LABELS[r] || r}
                      {displayRole === r && (
                        <span className="ml-auto text-xs text-primary">Active</span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <div className="p-1">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-error hover:bg-error-light rounded-[8px] transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </header>
  );
}
