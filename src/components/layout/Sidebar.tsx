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
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useUIStore } from "@/lib/stores/uiStore";
import { BRANCH_MANAGER_NAV, type NavItem } from "@/lib/utils/constants";
import { useTransferNotifications } from "@/lib/hooks/useTransferNotifications";

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  GraduationCap,
  School,
  Users,
  ClipboardCheck,
  CalendarDays,
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
          className={cn("shrink-0 flex items-center justify-center", isChild ? "text-base" : "text-lg")}
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          {emoji}
        </motion.span>
      );
    }

    const IconComp = iconMap[iconName] || LayoutDashboard;
    const sizeClass = isChild ? "h-4 w-4" : "h-5 w-5";
    return <IconComp className={cn(sizeClass, "shrink-0 text-text-tertiary group-hover:text-text-secondary")} />;
  };

  const renderNavLink = (item: NavItem, isChild = false) => {
    const isActive = pathname === item.href;

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setSidebarOpen(false)}
        className={cn(
          "group flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-all duration-200 relative",
          isActive
            ? "bg-brand-wash text-primary"
            : "text-text-secondary hover:bg-app-bg hover:text-text-primary",
          sidebarCollapsed && "justify-center px-0",
          isChild && !sidebarCollapsed && "pl-10"
        )}
      >
        {isActive && (
          <motion.div
            layoutId="sidebar-active"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-primary rounded-r-full"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
        {renderIcon(item.icon, item.emoji, isActive, isChild)}
        {!sidebarCollapsed && <span>{item.label}</span>}
        {item.badge && !sidebarCollapsed && (
          <span className="ml-auto text-xs bg-error text-white rounded-full px-2 py-0.5">
            {item.badge}
          </span>
        )}
        {sidebarCollapsed && (
          <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-text-primary text-white text-xs rounded-[8px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
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
            className="fixed inset-0 bg-black/30 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full bg-surface border-r border-border-light flex flex-col transition-all duration-300 ease-in-out",
          // Desktop
          "lg:relative lg:translate-x-0",
          sidebarCollapsed ? "lg:w-[72px]" : "lg:w-[260px]",
          // Mobile
          sidebarOpen ? "translate-x-0 w-[280px]" : "-translate-x-full w-[280px]",
          "lg:translate-x-0"
        )}
      >
        {/* Header */}
        <div className={cn(
          "h-16 flex items-center border-b border-border-light px-4 shrink-0",
          sidebarCollapsed ? "justify-center" : "justify-between"
        )}>
          {!sidebarCollapsed && (
            <Link href={homeHref} className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-primary rounded-[10px] flex items-center justify-center p-1">
                <Image src="/smartup-logo.png" alt="SmartUp" width={28} height={28} className="object-contain" />
              </div>
              <span className="font-bold text-text-primary text-lg">Smartup</span>
            </Link>
          )}
          {sidebarCollapsed && (
            <div className="w-9 h-9 bg-primary rounded-[10px] flex items-center justify-center p-1">
              <Image src="/smartup-logo.png" alt="SmartUp" width={28} height={28} className="object-contain" />
            </div>
          )}
          {/* Mobile close */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-text-tertiary hover:text-text-primary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
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
                        "group flex-1 flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium transition-all duration-200 relative",
                        isParentActive
                          ? "bg-brand-wash text-primary"
                          : isChildActive
                            ? "text-primary"
                            : "text-text-secondary hover:bg-app-bg hover:text-text-primary",
                        sidebarCollapsed && "justify-center px-0"
                      )}
                    >
                      {isParentActive && (
                        <motion.div
                          layoutId="sidebar-active"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-primary rounded-r-full"
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}
                      {renderIcon(item.icon, item.emoji, isParentActive)}
                      {!sidebarCollapsed && <span>{item.label}</span>}
                      {sidebarCollapsed && (
                        <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-text-primary text-white text-xs rounded-[8px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                          {item.label}
                        </div>
                      )}
                    </Link>
                    {!sidebarCollapsed && (
                      <button
                        onClick={() => toggleGroup(item.href)}
                        className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-app-bg transition-colors"
                      >
                        <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")} />
                      </button>
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
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          {item.children.map((child) => renderNavLink(child, true))}
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

        {/* Collapse Toggle (Desktop only) */}
        <div className="hidden lg:flex items-center justify-center p-3 border-t border-border-light">
          <button
            onClick={toggleSidebarCollapsed}
            className="w-8 h-8 rounded-full bg-app-bg hover:bg-brand-wash flex items-center justify-center text-text-tertiary hover:text-primary transition-all"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
