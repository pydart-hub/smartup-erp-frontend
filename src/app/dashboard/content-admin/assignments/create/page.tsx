"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ClipboardCheck, ArrowLeft, Plus, X, CheckCircle, Loader2, Calendar, Users, FileText } from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import Link from "next/link";
import { toast } from "sonner";

const CLASS_LEVELS = ["Class 8", "Class 9", "Class 10", "Class 11", "Class 12"];
const SUBJECTS = ["Mathematics", "Physics", "Chemistry", "Biology", "English", "Computer Science", "Social Science"];
const SAMPLE_BATCHES = ["10A", "10B", "10C", "11A", "11B", "12A", "12B", "9A", "9B"];

export default function CreateAssignmentPage() {
  const [form, setForm] = useState({
    title: "",
    instructions: "",
    subject: SUBJECTS[0],
    classLevel: CLASS_LEVELS[0],
    dueDate: "",
    maxMarks: "",
  });
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const toggleBatch = (batch: string) => {
    setSelectedBatches((prev) =>
      prev.includes(batch) ? prev.filter((b) => b !== batch) : [...prev, batch]
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setAttachments((prev) => [...prev, ...files]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Title is required.");
    if (!form.dueDate) return toast.error("Due date is required.");
    if (selectedBatches.length === 0) return toast.error("Select at least one batch.");

    setIsSubmitting(true);
    try {
      // TODO: Wire to Frappe API
      // await fetch("/api/content/assignment", { method: "POST", body: JSON.stringify({ ...form, batches: selectedBatches }) });
      await new Promise((r) => setTimeout(r, 1200));
      setSubmitted(true);
      toast.success("Assignment created successfully!");
    } catch {
      toast.error("Failed to create assignment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[60vh] space-y-5 text-center"
      >
        <div className="w-20 h-20 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
          <CheckCircle className="h-10 w-10 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Assignment Created!</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-sm">
          The assignment has been published to the selected batches.
        </p>
        <div className="flex gap-3">
          <Link href="/dashboard/content-admin/assignments">
            <button className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
              View All Assignments
            </button>
          </Link>
          <button
            onClick={() => {
              setSubmitted(false);
              setForm({ title: "", instructions: "", subject: SUBJECTS[0], classLevel: CLASS_LEVELS[0], dueDate: "", maxMarks: "" });
              setSelectedBatches([]);
              setAttachments([]);
            }}
            className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Create Another
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 max-w-2xl mx-auto"
    >
      <BreadcrumbNav />

      <Link href="/dashboard/content-admin/assignments" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Assignments
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6 text-blue-500" />
          Create Assignment
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Set a new assignment for a class or batch</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] p-6 shadow-sm space-y-5">

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Assignment Title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Chapter 3: Quadratic Equations — Problem Set"
            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/[0.08] text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
          />
        </div>

        {/* Subject & Class */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Subject <span className="text-red-400">*</span></label>
            <select
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/[0.08] text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Class Level <span className="text-red-400">*</span></label>
            <select
              value={form.classLevel}
              onChange={(e) => setForm({ ...form, classLevel: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/[0.08] text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              {CLASS_LEVELS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Due Date & Max Marks */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              <Calendar className="inline h-3.5 w-3.5 mr-1" />
              Due Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              min={new Date().toISOString().split("T")[0]}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/[0.08] text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Max Marks</label>
            <input
              type="number"
              value={form.maxMarks}
              onChange={(e) => setForm({ ...form, maxMarks: e.target.value })}
              placeholder="e.g. 100"
              min={1}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/[0.08] text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
        </div>

        {/* Instructions */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Instructions / Description</label>
          <textarea
            value={form.instructions}
            onChange={(e) => setForm({ ...form, instructions: e.target.value })}
            placeholder="Describe the assignment tasks, submission format, or any special instructions..."
            rows={4}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/[0.08] text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
          />
        </div>

        {/* Batch Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            <Users className="inline h-3.5 w-3.5 mr-1" />
            Assign to Batches <span className="text-red-400">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_BATCHES.map((batch) => (
              <button
                key={batch}
                type="button"
                onClick={() => toggleBatch(batch)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  selectedBatches.includes(batch)
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-slate-50 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/[0.08] hover:border-blue-300"
                }`}
              >
                {batch}
              </button>
            ))}
          </div>
          {selectedBatches.length > 0 && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
              {selectedBatches.length} batch{selectedBatches.length > 1 ? "es" : ""} selected
            </p>
          )}
        </div>

        {/* Attachments */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            <FileText className="inline h-3.5 w-3.5 mr-1" />
            Attachments (optional)
          </label>
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.png,.jpg"
            onChange={handleFileChange}
            className="w-full text-sm text-slate-500 dark:text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-600 dark:file:text-blue-400 hover:file:bg-blue-100 transition-all"
          />
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {attachments.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700/60 rounded-lg px-2.5 py-1">
                  <FileText className="h-3 w-3 text-slate-400" />
                  <span className="text-xs text-slate-600 dark:text-slate-300 max-w-[120px] truncate">{f.name}</span>
                  <button type="button" onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}>
                    <X className="h-3 w-3 text-slate-400 hover:text-red-500 transition-colors" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <motion.button
          type="submit"
          disabled={isSubmitting}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {isSubmitting ? "Creating..." : "Create Assignment"}
        </motion.button>
      </form>
    </motion.div>
  );
}
