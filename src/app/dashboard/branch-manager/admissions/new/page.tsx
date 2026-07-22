"use client";

import { useRouter } from "next/navigation";
import { GraduationCap, BookOpen, UserCheck, ArrowRight, Star, Unlock, BookUser, PlusCircle } from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";

const admissionTypes = [
  {
    title: "Regular Admission",
    description: "Full program enrollment — enroll a student into a complete academic program with all subjects included.",
    icon: GraduationCap,
    href: "/dashboard/branch-manager/admit",
    color: "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    hoverColor: "hover:border-blue-400 hover:shadow-blue-100 dark:hover:shadow-none",
  },
  {
    title: "Subject Tuition",
    description: "Subject-wise enrollment — enroll a student for individual subjects like Physics, Chemistry, or Maths.",
    icon: BookOpen,
    href: "/dashboard/branch-manager/admit-subject",
    color: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    hoverColor: "hover:border-emerald-400 hover:shadow-emerald-100 dark:hover:shadow-none",
  },
  {
    title: "Siblings Admission",
    description: "Sibling enrollment — same as regular admission with a 5% sibling discount on fees.",
    icon: UserCheck,
    href: "/dashboard/branch-manager/admit?referred=true",
    color: "bg-purple-50 dark:bg-purple-950/60 text-[#673AB7] dark:text-purple-400 border-purple-200 dark:border-purple-800",
    hoverColor: "hover:border-purple-400 hover:shadow-purple-100 dark:hover:shadow-none",
  },
  {
    title: "Demo Admission",
    description: "Trial enrollment — flat ₹499 fee for 1 month. Student gets access to all features (attendance, exams, schedules).",
    icon: Star,
    href: "/dashboard/branch-manager/admit?demo=true",
    color: "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    hoverColor: "hover:border-amber-400 hover:shadow-amber-100 dark:hover:shadow-none",
  },
  {
    title: "Free Access Admission",
    description: "Free enrollment — no fees charged. Student gets full access to the program at zero cost.",
    icon: Unlock,
    href: "/dashboard/branch-manager/students/new?free_access=true",
    color: "bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800",
    hoverColor: "hover:border-teal-400 hover:shadow-teal-100 dark:hover:shadow-none",
  },
  {
    title: "One to One",
    description: "Individual tuition — personalized sessions with hourly billing and editable per-hour pricing.",
    icon: BookUser,
    href: "/dashboard/branch-manager/admit-one-to-one",
    color: "bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800",
    hoverColor: "hover:border-violet-400 hover:shadow-violet-100 dark:hover:shadow-none",
  },
];

export default function DirectNewAdmissionPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
        <BreadcrumbNav />

        <div className="text-center my-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-2.5">
            <PlusCircle className="h-7 w-7 text-[#673AB7]" />
            New Student Admission
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Select the type of enrollment to proceed with student registration.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full">
          {admissionTypes.map((type) => (
            <button
              key={type.title}
              onClick={() => router.push(type.href)}
              className={`group relative flex flex-col items-start gap-3 rounded-2xl border-2 p-5 text-left transition-all duration-200 cursor-pointer ${type.color} ${type.hoverColor} shadow-xs hover:shadow-md`}
            >
              <div className="flex items-center justify-between w-full">
                <type.icon className="h-7 w-7" />
                <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">{type.title}</h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{type.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
