"use client";

import { useRouter } from "next/navigation";
import { GraduationCap, BookOpen, UserCheck, ArrowRight } from "lucide-react";

const admissionTypes = [
  {
    title: "Regular Admission",
    description: "Full program enrollment — enroll a student into a complete academic program with all subjects included.",
    icon: GraduationCap,
    href: "/dashboard/sales-user/admit",
    color: "bg-blue-50 text-blue-600 border-blue-200",
    hoverColor: "hover:border-blue-400 hover:shadow-blue-100",
  },
  {
    title: "Subject Tuition",
    description: "Subject-wise enrollment — enroll a student for individual subjects like Physics, Chemistry, or Maths.",
    icon: BookOpen,
    href: "/dashboard/sales-user/admit-subject",
    color: "bg-emerald-50 text-emerald-600 border-emerald-200",
    hoverColor: "hover:border-emerald-400 hover:shadow-emerald-100",
  },
  {
    title: "Siblings Admission",
    description: "Sibling enrollment — same as regular admission with a 5% sibling discount on fees.",
    icon: UserCheck,
    href: "/dashboard/sales-user/admit?referred=true",
    color: "bg-purple-50 text-purple-600 border-purple-200",
    hoverColor: "hover:border-purple-400 hover:shadow-purple-100",
  },
];

export default function NewAdmissionPage() {
  const router = useRouter();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4">
      <div className="text-center mb-10">
        <h1 className="text-2xl font-bold text-gray-900">New Admission</h1>
        <p className="text-gray-500 mt-1">Choose the type of admission</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-4xl">
        {admissionTypes.map((type) => (
          <button
            key={type.title}
            onClick={() => router.push(type.href)}
            className={`group relative flex flex-col items-start gap-4 rounded-xl border-2 p-6 text-left transition-all duration-200 cursor-pointer ${type.color} ${type.hoverColor} hover:shadow-lg`}
          >
            <div className="flex items-center justify-between w-full">
              <type.icon className="h-8 w-8" />
              <ArrowRight className="h-5 w-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{type.title}</h2>
              <p className="text-sm text-gray-600 mt-1">{type.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
