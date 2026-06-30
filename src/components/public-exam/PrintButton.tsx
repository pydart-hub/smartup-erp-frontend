"use client";

import React from "react";
import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <>
      <button
        onClick={() => window.print()}
        className="w-full sm:w-auto px-8 py-3.5 bg-slate-800 hover:bg-slate-700/60 border border-slate-700 text-slate-300 hover:text-white font-bold rounded-2xl text-center transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 no-print"
      >
        <Printer className="w-4.5 h-4.5 text-slate-400 group-hover:text-white" />
        <span>Export / Print Report</span>
      </button>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background-color: #ffffff !important;
            color: #0f172a !important;
          }
          .no-print {
            display: none !important;
          }
          /* Convert dark-mode card background to clean bordered printable blocks */
          .bg-slate-800\\/80, .bg-slate-800, .bg-slate-900\\/50, .bg-slate-900\\/60 {
            background-color: #ffffff !important;
            border: 1px solid #cbd5e1 !important;
            color: #0f172a !important;
            box-shadow: none !important;
          }
          .text-white {
            color: #0f172a !important;
          }
          .text-slate-100 {
            color: #0f172a !important;
          }
          .text-slate-300 {
            color: #1e293b !important;
          }
          .text-slate-400, .text-slate-500 {
            color: #475569 !important;
          }
          .text-emerald-400 {
            color: #047857 !important;
          }
          .text-rose-400 {
            color: #b91c1c !important;
          }
          .text-amber-400 {
            color: #b45309 !important;
          }
          /* Custom styling for correct/wrong/skipped questions in print */
          .bg-emerald-500\\/5 {
            background-color: #f0fdf4 !important;
            border: 1.5px solid #a7f3d0 !important;
          }
          .bg-rose-500\\/5 {
            background-color: #fef2f2 !important;
            border: 1.5px solid #fecaca !important;
          }
          .bg-slate-900\\/30 {
            background-color: #f8fafc !important;
            border: 1.5px solid #e2e8f0 !important;
          }
          /* Option choice highlighting in print */
          .bg-emerald-500\\/10 {
            background-color: #d1fae5 !important;
            color: #065f46 !important;
            border: 1px solid #86efac !important;
          }
          .bg-rose-500\\/10 {
            background-color: #fee2e2 !important;
            color: #991b1b !important;
            border: 1px solid #fca5a5 !important;
          }
          .bg-slate-800 {
            background-color: #f8fafc !important;
            border: 1px solid #e2e8f0 !important;
          }
          /* Keep borders visible in print */
          .border, .border-slate-700\\/50, .border-slate-800, .border-b {
            border-color: #cbd5e1 !important;
          }
          /* Hide decorative background elements */
          .bg-emerald-500\\/10, .bg-violet-600\\/10, .blur-\\[100px\\] {
            display: none !important;
          }
          /* Layout adjustments for printing */
          main {
            padding-top: 10px !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          .rounded-3xl, .rounded-2xl {
            border-radius: 12px !important;
          }
        }
      `}} />
    </>
  );
}
