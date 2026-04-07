"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Mail,
  Phone,
  Calendar,
  MapPin,
  BookOpen,
  ClipboardCheck,
  IndianRupee,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  DEMO_CHILDREN,
  DEMO_ATTENDANCE,
  DEMO_FEES,
  formatCurrency,
  getAttendanceStats,
} from "../demoData";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function DemoChildrenPage() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-text-primary">My Children</h1>
        <p className="text-sm text-text-secondary mt-1">Detailed profile for each enrolled child</p>
      </motion.div>

      {DEMO_CHILDREN.map((child) => {
        const childAttendance = DEMO_ATTENDANCE[child.id] ?? [];
        const aStats = getAttendanceStats(childAttendance);
        const childFee = DEMO_FEES.find((f) => f.studentId === child.id);
        const childOutstanding = childFee ? childFee.totalFee - childFee.totalPaid : 0;

        return (
          <motion.div key={child.id} variants={item}>
            <Card>
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Avatar + Name */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-14 h-14 rounded-full bg-primary-light flex items-center justify-center shrink-0">
                      <GraduationCap className="h-7 w-7 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold text-text-primary">{child.name}</h3>
                        {child.isSibling && <Badge variant="default">Sibling</Badge>}
                      </div>
                      <p className="text-xs text-text-tertiary mt-0.5">{child.studentId}</p>

                      {/* Info grid */}
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4 text-sm">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-3.5 w-3.5 text-text-tertiary" />
                          <span className="text-text-secondary">Class:</span>
                          <span className="font-medium text-text-primary">{child.class}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-text-tertiary" />
                          <span className="text-text-secondary">Branch:</span>
                          <span className="font-medium text-text-primary">{child.branch.replace("Smart Up ", "")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-text-tertiary" />
                          <span className="text-text-secondary">Batch:</span>
                          <span className="font-medium text-text-primary">{child.batch}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-text-tertiary" />
                          <span className="text-text-secondary">Year:</span>
                          <span className="font-medium text-text-primary">{child.academicYear}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <IndianRupee className="h-3.5 w-3.5 text-text-tertiary" />
                          <span className="text-text-secondary">Fee Plan:</span>
                          <span className="font-medium text-text-primary">{child.feePlan}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-text-tertiary" />
                          <span className="text-text-secondary truncate">{child.email}</span>
                        </div>
                        <div className="flex items-center gap-2 col-span-2">
                          <Phone className="h-3.5 w-3.5 text-text-tertiary" />
                          <span className="text-text-secondary">{child.mobile}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick stats */}
                  <div className="flex sm:flex-col gap-3 sm:w-40 shrink-0">
                    <div className="flex-1 bg-app-bg rounded-[10px] p-3 border border-border-light text-center">
                      <ClipboardCheck className="h-4 w-4 text-success mx-auto mb-1" />
                      <p className="text-lg font-bold text-text-primary">{aStats.pct}%</p>
                      <p className="text-[10px] text-text-tertiary">Attendance</p>
                    </div>
                    <div className="flex-1 bg-app-bg rounded-[10px] p-3 border border-border-light text-center">
                      <IndianRupee className="h-4 w-4 text-info mx-auto mb-1" />
                      <p className="text-sm font-bold text-text-primary">{formatCurrency(childFee?.totalFee ?? 0)}</p>
                      <p className="text-[10px] text-text-tertiary">Total Fees</p>
                    </div>
                    <div className="flex-1 bg-app-bg rounded-[10px] p-3 border border-border-light text-center">
                      {childOutstanding > 0 ? (
                        <>
                          <p className="text-sm font-bold text-error">{formatCurrency(childOutstanding)}</p>
                          <p className="text-[10px] text-text-tertiary">Outstanding</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-bold text-success">All Clear</p>
                          <p className="text-[10px] text-text-tertiary">No Dues</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
