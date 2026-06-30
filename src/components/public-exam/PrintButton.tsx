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
            margin: 8mm;
          }

          html,
          body {
            background: #ffffff !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .no-print,
          header,
          footer,
          .screen-review,
          .screen-history {
            display: none !important;
          }

          main {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          #print-report {
            display: block !important;
          }

          section,
          article,
          table,
          tr,
          td,
          th {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          [class*="shadow-"] {
            box-shadow: none !important;
          }

          .border,
          [class*="border-"] {
            border-color: #cbd5e1 !important;
          }

          .bg-surface,
          .bg-app-bg,
          [class*="bg-success\/"],
          [class*="bg-warning\/"],
          [class*="bg-error\/"],
          [class*="bg-primary\/"] {
            background: #ffffff !important;
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

          .hidden.print\:block {
            display: block !important;
          }
        }
      `}} />
    </>
  );
}
