"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Users,
  CheckCircle2,
  XCircle,
  Phone,
  BookOpen,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DEMO_STAFF } from "../demoData";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function DemoBMStaffPage() {
  const presentCount = DEMO_STAFF.filter((s) => s.presentToday).length;
  const absentCount  = DEMO_STAFF.length - presentCount;
  const teachers     = DEMO_STAFF.filter((s) => s.role === "Teacher");
  const nonTeachers  = DEMO_STAFF.filter((s) => s.role !== "Teacher");

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-text-primary">Staff Overview</h1>
        <p className="text-sm text-text-secondary mt-1">Today&apos;s staff status and directory</p>
      </motion.div>

      {/* Summary */}
      <motion.div variants={item} className="grid grid-cols-3 gap-3">
        <div className="bg-surface rounded-[14px] border border-border-light p-4 text-center">
          <Users className="h-5 w-5 text-info mx-auto mb-2" />
          <p className="text-2xl font-bold text-text-primary">{DEMO_STAFF.length}</p>
          <p className="text-xs text-text-secondary">Total Staff</p>
        </div>
        <div className="bg-surface rounded-[14px] border border-border-light p-4 text-center">
          <CheckCircle2 className="h-5 w-5 text-success mx-auto mb-2" />
          <p className="text-2xl font-bold text-success">{presentCount}</p>
          <p className="text-xs text-text-secondary">Present</p>
        </div>
        <div className="bg-surface rounded-[14px] border border-border-light p-4 text-center">
          <XCircle className="h-5 w-5 text-error mx-auto mb-2" />
          <p className="text-2xl font-bold text-error">{absentCount}</p>
          <p className="text-xs text-text-secondary">Absent</p>
        </div>
      </motion.div>

      {/* Teachers */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Teaching Staff
              </CardTitle>
              <Badge variant="outline" className="text-xs">{teachers.length} teachers</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {teachers.map((staff) => (
                <div key={staff.id} className="flex items-center justify-between py-3 px-3 rounded-[10px] border border-border-light bg-app-bg">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${staff.presentToday ? "bg-success/10 text-success" : "bg-error/10 text-error"}`}>
                      {staff.name.split(" ").pop()?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">{staff.name}</p>
                      <div className="flex items-center gap-2 text-[11px] text-text-tertiary">
                        <span>{staff.subject}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Phone className="h-2.5 w-2.5" />
                          {staff.phone}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge variant={staff.presentToday ? "success" : "error"} className="text-[10px]">
                    {staff.presentToday ? "Present" : "Absent"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Non-teaching staff */}
      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-info" />
                Non-Teaching Staff
              </CardTitle>
              <Badge variant="outline" className="text-xs">{nonTeachers.length} staff</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {nonTeachers.map((staff) => (
                <div key={staff.id} className="flex items-center justify-between py-3 px-3 rounded-[10px] border border-border-light bg-app-bg">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${staff.presentToday ? "bg-success/10 text-success" : "bg-error/10 text-error"}`}>
                      {staff.name.split(" ").pop()?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">{staff.name}</p>
                      <div className="flex items-center gap-2 text-[11px] text-text-tertiary">
                        <span>{staff.role}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Phone className="h-2.5 w-2.5" />
                          {staff.phone}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge variant={staff.presentToday ? "success" : "error"} className="text-[10px]">
                    {staff.presentToday ? "Present" : "Absent"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
