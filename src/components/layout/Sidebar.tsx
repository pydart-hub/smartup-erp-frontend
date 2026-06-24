"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  GraduationCap,
  School,
  Users,
  ClipboardCheck,
  CalendarDays,
  CalendarCheck2,
  CalendarClock,
  Phone,
  IndianRupee,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  UserCheck,
  UserPlus,
  Receipt,
  Briefcase,
  ArrowRightLeft,
  FileBarChart,
  MessageSquareWarning,
  Trophy,
  Coins,
  Baby,
  TreePalm,
  Landmark,
  BookOpen,
  ClipboardList,
  Video,
  UserX,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useUIStore } from "@/lib/stores/uiStore";
import { BRANCH_MANAGER_NAV, type NavItem } from "@/lib/utils/constants";
import { useTransferNotifications } from "@/lib/hooks/useTransferNotifications";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  GraduationCap,
  School,
  Users,
  ClipboardCheck,
  CalendarDays,
  CalendarCheck2,
  CalendarClock,
  Phone,
  IndianRupee,
  ShoppingCart,
  UserCheck,
  UserPlus,
  Receipt,
  Briefcase,
  ArrowRightLeft,
  FileBarChart,
  MessageSquareWarning,
  Trophy,
  Coins,
  Baby,
  TreePalm,
  Landmark,
  BookOpen,
  ClipboardList,
  Video,
  UserX,
};

interface SidebarProps {
  navItems?: NavItem[];
}

