"use client";

import React from "react";
import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <>
      <button
        onClick={() => window.print()}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-border-light bg-surface px-6 py-3 text-sm font-bold text-text-primary transition-colors hover:bg-app-bg no-print"
      >
        <Printer className="h-4 w-4 text-primary" />
        <span>Export / Print Report</span>
      </button>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }

          html,
          body {
            background: #ffffff !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .no-print {
            display: none !important;
          }

          main {
            width: 100% !important;
            max-width: 100% !important;
          }

          section,
          article,
          .question-card,
          table,
          tr,
          td,
          th {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .shadow-card,
          [class*="shadow-"] {
            box-shadow: none !important;
          }

          .rounded-\[30px\],
          .rounded-\[28px\],
          .rounded-\[24px\],
          .rounded-2xl,
          .rounded-3xl {
            border-radius: 12px !important;
          }

          .bg-surface,
          .bg-app-bg,
          [class*="bg-success\/10"],
          [class*="bg-warning\/10"],
          [class*="bg-error\/10"],
          [class*="bg-primary\/5"],
          [class*="bg-primary\/8"],
          [class*="bg-success\/8"],
          [class*="bg-error\/5"],
          [class*="bg-warning\/5"] {
            background: #ffffff !important;
          }

          .border,
          [class*="border-"] {
            border-color: #cbd5e1 !important;
          }

          .text-text-primary,
          .text-primary,
          .text-success,
          .text-warning,
          .text-error {
            color: #0f172a !important;
          }

          .text-text-secondary,
          .text-text-tertiary {
            color: #475569 !important;
          }

          .print\:grid-cols-2,
          .sm\:grid-cols-2 {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .question-card {
            padding: 12px !important;
            margin-bottom: 10px !important;
          }

          .question-card p,
          .question-card span,
          .question-card div {
            line-height: 1.4 !important;
          }
        }
      `}} />
    </>
  );
}
