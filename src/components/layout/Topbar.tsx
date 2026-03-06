"use client";

import React from "react";
import { Menu, Search, LogOut, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/hooks/useAuth";
import { useUIStore } from "@/lib/stores/uiStore";
import { getInitials } from "@/lib/utils/formatters";
import { NotificationDropdown } from "@/components/layout/NotificationDropdown";

export function Topbar() {
  const { user, role, logout } = useAuth();
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

      {/* Right: Notifications + User */}
      <div className="flex items-center gap-2">
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
              <p className="text-xs text-text-tertiary leading-tight">{role || "—"}</p>
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
