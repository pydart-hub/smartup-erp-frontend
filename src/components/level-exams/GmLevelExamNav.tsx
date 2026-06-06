"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/Button";

const items = [
  { href: "/dashboard/general-manager/level-exams", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/general-manager/level-exams/assign", label: "Publish Exams", icon: ClipboardList },
];

export function GmLevelExamNav() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <Button key={item.href} asChild size="sm" variant={active ? "primary" : "outline"}>
            <Link href={item.href}>
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          </Button>
        );
      })}
    </div>
  );
}
