"use client";

import React, { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { createMentorFeedback, getMentorStudentDetail } from "@/lib/api/mentors";
import { MENTOR_CALL_STATUSES, MENTOR_DISCUSSION_CATEGORIES, MENTOR_FEEDBACK_PRIORITIES } from "@/lib/types/mentor";
import { updateStudent } from "@/lib/api/students";
import { getPrograms } from "@/lib/api/enrollment";
import apiClient from "@/lib/api/client";
import { toast } from "sonner";
import { 
  Edit2, Check, X, Phone, Mail, MapPin, 
  GraduationCap, Calendar, CreditCard, Sparkles, UserCheck 
} from "lucide-react";

export default function MentorStudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const studentId = decodeURIComponent(id);
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    student_type: "",
    program: "",
    custom_plan: "",
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["mentor-student-detail", studentId],
    queryFn: () => getMentorStudentDetail(studentId),
    staleTime: 30_000,
  });

  const { data: programs = [] } = useQuery({
    queryKey: ["programs"],
    queryFn: getPrograms,
    staleTime: 5 * 60_000,
    enabled: isEditing,
  });

  const [form, setForm] = useState({
    contact_person: "Parent",
    contact_number: "",
    call_status: MENTOR_CALL_STATUSES[0] as string,
    discussion_category: MENTOR_DISCUSSION_CATEGORIES[0] as string,
    academic_notes: "",
    fee_notes: "",
    contact_notes: "",
    overall_feedback: "",
    next_followup_date: "",
    priority: MENTOR_FEEDBACK_PRIORITIES[1] as string,
    action_required: false,
  });

  const feedbackMutation = useMutation({
    mutationFn: () => createMentorFeedback({
      student: studentId,
      ...form,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentor-student-detail", studentId] });
      queryClient.invalidateQueries({ queryKey: ["mentor-students"] });
      queryClient.invalidateQueries({ queryKey: ["mentor-dashboard-students"] });
      toast.success("Feedback added successfully");
      setForm({
        contact_person: "Parent",
        contact_number: "",
        call_status: MENTOR_CALL_STATUSES[0],
        discussion_category: MENTOR_DISCUSSION_CATEGORIES[0],
        academic_notes: "",
        fee_notes: "",
        contact_notes: "",
        overall_feedback: "",
        next_followup_date: "",
        priority: MENTOR_FEEDBACK_PRIORITIES[1],
        action_required: false,
      });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to add feedback");
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      student_type: string;
      program: string;
      custom_plan: string;
    }) => {
      // 1. Update Student Type on Student record
      await updateStudent(studentId, {
        custom_student_type: payload.student_type as any,
      });

      // 2. Update Program and Custom Plan on Program Enrollment if it exists
      if (data?.academic?.program_enrollment) {
        await apiClient.post("/method/frappe.client.set_value", {
          doctype: "Program Enrollment",
          name: data.academic.program_enrollment,
          fieldname: {
            program: payload.program,
            custom_plan: payload.custom_plan,
          },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentor-student-detail", studentId] });
      queryClient.invalidateQueries({ queryKey: ["mentor-students"] });
      toast.success("Student details updated successfully");
      setIsEditing(false);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || "Failed to update details";
      toast.error(msg);
    },
  });

  const primaryContact = useMemo(() => {
    if (!data) return "";
    return data.student.parent_mobile || data.student.mobile || "";
  }, [data]);

  const attendanceStats = useMemo(() => {
    const records = data?.attendance || [];
    const total = records.length;
    const present = records.filter((r) => r.status === "Present").length;
    const absent = records.filter((r) => r.status === "Absent").length;
    const late = records.filter((r) => r.status === "Late").length;
    const pct = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    return { total, present, absent, late, pct };
  }, [data]);

  const handleStartEdit = () => {
    if (!data) return;
    setEditForm({
      student_type: data.student.student_type || "",
      program: data.academic.program || "",
      custom_plan: data.fees.custom_plan || "",
    });
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    updateMutation.mutate(editForm);
  };

  if (isLoading) {
    return <div className="space-y-6"><BreadcrumbNav /><p className="text-sm text-text-secondary">Loading student details...</p></div>;
  }

  if (!data) {
    return <div className="space-y-6"><BreadcrumbNav /><p className="text-sm text-error">{(error as Error)?.message || "Failed to load student details"}</p></div>;
  }

  const getStudentTypeColor = (type?: string) => {
    switch (type?.toLowerCase()) {
      case "fresher": return "bg-purple-500/10 text-purple-600 border-purple-200/50";
      case "existing": return "bg-emerald-500/10 text-emerald-600 border-emerald-200/50";
      case "rejoining": return "bg-amber-500/10 text-amber-600 border-amber-200/50";
      case "demo": return "bg-blue-500/10 text-blue-600 border-blue-200/50";
      default: return "bg-slate-500/10 text-slate-600 border-slate-200/50";
    }
  };

  const getPlanColor = (plan?: string) => {
    switch (plan?.toLowerCase()) {
      case "advanced": return "bg-indigo-500/10 text-indigo-600 border-indigo-200/50";
      case "intermediate": return "bg-sky-500/10 text-sky-600 border-sky-200/50";
      case "basic": return "bg-teal-500/10 text-teal-600 border-teal-200/50";
      default: return "bg-slate-500/10 text-slate-600 border-slate-200/50";
    }
  };

  return (
    <div className="space-y-6">
      <BreadcrumbNav />
      
      {/* Redesigned Premium Student Details Card */}
      <div className="relative overflow-hidden rounded-2xl border border-border-light bg-gradient-to-r from-surface via-surface to-primary/5 p-6 shadow-sm transition-all duration-300 hover:shadow-md">
        <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-primary/5 blur-3xl" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-light text-xl font-bold text-white shadow-sm shadow-primary/20">
              {data.student.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-text-primary">{data.student.name}</h1>
                <Badge variant="outline" className="text-xs text-text-tertiary bg-surface/50">{data.student.id}</Badge>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {isEditing ? (
                  <div className="flex items-center gap-2 flex-wrap bg-surface/80 p-2 rounded-xl border border-border-light shadow-inner">
                    <div>
                      <label className="text-[10px] font-semibold text-text-tertiary block mb-1">Student Type</label>
                      <select 
                        className="h-8 rounded-lg border border-border-input bg-surface px-2 text-xs font-medium text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        value={editForm.student_type}
                        onChange={(e) => setEditForm(prev => ({ ...prev, student_type: e.target.value }))}
                      >
                        <option value="Fresher">Fresher</option>
                        <option value="Existing">Existing</option>
                        <option value="Rejoining">Rejoining</option>
                        <option value="Demo">Demo</option>
                        <option value="Free Access">Free Access</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-text-tertiary block mb-1">Class/Program</label>
                      <select 
                        className="h-8 rounded-lg border border-border-input bg-surface px-2 text-xs font-medium text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        value={editForm.program}
                        onChange={(e) => setEditForm(prev => ({ ...prev, program: e.target.value }))}
                      >
                        {programs.map(p => (
                          <option key={p.name} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-text-tertiary block mb-1">Plan</label>
                      <select 
                        className="h-8 rounded-lg border border-border-input bg-surface px-2 text-xs font-medium text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        value={editForm.custom_plan}
                        onChange={(e) => setEditForm(prev => ({ ...prev, custom_plan: e.target.value }))}
                      >
                        <option value="Basic">Basic</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <>
                    <Badge className={`text-xs font-medium border ${getStudentTypeColor(data.student.student_type)}`}>
                      {data.student.student_type || "No Student Type"}
                    </Badge>
                    <Badge variant="outline" className={`text-xs font-medium border ${getPlanColor(data.fees.custom_plan)}`}>
                      {data.fees.custom_plan || "No Plan"}
                    </Badge>
                    <Badge variant="outline" className="text-xs text-text-secondary bg-surface/50 border border-border-light">
                      {data.academic.program || "Class not set"}
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center">
            {isEditing ? (
              <>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setIsEditing(false)}
                  className="rounded-xl border-border-light h-9 text-xs"
                >
                  <X className="mr-1 h-3.5 w-3.5" /> Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSaveEdit} 
                  disabled={updateMutation.isPending}
                  className="rounded-xl bg-primary hover:bg-primary/90 text-white h-9 text-xs shadow-sm shadow-primary/20"
                >
                  {updateMutation.isPending ? (
                    "Saving..."
                  ) : (
                    <>
                      <Check className="mr-1 h-3.5 w-3.5" /> Save
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleStartEdit}
                className="rounded-xl border-border-light h-9 text-xs hover:bg-app-bg transition-colors"
              >
                <Edit2 className="mr-1 h-3.5 w-3.5 text-text-secondary" /> Edit Details
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="hover:shadow-sm transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Phone className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-semibold">Contact Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-3 text-sm">
            <div className="flex justify-between border-b border-border-light pb-2">
              <span className="text-text-tertiary">Parent Name</span>
              <span className="text-text-primary font-medium">{data.student.parent_name || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-border-light pb-2">
              <span className="text-text-tertiary">Parent Mobile</span>
              <span className="text-text-primary font-medium">{data.student.parent_mobile || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-border-light pb-2">
              <span className="text-text-tertiary">Student Mobile</span>
              <span className="text-text-primary font-medium">{data.student.mobile || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-border-light pb-2">
              <span className="text-text-tertiary">Email</span>
              <span className="text-text-primary font-medium">{data.student.email || "—"}</span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-text-tertiary">Address</span>
              <span className="text-text-primary font-medium text-right max-w-[220px] truncate hover:text-clip hover:whitespace-normal" title={data.student.address}>
                {data.student.address || "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-sm transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-semibold">Academic Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-3 text-sm">
            <div className="flex justify-between border-b border-border-light pb-2">
              <span className="text-text-tertiary">Program (Class)</span>
              <span className="text-text-primary font-medium">{data.academic.program || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-border-light pb-2">
              <span className="text-text-tertiary">Academic Year</span>
              <span className="text-text-primary font-medium">{data.academic.academic_year || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-border-light pb-2">
              <span className="text-text-tertiary">Batch</span>
              <span className="text-text-primary font-medium">{data.academic.batch || "—"}</span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-text-tertiary">Student Type</span>
              <span className="text-text-primary font-medium">{data.student.student_type || "—"}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-sm transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <CreditCard className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-semibold">Fee Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-3 text-sm">
            <div className="flex justify-between border-b border-border-light pb-2">
              <span className="text-text-tertiary">Plan</span>
              <span className="text-text-primary font-medium">{data.fees.custom_plan || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-border-light pb-2">
              <span className="text-text-tertiary">Fee Structure</span>
              <span className="text-text-primary font-medium truncate max-w-[200px]" title={data.fees.fee_structure}>
                {data.fees.fee_structure || "—"}
              </span>
            </div>
            <div className="flex justify-between border-b border-border-light pb-2">
              <span className="text-text-tertiary">Total Invoiced</span>
              <span className="text-text-primary font-semibold">₹{data.fees.total_invoiced.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between border-b border-border-light pb-2">
              <span className="text-text-tertiary">Outstanding</span>
              <span className="text-error font-semibold">₹{data.fees.outstanding.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-text-tertiary">Invoices Count</span>
              <span className="text-text-primary font-medium">{data.fees.invoice_count}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-sm transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <UserCheck className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-semibold">Guardians</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-3 text-sm">
            {data.guardians.length === 0 ? (
              <p className="text-text-secondary italic">No guardian details found.</p>
            ) : (
              data.guardians.map((row, index) => (
                <div key={`${row.guardian || row.guardian_name || index}`} className="rounded-xl border border-border-light bg-app-bg/30 p-3 hover:border-primary/20 transition-colors duration-200">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-text-primary">{row.guardian_name || "Guardian"}</p>
                    <Badge variant="outline" className="text-[10px] py-0.5 px-2 bg-surface">{row.relation || "Relation"}</Badge>
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-text-secondary">
                    {row.mobile_number && (
                      <div className="flex items-center gap-1"><Phone className="h-3 w-3 text-text-tertiary" /> {row.mobile_number}</div>
                    )}
                    {row.email_address && (
                      <div className="flex items-center gap-1"><Mail className="h-3 w-3 text-text-tertiary" /> {row.email_address}</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Redesigned Academics & Attendance Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Exams Results */}
        <Card className="hover:shadow-sm transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-semibold">Academic Exam Results</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            {!data.exams || data.exams.length === 0 ? (
              <p className="text-sm text-text-secondary italic py-4 text-center">No exam results recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border-light text-text-secondary">
                      <th className="pb-2 font-semibold">Subject</th>
                      <th className="pb-2 font-semibold">Exam Type</th>
                      <th className="pb-2 font-semibold text-center">Score</th>
                      <th className="pb-2 font-semibold text-center">Grade</th>
                      <th className="pb-2 font-semibold text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.exams.map((exam, i) => {
                      const scorePct = exam.maximum_score > 0 ? Math.round((exam.total_score / exam.maximum_score) * 100) : 0;
                      return (
                        <tr key={exam.name || i} className="border-b border-border-light/50 last:border-0">
                          <td className="py-2.5 font-medium text-text-primary">{exam.course}</td>
                          <td className="py-2.5 text-text-secondary">{exam.assessment_group}</td>
                          <td className="py-2.5 text-center">
                            <span className="font-semibold text-text-primary">{exam.total_score}</span>
                            <span className="text-text-tertiary"> / {exam.maximum_score}</span>
                            <span className="text-[10px] text-text-tertiary block font-mono">{scorePct}%</span>
                          </td>
                          <td className="py-2.5 text-center">
                            <Badge variant="outline" className={`font-semibold text-[10px] ${
                              scorePct >= 75
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-200/50"
                                : scorePct >= 50
                                ? "bg-amber-500/10 text-amber-600 border-amber-200/50"
                                : "bg-rose-500/10 text-rose-600 border-rose-200/50"
                            }`}>
                              {exam.grade || "—"}
                            </Badge>
                          </td>
                          <td className="py-2.5 text-right text-text-tertiary font-mono">{exam.schedule_date || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance Tracker */}
        <Card className="hover:shadow-sm transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Calendar className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-semibold">Attendance & Absent Days</CardTitle>
          </CardHeader>
          <CardContent className="pt-3 space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center bg-app-bg/40 p-3 rounded-xl border border-border-light">
              <div>
                <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Attendance Rate</p>
                <p className={`text-xl font-bold mt-1 ${
                  attendanceStats.pct >= 85
                    ? "text-emerald-600"
                    : attendanceStats.pct >= 75
                    ? "text-amber-600"
                    : "text-rose-600"
                }`}>{attendanceStats.pct}%</p>
              </div>
              <div className="border-x border-border-light">
                <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Present Days</p>
                <p className="text-xl font-bold text-text-primary mt-1">{attendanceStats.present + attendanceStats.late} <span className="text-xs text-text-tertiary font-normal">/ {attendanceStats.total}</span></p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">Absent Days</p>
                <p className={`text-xl font-bold mt-1 ${attendanceStats.absent > 0 ? "text-rose-600" : "text-text-secondary"}`}>{attendanceStats.absent}</p>
              </div>
            </div>

            {/* List of Absent Days */}
            <div>
              <p className="text-xs font-semibold text-text-secondary mb-2">Absent History</p>
              {data.attendance?.filter(r => r.status === "Absent").length === 0 ? (
                <p className="text-xs text-text-tertiary italic bg-emerald-500/5 text-emerald-600 border border-emerald-100/30 p-2.5 rounded-lg text-center">
                  Perfect attendance record! No absent days.
                </p>
              ) : (
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 font-sans">
                  {data.attendance?.filter(r => r.status === "Absent").map((row, i) => (
                    <div key={row.name || i} className="flex justify-between items-center text-xs p-2 rounded-lg border border-rose-100/30 bg-rose-500/5">
                      <span className="font-medium text-text-primary font-mono">{row.date}</span>
                      <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-200/50 text-[10px] py-0 px-2 font-semibold">Absent</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Attendance Logs */}
            {data.attendance && data.attendance.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-text-secondary mb-2">Recent Attendance Logs</p>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1 text-xs font-sans">
                  {data.attendance.slice(0, 5).map((row, i) => (
                    <div key={row.name || i} className="flex justify-between items-center py-1.5 border-b border-border-light/50 last:border-0">
                      <span className="text-text-secondary font-mono">{row.date}</span>
                      <span className={`font-semibold ${
                        row.status === "Present" ? "text-emerald-600" : row.status === "Late" ? "text-amber-600" : "text-rose-600"
                      }`}>{row.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Add Mentor Feedback</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-text-secondary">Contact Person</label>
              <select className="mt-1 h-10 w-full rounded-[10px] border border-border-input bg-surface px-3 text-sm" value={form.contact_person} onChange={(e) => setForm((prev) => ({ ...prev, contact_person: e.target.value }))}>
                <option>Parent</option>
                <option>Student</option>
                <option>Guardian</option>
                <option>Other</option>
              </select>
            </div>
            <Input label="Contact Number" value={form.contact_number || primaryContact} onChange={(e) => setForm((prev) => ({ ...prev, contact_number: e.target.value }))} />
            <div>
              <label className="text-sm font-medium text-text-secondary">Call Status</label>
              <select className="mt-1 h-10 w-full rounded-[10px] border border-border-input bg-surface px-3 text-sm" value={form.call_status} onChange={(e) => setForm((prev) => ({ ...prev, call_status: e.target.value }))}>
                {MENTOR_CALL_STATUSES.map((row) => <option key={row}>{row}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary">Discussion Category</label>
              <select className="mt-1 h-10 w-full rounded-[10px] border border-border-input bg-surface px-3 text-sm" value={form.discussion_category} onChange={(e) => setForm((prev) => ({ ...prev, discussion_category: e.target.value }))}>
                {MENTOR_DISCUSSION_CATEGORIES.map((row) => <option key={row}>{row}</option>)}
              </select>
            </div>
            <Input label="Next Follow-Up Date" type="date" value={form.next_followup_date} onChange={(e) => setForm((prev) => ({ ...prev, next_followup_date: e.target.value }))} />
            <div>
              <label className="text-sm font-medium text-text-secondary">Priority</label>
              <select className="mt-1 h-10 w-full rounded-[10px] border border-border-input bg-surface px-3 text-sm" value={form.priority} onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}>
                {MENTOR_FEEDBACK_PRIORITIES.map((row) => <option key={row}>{row}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-text-secondary">Academic Notes</label>
              <textarea className="mt-1 min-h-28 w-full rounded-[10px] border border-border-input bg-surface px-3 py-2 text-sm" value={form.academic_notes} onChange={(e) => setForm((prev) => ({ ...prev, academic_notes: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary">Fee Notes</label>
              <textarea className="mt-1 min-h-28 w-full rounded-[10px] border border-border-input bg-surface px-3 py-2 text-sm" value={form.fee_notes} onChange={(e) => setForm((prev) => ({ ...prev, fee_notes: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary">Contact Notes</label>
              <textarea className="mt-1 min-h-28 w-full rounded-[10px] border border-border-input bg-surface px-3 py-2 text-sm" value={form.contact_notes} onChange={(e) => setForm((prev) => ({ ...prev, contact_notes: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-text-secondary">Overall Feedback</label>
            <textarea className="mt-1 min-h-32 w-full rounded-[10px] border border-border-input bg-surface px-3 py-2 text-sm" value={form.overall_feedback} onChange={(e) => setForm((prev) => ({ ...prev, overall_feedback: e.target.value }))} />
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-text-secondary">
            <input type="checkbox" checked={form.action_required} onChange={(e) => setForm((prev) => ({ ...prev, action_required: e.target.checked }))} />
            Action required
          </label>
          <Button onClick={() => feedbackMutation.mutate()} disabled={feedbackMutation.isPending}>
            {feedbackMutation.isPending ? "Saving..." : "Save Feedback"}
          </Button>
          {feedbackMutation.isError ? (
            <p className="text-sm text-error">{(feedbackMutation.error as Error)?.message || "Failed to save feedback"}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Feedback Timeline</CardTitle></CardHeader>
        <CardContent>
          {data.feedback.length === 0 ? (
            <p className="text-sm text-text-secondary">No mentor feedback has been recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {data.feedback.map((row) => (
                <div key={row.name} className="rounded-xl border border-border-light p-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{row.discussion_category}</Badge>
                    <Badge variant="default">{row.call_status}</Badge>
                    {row.action_required ? <Badge variant="warning">Action Required</Badge> : null}
                  </div>
                  <p className="text-xs text-text-tertiary mt-2">{row.call_datetime?.replace("T", " ").slice(0, 16)}</p>
                  {row.overall_feedback ? <p className="text-sm text-text-secondary mt-2 whitespace-pre-wrap">{row.overall_feedback}</p> : null}
                  {row.next_followup_date ? <p className="text-xs text-primary mt-2">Next follow-up: {row.next_followup_date}</p> : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

