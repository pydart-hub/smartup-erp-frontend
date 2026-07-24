import Link from "next/link";
import { ArrowRight, ClipboardList, Microscope, Sparkles, Coffee } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

const examModes = [
  {
    title: "Regular Exams",
    description:
      "Open the current general manager exam analytics for scheduled branch exams, branch drilldown, and exam-wise marks.",
    href: "/dashboard/general-manager/exams/regular",
    icon: ClipboardList,
    tone: "from-primary/15 via-white to-primary/5",
  },
  {
    title: "Diagnosis Exams",
    description:
      "Track level exam performance across all students with class-wise, subject-wise, branch-wise, and student-wise drilldown.",
    href: "/dashboard/general-manager/exams/diagnosis",
    icon: Microscope,
    tone: "from-info/15 via-white to-success/10",
  },
  {
    title: "CWC Corner",
    description:
      "Review Coffee With Chairman exam results. Track elite student benchmarking and progress reports across all branches.",
    href: "/dashboard/general-manager/exams/cwc",
    icon: Coffee,
    tone: "from-amber-500/15 via-white to-amber-500/5",
  },
];

export default function GMExamsLandingPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <section className="relative overflow-hidden rounded-[24px] border border-primary/10 bg-[linear-gradient(135deg,rgba(10,159,140,0.12),rgba(255,255,255,0.98)_45%,rgba(21,94,239,0.08))] p-6 shadow-card sm:p-8">
        <div className="max-w-3xl space-y-3 pr-24 md:pr-40 relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            General Manager Exam Center
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            Choose the exam system you want to review.
          </h1>
          <p className="text-sm leading-6 text-text-secondary sm:text-base">
            Keep regular exam analytics separate from diagnosis and level exam analytics, so each workflow is easier to navigate and monitor.
          </p>
        </div>
        <video
          src="/Logo Icon LOOK ALPHA.webm"
          autoPlay
          loop
          muted
          playsInline
          className="absolute right-4 top-1/2 -translate-y-1/2 w-32 h-32 md:w-40 md:h-40 pointer-events-none opacity-70 object-contain"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {examModes.map((mode) => (
          <Link key={mode.title} href={mode.href} className="block">
            <Card hover className={`h-full overflow-hidden border-border-light/80 bg-[linear-gradient(135deg,var(--tw-gradient-stops))] ${mode.tone}`}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div className="rounded-2xl bg-white/90 p-3 text-primary shadow-sm">
                    <mode.icon className="h-6 w-6" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-text-tertiary" />
                </div>
                <CardTitle className="mt-6 text-2xl">{mode.title}</CardTitle>
                <CardDescription className="max-w-xl text-sm leading-6">{mode.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/85 px-3 py-2 text-sm font-medium text-text-primary">
                  Open {mode.title}
                  <ArrowRight className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}
