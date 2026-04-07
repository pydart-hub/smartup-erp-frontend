"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Search,
  Filter,
  Phone,
  User,
  Calendar,
  IndianRupee,
  ClipboardCheck,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DEMO_STUDENTS, formatCurrency } from "../demoData";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const CLASSES = ["All", "10th Grade", "9th Grade", "8th Grade", "7th Grade"];

export default function DemoBMStudentsPage() {
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("All");

  const activeStudents = DEMO_STUDENTS.filter((s) => s.enabled);
  const filtered = activeStudents.filter((s) => {
    if (classFilter !== "All" && s.class !== classFilter) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Student Directory</h1>
          <p className="text-sm text-text-secondary mt-1">{activeStudents.length} active students in your branch</p>
        </div>
        <Badge variant="default" className="self-start text-sm px-3 py-1">{filtered.length} shown</Badge>
      </motion.div>

      {/* Search + Filter */}
      <motion.div variants={item} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-[10px] border border-border-light bg-surface text-text-primary text-sm outline-none focus:border-primary placeholder:text-text-tertiary"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="pl-9 pr-4 py-2.5 rounded-[10px] border border-border-light bg-surface text-text-primary text-sm outline-none focus:border-primary"
          >
            {CLASSES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* Student Cards */}
      <motion.div variants={container} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filtered.map((student) => (
          <motion.div key={student.id} variants={item}>
            <Card className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center shrink-0">
                      <GraduationCap className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{student.name}</p>
                      <p className="text-xs text-text-tertiary">{student.id}</p>
                    </div>
                  </div>
                  <Badge variant="info" className="text-[10px] shrink-0">{student.batch}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-text-secondary">
                    <GraduationCap className="h-3 w-3" />
                    <span>{student.class}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-text-secondary">
                    <Calendar className="h-3 w-3" />
                    <span>Joined {new Date(student.joinDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-text-secondary">
                    <User className="h-3 w-3" />
                    <span>{student.guardian}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-text-secondary">
                    <Phone className="h-3 w-3" />
                    <span>{student.guardianPhone}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border-light">
                  <div className="flex items-center gap-1.5">
                    <ClipboardCheck className="h-3.5 w-3.5 text-text-tertiary" />
                    <span className={`text-xs font-medium ${student.attendancePct >= 85 ? "text-success" : student.attendancePct >= 75 ? "text-warning" : "text-error"}`}>
                      {student.attendancePct}% attendance
                    </span>
                  </div>
                  {student.outstandingFee > 0 ? (
                    <Badge variant="error" className="text-[10px]">
                      <IndianRupee className="h-2.5 w-2.5 mr-0.5" />
                      Due {formatCurrency(student.outstandingFee)}
                    </Badge>
                  ) : (
                    <Badge variant="success" className="text-[10px]">Fees Clear</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {filtered.length === 0 && (
        <motion.div variants={item} className="text-center py-16 text-text-tertiary">
          <GraduationCap className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No students match the search criteria.</p>
        </motion.div>
      )}
    </motion.div>
  );
}
