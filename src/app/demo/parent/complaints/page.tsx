"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquareWarning,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DEMO_COMPLAINTS, type DemoComplaint } from "../demoData";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

function StatusBadge({ status }: { status: DemoComplaint["status"] }) {
  const map: Record<DemoComplaint["status"], { variant: "warning" | "info" | "success" | "outline"; icon: React.ReactNode }> = {
    Open: { variant: "warning", icon: <AlertCircle className="h-3 w-3" /> },
    "In Review": { variant: "info", icon: <Search className="h-3 w-3" /> },
    Resolved: { variant: "success", icon: <CheckCircle2 className="h-3 w-3" /> },
    Closed: { variant: "outline", icon: <Clock className="h-3 w-3" /> },
  };
  const { variant, icon } = map[status];
  return (
    <Badge variant={variant} className="flex items-center gap-1">
      {icon}
      {status}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: DemoComplaint["priority"] }) {
  const variant = priority === "High" ? "error" : priority === "Medium" ? "warning" : "outline";
  return <Badge variant={variant}>{priority}</Badge>;
}

export default function DemoComplaintsPage() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Complaints & Suggestions</h1>
          <p className="text-sm text-text-secondary mt-1">File and track complaints or suggestions</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-[10px] bg-primary text-white text-sm font-medium px-4 py-2.5 hover:bg-primary/90 transition-colors"
        >
          <MessageSquareWarning className="h-4 w-4" />
          {showForm ? "Cancel" : "New Complaint"}
        </button>
      </motion.div>

      {/* New Complaint Form (Demo — not functional) */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-text-primary">Child</label>
                    <select className="w-full rounded-[10px] border border-border-light bg-surface text-text-primary text-sm px-3 py-2.5 outline-none focus:border-primary">
                      <option>Akhil Kumar</option>
                      <option>Sneha Kumar</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-text-primary">Category</label>
                    <select className="w-full rounded-[10px] border border-border-light bg-surface text-text-primary text-sm px-3 py-2.5 outline-none focus:border-primary">
                      <option>Academic</option>
                      <option>Fee Related</option>
                      <option>Facility</option>
                      <option>Staff</option>
                      <option>Transport</option>
                      <option>Food</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">Subject</label>
                  <input
                    type="text"
                    placeholder="Brief subject of your complaint..."
                    className="w-full rounded-[10px] border border-border-light bg-surface text-text-primary text-sm px-3 py-2.5 outline-none focus:border-primary placeholder:text-text-tertiary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">Description</label>
                  <textarea
                    rows={4}
                    placeholder="Describe your complaint or suggestion in detail..."
                    className="w-full rounded-[10px] border border-border-light bg-surface text-text-primary text-sm px-3 py-2.5 outline-none focus:border-primary placeholder:text-text-tertiary resize-none"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowForm(false)}
                    className="rounded-[10px] bg-primary text-white text-sm font-medium px-5 py-2.5 hover:bg-primary/90 transition-colors"
                  >
                    Submit (Demo)
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Complaints List */}
      {DEMO_COMPLAINTS.map((complaint) => (
        <motion.div key={complaint.id} variants={item}>
          <Card>
            <CardContent className="p-0">
              {/* Header — always visible */}
              <button
                onClick={() => setExpanded(expanded === complaint.id ? null : complaint.id)}
                className="w-full text-left p-5 flex items-start gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-sm font-semibold text-text-primary">{complaint.subject}</h3>
                    <StatusBadge status={complaint.status} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-tertiary">
                    <span>{complaint.studentName}</span>
                    <span>•</span>
                    <PriorityBadge priority={complaint.priority} />
                    <span>•</span>
                    <span>{complaint.category}</span>
                    <span>•</span>
                    <span>{new Date(complaint.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                  </div>
                </div>
                {expanded === complaint.id ? (
                  <ChevronUp className="h-5 w-5 text-text-tertiary shrink-0" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-text-tertiary shrink-0" />
                )}
              </button>

              {/* Expanded details */}
              <AnimatePresence>
                {expanded === complaint.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 pt-0 border-t border-border-light">
                      <div className="mt-4 space-y-3">
                        <div>
                          <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-1">Description</p>
                          <p className="text-sm text-text-secondary">{complaint.description}</p>
                        </div>
                        {complaint.resolutionNotes && (
                          <div className="rounded-[10px] bg-success-light/50 border border-success/10 p-3">
                            <p className="text-xs font-medium text-success mb-1">Resolution</p>
                            <p className="text-sm text-text-secondary">{complaint.resolutionNotes}</p>
                            {complaint.resolvedBy && (
                              <p className="text-xs text-text-tertiary mt-1.5">Resolved by: {complaint.resolvedBy}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}
