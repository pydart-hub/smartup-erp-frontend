"use client";

import React, { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { LayoutDashboard, UserPlus, UserCheck, ClipboardList, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { getEmployees } from "@/lib/api/employees";
import { getStudents } from "@/lib/api/students";
import { getBranchMentors, getMentorAssignments } from "@/lib/api/mentors";
import type { MentorFeedback } from "@/lib/types/mentor";

interface TiltCardProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  stats: { label: string; value: string | number; colorClass?: string }[];
  gradientClass: string;
  glowColor: string;
}

function TiltCard({ href, icon, title, description, stats, gradientClass, glowColor }: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0, scale: 1 });
  const [hovered, setHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left - width / 2;
    const mouseY = e.clientY - rect.top - height / 2;
    const rX = -(mouseY / height) * 12; // tilt max 12 degrees
    const rY = (mouseX / width) * 12;
    setTilt({ x: rX, y: rY, scale: 1.03 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0, scale: 1 });
    setHovered(false);
  };

  const handleMouseEnter = () => {
    setHovered(true);
  };

  return (
    <Link href={href} className="block select-none cursor-pointer h-full">
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${tilt.scale})`,
          transition: hovered ? "transform 0.05s ease-out, box-shadow 0.2s ease-out" : "transform 0.5s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.3s ease-out",
          transformStyle: "preserve-3d",
          boxShadow: hovered 
            ? `0 25px 50px -12px ${glowColor}, 0 0 15px -3px var(--color-primary)`
            : "0 10px 25px -15px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.03)",
        }}
        className="relative h-full overflow-hidden rounded-[24px] border border-white/40 dark:border-white/[0.06] bg-white/70 dark:bg-slate-900/50 backdrop-blur-xl p-8 flex flex-col justify-between"
      >
        {/* Glowing background */}
        <div 
          style={{
            transform: "translateZ(-20px)",
          }}
          className={`absolute -right-10 -top-10 h-36 w-36 rounded-full blur-2xl opacity-25 dark:opacity-30 transition-all duration-500 group-hover:scale-125 ${gradientClass}`} 
        />

        {/* Dynamic borders */}
        <div className="absolute inset-0 rounded-[24px] pointer-events-none border border-transparent bg-gradient-to-br from-white/20 to-transparent dark:from-white/10 dark:to-transparent opacity-80" />

        <div style={{ transformStyle: "preserve-3d" }}>
          {/* Floating Icon wrapper */}
          <div 
            style={{ 
              transform: hovered ? "translateZ(35px)" : "translateZ(0px)",
              transition: "transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)",
            }} 
            className="flex items-start justify-between"
          >
            <div className={`rounded-2xl p-4 text-white shadow-lg shadow-black/10 bg-gradient-to-br ${gradientClass}`}>
              {icon}
            </div>
            
            <div 
              style={{ 
                transform: hovered ? "translateZ(25px)" : "translateZ(0px)",
                transition: "transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)",
              }}
              className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-text-secondary dark:text-text-tertiary"
            >
              <span>Explore</span>
              <ArrowRight className={`h-4 w-4 transition-transform duration-300 ${hovered ? "translate-x-1" : ""}`} />
            </div>
          </div>

          {/* Floating Title & Description */}
          <div 
            style={{ 
              transform: hovered ? "translateZ(25px)" : "translateZ(0px)",
              transition: "transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)",
            }}
            className="mt-6"
          >
            <h3 className="text-xl font-bold text-text-primary tracking-tight">
              {title}
            </h3>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* Floating Stats */}
        <div 
          style={{ 
            transform: hovered ? "translateZ(15px)" : "translateZ(0px)",
            transition: "transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)",
          }}
          className="mt-8 pt-6 border-t border-border-light/60 dark:border-border-light/10 flex gap-6"
        >
          {stats.map((s, idx) => (
            <div key={idx} className="flex flex-col">
              <span className="text-xs font-medium text-text-tertiary">{s.label}</span>
              <span className={`text-2xl font-black tracking-tight mt-1 ${s.colorClass || "text-text-primary"}`}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </Link>
  );
}

export default function BranchManagerMentorsHubPage() {
  const { defaultCompany } = useAuth();

  const mentorsQuery = useQuery({
    queryKey: ["branch-mentors", defaultCompany],
    queryFn: () => getBranchMentors(defaultCompany || undefined),
    enabled: !!defaultCompany,
    staleTime: 30_000,
  });

  const assignmentsQuery = useQuery({
    queryKey: ["branch-mentor-assignments", defaultCompany],
    queryFn: () => getMentorAssignments(defaultCompany || undefined),
    enabled: !!defaultCompany,
    staleTime: 30_000,
  });

  const employeesQuery = useQuery({
    queryKey: ["mentor-employees", defaultCompany],
    queryFn: () => getEmployees({ company: defaultCompany || undefined, status: "Active", limit_page_length: 500 }),
    enabled: !!defaultCompany,
    staleTime: 60_000,
  });

  const studentsQuery = useQuery({
    queryKey: ["mentor-assignable-students", defaultCompany],
    queryFn: () => getStudents({ custom_branch: defaultCompany || undefined, enabled: 1, limit_page_length: 500 }),
    enabled: !!defaultCompany,
    staleTime: 60_000,
  });

  const feedbackQuery = useQuery<MentorFeedback[]>({
    queryKey: ["branch-mentor-feedback", defaultCompany],
    queryFn: async () => {
      const res = await fetch(`/api/branch-manager/mentor-feedback?branch=${encodeURIComponent(defaultCompany || "")}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch mentor feedback");
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: !!defaultCompany,
    staleTime: 60_000,
  });

  const mentors = mentorsQuery.data ?? [];
  const assignments = assignmentsQuery.data ?? [];
  const students = studentsQuery.data?.data ?? [];
  const employeesList = employeesQuery.data?.data ?? [];
  const feedbackList = feedbackQuery.data ?? [];

  // Metrics calculations
  const activeMentorsCount = useMemo(() => {
    return mentors.filter((m) => m.status === "Active").length;
  }, [mentors]);

  const assignedStudentsCount = useMemo(() => {
    return assignments.filter((a) => a.status === "Active").length;
  }, [assignments]);

  const existingMentorEmployeeIds = useMemo(() => {
    return new Set(mentors.map((m) => m.employee));
  }, [mentors]);

  const eligibleEmployeesCount = useMemo(() => {
    return employeesList.filter(
      (emp) => emp.user_id && !existingMentorEmployeeIds.has(emp.name)
    ).length;
  }, [employeesList, existingMentorEmployeeIds]);

  const unassignedStudentsCount = useMemo(() => {
    const assignedIds = new Set(assignments.filter((a) => a.status === "Active").map((a) => a.student));
    const count = students.filter((s) => !assignedIds.has(s.name)).length;
    return Math.max(0, count);
  }, [students, assignments]);

  const totalFeedbackCount = feedbackList.length;
  const actionRequiredCount = useMemo(() => {
    return feedbackList.filter((f) => f.action_required).length;
  }, [feedbackList]);

  const isLoading = mentorsQuery.isLoading || assignmentsQuery.isLoading || employeesQuery.isLoading || studentsQuery.isLoading || feedbackQuery.isLoading;

  return (
    <div className="space-y-6">
      <BreadcrumbNav />
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Mentors Portal</h1>
        <p className="text-sm text-text-secondary mt-1">Select an option to manage branch mentors, create profiles, allocate students, or view feedback</p>
      </div>

      {isLoading ? (
        <div className="flex h-60 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          {/* Card 1: Dashboard & Profile Creation */}
          <TiltCard
            href="/dashboard/branch-manager/mentors/dashboard"
            icon={<LayoutDashboard className="h-6 w-6" />}
            title="Dashboard & Creation"
            description="Analyze mentor loadings, track active mentors, register new profiles, and view assignments."
            stats={[
              { label: "Active Mentors", value: activeMentorsCount },
              { label: "Eligible Staff", value: eligibleEmployeesCount },
            ]}
            gradientClass="from-[#1A9E8F] to-[#40BCAE] dark:from-[#2DD4BF] dark:to-[#0EA5E9]"
            glowColor="rgba(26, 158, 143, 0.15)"
          />

          {/* Card 2: Student Assignment */}
          <TiltCard
            href="/dashboard/branch-manager/mentors/assign"
            icon={<UserCheck className="h-6 w-6" />}
            title="Student Assignment"
            description="Map students by batch classifications and assign/reassign them to branch mentors."
            stats={[
              { label: "Unassigned Students", value: unassignedStudentsCount },
              { label: "Total Students", value: students.length },
            ]}
            gradientClass="from-[#82C35B] to-[#1A9E8F] dark:from-[#86EFAC] dark:to-[#14B8A6]"
            glowColor="rgba(130, 195, 91, 0.15)"
          />

          {/* Card 3: Student Feedback */}
          <TiltCard
            href="/dashboard/branch-manager/mentors/feedback"
            icon={<ClipboardList className="h-6 w-6" />}
            title="Student Feedback"
            description="Browse call logs, academic/fee notes, and action items submitted by mentors."
            stats={[
              { label: "Total Logs", value: totalFeedbackCount },
              { 
                label: "Action Needed", 
                value: actionRequiredCount,
                colorClass: actionRequiredCount > 0 ? "text-error font-extrabold" : "text-text-primary"
              },
            ]}
            gradientClass="from-[#EF4444] to-[#F59E0B] dark:from-[#F87171] dark:to-[#FBBF24]"
            glowColor="rgba(239, 68, 68, 0.15)"
          />
        </div>
      )}
    </div>
  );
}
