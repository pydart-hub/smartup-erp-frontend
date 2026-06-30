import React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";

interface DatabaseErrorCardProps {
  error: unknown;
  backUrl?: string;
}

export function DatabaseErrorCard({ error, backUrl }: DatabaseErrorCardProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-4 my-8 p-4">
      {backUrl && (
        <Link
          href={backUrl}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5f2ea8] hover:text-[#4d238c] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Go Back</span>
        </Link>
      )}
      
      <div className="rounded-3xl border border-rose-200/60 bg-rose-50/50 dark:bg-rose-500/10 p-6 shadow-sm backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-rose-100 dark:bg-rose-900/30 p-2.5 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-rose-700 dark:text-rose-400">Database Connection Error</h2>
            <p className="text-xs text-text-tertiary">STANDALONE_DATABASE_URL</p>
          </div>
        </div>
        
        <p className="mt-4 text-sm text-rose-600 dark:text-rose-300 leading-relaxed">
          Could not connect to the standalone PostgreSQL database server. Please ensure the database server is running (usually on port 5432) and the `STANDALONE_DATABASE_URL` environment variable is correctly configured.
        </p>
        
        <div className="mt-4 text-xs font-mono bg-white/80 dark:bg-black/40 p-4 rounded-2xl overflow-x-auto text-rose-800 dark:text-rose-200 border border-rose-200/30">
          {error instanceof Error ? error.message : String(error)}
        </div>
      </div>
    </div>
  );
}
