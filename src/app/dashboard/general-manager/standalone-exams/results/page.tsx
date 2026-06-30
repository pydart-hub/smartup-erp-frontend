import React from "react";
import Link from "next/link";
import { db } from "@/lib/public-exam/db";
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  ArrowRight,
  PlusCircle,
  ListFilter,
} from "lucide-react";
import { calculateDiagnosedLevel } from "@/lib/public-exam/grading";

export const dynamic = "force-dynamic";

export default async function ResultsDashboardPage() {
  const attempts = await db.examAttempt.findMany({
    include: {
      publishing: {
        select: {
          title: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Standalone Exam Attempts</h1>
          <p className="text-sm text-slate-500 mt-1">
            View student results and grading metrics compiled directly from the standalone database.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/exam-site"
            target="_blank"
            className="flex items-center gap-2 text-sm font-bold text-white bg-[#5f2ea8] hover:bg-[#4d238c] px-4 py-2.5 rounded-xl transition-all duration-200 shadow-sm shadow-[#5f2ea8]/20 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Open Exam Website</span>
          </Link>
        </div>
      </div>

      {/* Overview Metric Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Registrations</div>
          <div className="text-3xl font-black text-slate-900 mt-2">{attempts.length}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Completed Attempts</div>
          <div className="text-3xl font-black text-emerald-600 mt-2">
            {attempts.filter((a) => a.status === "submitted" || a.status === "auto_submitted").length}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Performance</div>
          <div className="text-3xl font-black text-violet-600 mt-2">
            {attempts.length > 0
              ? Math.round(attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length)
              : 0}%
          </div>
        </div>
      </div>

      {/* Attempts Grid / Table Container */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <ListFilter className="w-4 h-4 text-slate-400" />
            <span>All Registrations</span>
          </div>
        </div>

        {attempts.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            No student exam attempts found in the standalone database yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                 <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-3 px-5">Student Name</th>
                  <th className="py-3 px-5">Class</th>
                  <th className="py-3 px-5">Exam Paper Title</th>
                  <th className="py-3 px-5 text-center">Status</th>
                  <th className="py-3 px-5 text-center">Score / Grade</th>
                  <th className="py-3 px-5 text-center">Diagnosed Level</th>
                  <th className="py-3 px-5">Started At</th>
                  <th className="py-3 px-5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {attempts.map((item) => {
                  const isSubmitted = item.status === "submitted" || item.status === "auto_submitted";
                  const diagnosedLevel = isSubmitted ? (
                    (item.resultSnapshotJson && (typeof item.resultSnapshotJson === "object" ? (item.resultSnapshotJson as any).diagnosedLevel : JSON.parse(item.resultSnapshotJson as string).diagnosedLevel)) ||
                    calculateDiagnosedLevel(item.classLevel, item.paperSnapshotJson, item.resultSnapshotJson)
                  ) : null;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors duration-150">
                      <td className="py-3.5 px-5 font-bold text-slate-900">{item.studentName}</td>
                      <td className="py-3.5 px-5 font-medium">Class {item.classLevel}</td>
                      <td className="py-3.5 px-5 text-slate-600 max-w-[200px] truncate">
                        {item.publishing.title}
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          isSubmitted
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-amber-500/10 text-amber-600"
                        }`}>
                          {item.status === "in_progress" ? (
                            <>
                              <Clock className="w-3.5 h-3.5" />
                              <span>In Progress</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Submitted</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-center font-bold">
                        {isSubmitted ? (
                          <span className={`${
                            item.percentage >= 80
                              ? "text-emerald-600"
                              : item.percentage >= 50
                              ? "text-amber-600"
                              : "text-rose-600"
                          }`}>
                            {item.scoreObtained} ({item.percentage}%)
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-center font-bold text-slate-900">
                        {isSubmitted ? (
                          <span className="inline-flex items-center gap-1 bg-violet-50 text-[#5f2ea8] px-2.5 py-0.5 rounded-full text-xs font-black">
                            {diagnosedLevel || "N/A"}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-xs text-slate-500">
                        {new Date(item.startedAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        {isSubmitted ? (
                          <Link
                            href={`/dashboard/general-manager/standalone-exams/results/${item.id}`}
                            className="inline-flex items-center gap-1 text-xs font-bold text-[#5f2ea8] hover:text-[#4d238c] hover:underline cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View details</span>
                          </Link>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