export function Sidebar({ navItems = BRANCH_MANAGER_NAV }: SidebarProps) {
  const pathname = usePathname();
  const { sidebarOpen, sidebarCollapsed, setSidebarOpen, toggleSidebarCollapsed } = useUIStore();
  const { pendingCount } = useTransferNotifications();
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({});

  // Auto-expand groups whose children match the current path
  React.useEffect(() => {
    const expanded: Record<string, boolean> = {};
    navItems.forEach((item) => {
      if (item.children?.length) {
        const childActive = item.children.some((c) => pathname.startsWith(c.href));
        if (childActive || pathname.startsWith(item.href)) {
          expanded[item.href] = true;
        }
      }
    });
    setOpenGroups((prev) => ({ ...prev, ...expanded }));
  }, [pathname, navItems]);

  const toggleGroup = (href: string) => {
    setOpenGroups((prev) => ({ ...prev, [href]: !prev[href] }));
  };

  const visibleNavItems = React.useMemo(
    () =>
      navItems.map((item) => {
        if (item.label === "Transfers" && pendingCount > 0) {
          return { ...item, badge: String(pendingCount) };
        }
        return item;
      }),
    [navItems, pendingCount],
  );

  // Logo link: first nav item's href (works for any role)
  const homeHref = navItems[0]?.href ?? "/dashboard/branch-manager";

  const renderIcon = (iconName: string, emoji: string, isActive: boolean, isChild = false) => {
    if (isActive) {
      return (
        <motion.span
          className={cn("shrink-0 flex items-center justify-center", isChild ? "text-sm" : "text-base")}
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          {emoji}
        </motion.span>
      );
    }

    const IconComp = iconMap[iconName] || LayoutDashboard;
    const sizeClass = isChild ? "h-3.5 w-3.5" : "h-4.5 w-4.5";
    return <IconComp className={cn(sizeClass, "shrink-0 text-text-tertiary group-hover:text-text-secondary transition-colors")} />;
  };

  const renderNavLink = (item: NavItem, isChild = false) => {
    const isActive = pathname === item.href;

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setSidebarOpen(false)}
        className={cn(
          "group flex items-center transition-all duration-200 relative",
          isChild ? "py-1.5 text-xs font-normal" : "py-2.5 text-sm font-medium",
          isActive
            ? "text-white"
            : "text-text-secondary hover:text-text-primary",
          sidebarCollapsed
            ? "justify-center px-0 mx-auto w-10 h-10 rounded-xl"
            : cn("gap-3 rounded-xl px-3", isChild && "pl-10")
        )}
      >
        {isActive && (
          <motion.div
            layoutId="sidebar-active"
            className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary to-[#512DA8] shadow-[0_4px_16px_rgba(103,58,183,0.4)]"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
        {!isActive && (
          <span className="absolute inset-0 rounded-xl bg-transparent group-hover:bg-black/[0.04] dark:group-hover:bg-white/[0.05] transition-colors" />
        )}
        <span className={cn("relative flex items-center", sidebarCollapsed ? "justify-center" : "gap-3 w-full")}>
          {renderIcon(item.icon, item.emoji, isActive, isChild)}
          {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
          {item.badge && !sidebarCollapsed && (
            <span className="ml-auto text-[10px] font-bold bg-error text-white rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
              {item.badge}
            </span>
          )}
        </span>
        {sidebarCollapsed && (
          <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900/90 dark:bg-slate-800/90 backdrop-blur-sm text-white text-xs rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-50 shadow-xl border border-white/10">
            {item.label}
          </div>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full flex flex-col transition-all duration-300 ease-in-out",
          "bg-white/80 dark:bg-slate-900/85 backdrop-blur-xl",
          "border-r border-white/40 dark:border-white/[0.08]",
          "shadow-[2px_0_24px_rgba(0,0,0,0.06)]",
          // Desktop
          "lg:relative lg:translate-x-0",
          sidebarCollapsed ? "lg:w-[72px]" : "lg:w-[256px]",
          // Mobile
          sidebarOpen ? "translate-x-0 w-[272px]" : "-translate-x-full w-[272px]",
          "lg:translate-x-0"
        )}
      >
        {/* Header */}
        <div className={cn(
          "h-16 flex items-center border-b border-white/30 dark:border-white/[0.08] shrink-0 relative",
          sidebarCollapsed ? "justify-center px-0" : "justify-between px-4"
        )}>
          {!sidebarCollapsed && (
            <Link href={homeHref} className="flex items-center gap-2.5 overflow-hidden">
              <Image
                src="/smartup-logo-v2.png"
                alt="SmartUp"
                width={36}
                height={36}
                className="object-contain block flex-shrink-0 drop-shadow-sm"
              />
              <span className="text-[#1a1a1a] dark:text-white text-lg tracking-[0.12em] uppercase leading-none" style={{ fontFamily: 'var(--font-montserrat)', fontWeight: 900 }}>SMART UP</span>
            </Link>
          )}
          {sidebarCollapsed && (
            <Link href={homeHref} className="flex items-center justify-center">
              <Image
                src="/smartup-logo-v2.png"
                alt="SmartUp"
                width={36}
                height={36}
                className="object-contain block flex-shrink-0 drop-shadow-sm"
              />
            </Link>
          )}

          {/* Collapse Toggle (Desktop only) */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={toggleSidebarCollapsed}
            className={cn(
              "hidden lg:flex items-center justify-center text-text-tertiary hover:text-primary transition-all z-50",
              sidebarCollapsed
                ? "absolute top-1/2 -translate-y-1/2 -right-3.5 w-7 h-7 rounded-full bg-white dark:bg-slate-800 shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-slate-200 dark:border-slate-700"
                : "w-8 h-8 rounded-xl bg-black/[0.04] dark:bg-white/[0.05] hover:bg-primary/10 border border-transparent dark:border-white/10"
            )}
            style={{ perspective: 400 }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={sidebarCollapsed ? "collapsed" : "expanded"}
                initial={{ rotateY: -90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: 90, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="flex items-center justify-center"
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </motion.div>
            </AnimatePresence>
          </motion.button>

          {/* Mobile close */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-text-tertiary hover:text-primary transition-colors p-1 rounded-lg hover:bg-black/5"
          >
            <X className="h-5 w-5" />
          </motion.button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
          {visibleNavItems.map((item) => {
            // Items with children → collapsible group
            if (item.children?.length) {
              const isOpen = !!openGroups[item.href];
              const isParentActive = pathname === item.href;
              const isChildActive = item.children.some((c) => pathname.startsWith(c.href));

              return (
                <div key={item.href}>
                  {/* Group header: parent link + toggle */}
                  <div className="flex items-center">
                    <Link
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "group flex-1 flex items-center transition-all duration-200 relative",
                        isParentActive
                          ? "text-white"
                          : isChildActive
                            ? "text-primary"
                            : "text-text-secondary hover:text-text-primary",
                        sidebarCollapsed
                          ? "justify-center px-0 mx-auto w-10 h-10 rounded-xl"
                          : "gap-3 rounded-xl px-3 py-2.5 text-sm font-medium"
                      )}
                    >
                      {isParentActive && (
                        <motion.div
                          layoutId="sidebar-active"
                          className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary to-[#512DA8] shadow-[0_4px_16px_rgba(103,58,183,0.4)]"
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}
                      {!isParentActive && (
                        <span className="absolute inset-0 rounded-xl bg-transparent group-hover:bg-black/[0.04] dark:group-hover:bg-white/[0.05] transition-colors" />
                      )}
                      <span className={cn("relative flex items-center", sidebarCollapsed ? "justify-center" : "gap-3")}>
                        {renderIcon(item.icon, item.emoji, isParentActive)}
                        {!sidebarCollapsed && <span>{item.label}</span>}
                      </span>
                      {sidebarCollapsed && (
                        <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900/90 dark:bg-slate-800/90 backdrop-blur-sm text-white text-xs rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-50 shadow-xl border border-white/10">
                          {item.label}
                        </div>
                      )}
                    </Link>
                    {!sidebarCollapsed && (
                      <motion.button
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.22 }}
                        onClick={() => toggleGroup(item.href)}
                        className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </motion.button>
                    )}
                  </div>

                  {/* Children */}
                  {!sidebarCollapsed && (
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="py-1 space-y-0.5">
                            {item.children.map((child) => renderNavLink(child, true))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </div>
              );
            }

            // Regular item (no children)
            return renderNavLink(item);
          })}
        </nav>

        {/* Bottom toggle removed */}
      </aside>
    </>
  );
}
