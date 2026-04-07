"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquareWarning,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DEMO_BM_COMPLAINTS } from "../demoData";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function DemoBMComplaintsPage() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all"
    ? DEMO_BM_COMPLAINTS
    : DEMO_BM_COMPLAINTS.filter((c) => {
        if (filter === "open") return c.status === "Open" || c.status === "In Review";
        if (filter === "resolved") return c.status === "Resolved" || c.status === "Closed";
        return true;
      });

  const openCount = DEMO_BM_COMPLAINTS.filter((c) => c.status === "Open" || c.status === "In Review").length;
  const resolvedCount = DEMO_BM_COMPLAINTS.filter((c) => c.status === "Resolved" || c.status === "Closed").length;

  const statusIcon = (status: string) => {
    switch (status) {
      case "Open": return <AlertCircle className="h-4 w-4 text-error" />;
      case "In Review": return <Clock className="h-4 w-4 text-warning" />;
      case "Resolved": return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "Closed": return <CheckCircle2 className="h-4 w-4 text-text-tertiary" />;
      default: return null;
    }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Complaints</h1>
          <p className="text-sm text-text-secondary mt-1">Manage complaints raised by parents</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="error">{openCount} Open</Badge>
          <Badge variant="success">{resolvedCount} Resolved</Badge>
        </div>
      </motion.div>

      {/* Filter tabs */}
      <motion.div variants={item} className="flex gap-2">
        {[
          { key: "all", label: "All" },
          { key: "open", label: "Open" },
          { key: "resolved", label: "Resolved" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-[10px] text-sm font-medium transition-colors ${
              filter === tab.key
                ? "bg-primary text-white"
                : "bg-surface border border-border-light text-text-secondary hover:text-text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* Complaint List */}
      <motion.div variants={container} className="space-y-3">
        {filtered.map((c) => (
          <motion.div key={c.id} variants={item}>
            <Card className="hover:border-primary/20 transition-colors">
              <CardContent className="p-0">
                <button
                  onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                  className="w-full p-4 flex items-start gap-4 text-left"
                >
                  <div className="mt-0.5 shrink-0">{statusIcon(c.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-semibold text-text-primary">{c.subject}</p>
                      <ChevronDown className={`w-4 h-4 text-text-tertiary shrink-0 transition-transform ${expanded === c.id ? "rotate-180" : ""}`} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-text-tertiary">
                      <span>{c.student}</span>
                      <span>·</span>
                      <span>{c.category}</span>
                      <span>·</span>
                      <span>{new Date(c.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Badge variant={c.priority === "High" ? "error" : c.priority === "Medium" ? "warning" : "default"} className="text-[10px]">
                        {c.priority}
                      </Badge>
                      <Badge
                        variant={c.status === "Open" ? "error" : c.status === "In Review" ? "warning" : c.status === "Resolved" ? "success" : "default"}
                        className="text-[10px]"
                      >
                        {c.status}
                      </Badge>
                    </div>
                  </div>
                </button>

                <AnimatePresence>
                  {expanded === c.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-0 space-y-3 border-t border-border-light">
                        <div className="pt-3">
                          <p className="text-xs font-medium text-text-secondary mb-1">Description</p>
                          <p className="text-sm text-text-primary">{c.description}</p>
                        </div>
                        {c.resolution && (
                          <div className="rounded-[10px] bg-success-light/50 border border-success/10 p-3">
                            <p className="text-xs font-medium text-success mb-1">Resolution</p>
                            <p className="text-sm text-text-primary">{c.resolution}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {filtered.length === 0 && (
        <motion.div variants={item} className="text-center py-16 text-text-tertiary">
          <MessageSquareWarning className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No complaints in this category.</p>
        </motion.div>
      )}
    </motion.div>
  );
}
