"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  GraduationCap,
  MapPin,
  Users,
  IndianRupee,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  FileText,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  useParentData,
  getLatestEnrollment,
  type SalesInvoiceEntry,
  type FeeEntry,
  type AttendanceRecord,
} from "../page";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function ParentChildrenPage() {
  const { user } = useAuth();
  const { data, isLoading } = useParentData(user?.email);

  const children = data?.children ?? [];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          My Children
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Detailed profiles for all enrolled children
        </p>
      </motion.div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 bg-border-light rounded-[14px] animate-pulse" />
          ))}
        </div>
      ) : children.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap className="h-12 w-12 text-text-tertiary mx-auto mb-3" />
            <p className="text-text-secondary">No children linked to your account yet.</p>
          </CardContent>
        </Card>
      ) : (
        children.map((child) => {
          const enrollment = getLatestEnrollment(data, child.name);

          const childAttendance = (data?.attendance?.[child.name] ?? []) as AttendanceRecord[];
          const present = childAttendance.filter((a) => a.status === "Present").length;
          const total = childAttendance.length;
          const pct = total > 0 ? Math.round((present / total) * 100) : 0;

          const childInvoices = (data?.salesInvoices?.[child.name] ?? []) as SalesInvoiceEntry[];
          const childFees = (data?.fees?.[child.name] ?? []) as FeeEntry[];
          const feeSource = childInvoices.length > 0 ? childInvoices : childFees;
          const totalFee = feeSource.reduce((s, f) => s + f.grand_total, 0);
          const outstanding = feeSource.reduce((s, f) => s + f.outstanding_amount, 0);

          return (
            <motion.div key={child.name} variants={item}>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-5">
                    {/* Avatar */}
                    <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center shrink-0">
                      <GraduationCap className="h-8 w-8 text-primary" />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Name + ID */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <h2 className="text-lg font-bold text-text-primary">
                          {child.student_name}
                        </h2>
                        <Badge variant="outline">{child.name}</Badge>
                      </div>

                      {/* Details grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                        <div className="flex items-start gap-2">
                          <GraduationCap className="h-4 w-4 text-text-tertiary mt-0.5" />
                          <div>
                            <p className="text-xs text-text-tertiary">Class</p>
                            <p className="text-sm font-medium text-text-primary">
                              {enrollment?.program || "—"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-text-tertiary mt-0.5" />
                          <div>
                            <p className="text-xs text-text-tertiary">Branch</p>
                            <p className="text-sm font-medium text-text-primary">
                              {child.custom_branch?.replace("Smart Up ", "") || "—"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Users className="h-4 w-4 text-text-tertiary mt-0.5" />
                          <div>
                            <p className="text-xs text-text-tertiary">Batch</p>
                            <p className="text-sm font-medium text-text-primary">
                              {enrollment?.student_batch_name || "—"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Calendar className="h-4 w-4 text-text-tertiary mt-0.5" />
                          <div>
                            <p className="text-xs text-text-tertiary">Academic Year</p>
                            <p className="text-sm font-medium text-text-primary">
                              {enrollment?.academic_year || "—"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <CreditCard className="h-4 w-4 text-text-tertiary mt-0.5" />
                          <div>
                            <p className="text-xs text-text-tertiary">Fee Plan</p>
                            <p className="text-sm font-medium text-text-primary">
                              {enrollment?.custom_plan || "—"}
                              {enrollment?.custom_no_of_instalments ? ` · ${enrollment.custom_no_of_instalments}x` : ""}
                            </p>
                          </div>
                        </div>
                        {enrollment?.custom_fee_structure && (
                          <div className="flex items-start gap-2">
                            <FileText className="h-4 w-4 text-text-tertiary mt-0.5" />
                            <div>
                              <p className="text-xs text-text-tertiary">Fee Structure</p>
                              <p className="text-sm font-medium text-text-primary">
                                {enrollment.custom_fee_structure}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Contact info */}
                      <div className="flex items-center gap-6 mt-3 text-xs text-text-secondary">
                        {child.student_email_id && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {child.student_email_id}
                          </span>
                        )}
                        {child.student_mobile_number && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {child.student_mobile_number}
                          </span>
                        )}
                      </div>

                      {/* Quick stats */}
                      <div className="flex items-center gap-4 mt-4 flex-wrap">
                        <div className="bg-app-bg rounded-[10px] px-4 py-2 border border-border-light">
                          <p className="text-xs text-text-tertiary">Attendance</p>
                          <p className={`text-sm font-bold ${pct >= 75 ? "text-success" : total > 0 ? "text-warning" : "text-text-secondary"}`}>
                            {total > 0 ? `${pct}% (${present}/${total})` : "No data"}
                          </p>
                        </div>
                        <div className="bg-app-bg rounded-[10px] px-4 py-2 border border-border-light">
                          <div className="flex items-center gap-1">
                            <IndianRupee className="h-3 w-3 text-text-tertiary" />
                            <p className="text-xs text-text-tertiary">Total Fees</p>
                          </div>
                          <p className="text-sm font-bold text-text-primary">
                            {totalFee > 0 ? formatCurrency(totalFee) : "—"}
                          </p>
                        </div>
                        <div className="bg-app-bg rounded-[10px] px-4 py-2 border border-border-light">
                          <p className="text-xs text-text-tertiary">Outstanding</p>
                          <p className={`text-sm font-bold ${outstanding > 0 ? "text-error" : totalFee > 0 ? "text-success" : "text-text-secondary"}`}>
                            {outstanding > 0 ? formatCurrency(outstanding) : totalFee > 0 ? "All Clear" : "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })
      )}
    </motion.div>
  );
}
