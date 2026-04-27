"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2, ArrowLeft, Save, AlertCircle,
  User, Briefcase, Phone, IndianRupee, Landmark, Building2,
} from "lucide-react";
import Link from "next/link";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  getEmployeeDoc,
  getDepartments,
  getDesignations,
  updateEmployee,
} from "@/lib/api/employees";
import apiClient from "@/lib/api/client";
import { toast } from "sonner";

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const itemVariants = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

const FC = "flex h-10 w-full rounded-[10px] border border-border-input bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200";

const GENDERS = ["Male", "Female", "Other", "Prefer Not To Say"] as const;
const STATUSES = ["Active", "Inactive", "Left", "Suspended"] as const;
const EMP_TYPES = ["Full-time", "Part-time", "Probation", "Contract", "Intern"] as const;

interface F {
  first_name: string; last_name: string; gender: string; dob: string;
  doj: string; company: string; department: string; designation: string;
  emp_type: string; status: string; phone: string; email: string; salary: string;
  // Bank Details
  bank_name: string; bank_ac_no: string; ifsc_code: string; bank_branch_location: string;
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span className="text-sm font-medium text-text-secondary block mb-1.5">
      {children}{required && <span className="text-error ml-0.5">*</span>}
    </span>
  );
}

export default function EditEmployeePage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const id = decodeURIComponent(params.id as string);

  const [f, setF] = useState<F>({
    first_name: "", last_name: "", gender: "", dob: "", doj: "",
    company: "", department: "", designation: "", emp_type: "",
    status: "Active", phone: "", email: "", salary: "",
    bank_name: "", bank_ac_no: "", ifsc_code: "", bank_branch_location: "",
  });

  const set = (k: keyof F) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF(p => ({ ...p, [k]: e.target.value }));

  const { data: empData, isLoading, isError } = useQuery({
    queryKey: ["hr-employee-doc", id],
    queryFn: () => getEmployeeDoc(id),
    staleTime: 30_000,
  });
  const emp = empData?.data;

  useEffect(() => {
    if (!emp) return;
    setF({
      first_name: emp.first_name ?? "",
      last_name: emp.last_name ?? "",
      gender: emp.gender ?? "",
      dob: emp.date_of_birth ?? "",
      doj: emp.date_of_joining ?? "",
      company: emp.company ?? "",
      department: emp.department ?? "",
      designation: emp.designation ?? "",
      emp_type: emp.employment_type ?? "",
      status: emp.status ?? "Active",
      phone: emp.cell_number ?? "",
      email: emp.personal_email ?? "",
      salary: emp.custom_basic_salary ? String(emp.custom_basic_salary) : "",
      bank_name: emp.bank_name ?? "",
      bank_ac_no: emp.bank_ac_no ?? "",
      ifsc_code: emp.ifsc_code ?? "",
      bank_branch_location: emp.bank_branch_location ?? "",
    });
  }, [emp]);

  const { data: companiesRes } = useQuery({
    queryKey: ["companies-list"],
    queryFn: async () => {
      const { data } = await apiClient.get(`/resource/Company?fields=["name"]&limit_page_length=50`);
      return data as { data: { name: string }[] };
    },
    staleTime: 300_000,
  });
  const { data: deptRes } = useQuery({
    queryKey: ["departments", f.company],
    queryFn: () => getDepartments(f.company || undefined),
    staleTime: 120_000,
  });
  const { data: desigRes } = useQuery({
    queryKey: ["designations"],
    queryFn: () => getDesignations(),
    staleTime: 300_000,
  });

  const mutation = useMutation({
    mutationFn: () =>
      updateEmployee(id, {
        first_name: f.first_name || undefined,
        last_name: f.last_name || undefined,
        gender: f.gender || undefined,
        date_of_birth: f.dob || undefined,
        date_of_joining: f.doj || undefined,
        company: f.company || undefined,
        department: f.department || undefined,
        designation: f.designation || undefined,
        employment_type: f.emp_type || undefined,
        status: f.status || undefined,
        cell_number: f.phone || undefined,
        personal_email: f.email || undefined,
        custom_basic_salary: f.salary ? Number(f.salary) : undefined,
        bank_name: f.bank_name || undefined,
        bank_ac_no: f.bank_ac_no || undefined,
        ifsc_code: f.ifsc_code || undefined,
        bank_branch_location: f.bank_branch_location || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-employee-doc", id] });
      queryClient.invalidateQueries({ queryKey: ["hr-employee-list"] });
      queryClient.invalidateQueries({ queryKey: ["hr-employee-payable-map"] });
      toast.success("Employee updated successfully");
    },
    onError: () => toast.error("Failed to update employee"),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.first_name.trim()) { toast.error("First name is required"); return; }
    if (!f.company) { toast.error("Branch / Company is required"); return; }
    mutation.mutate();
  }

  if (isLoading) return (
    <div className="flex items-center justify-center py-24 gap-2 text-text-tertiary">
      <Loader2 className="h-5 w-5 animate-spin" /><span>Loading employee…</span>
    </div>
  );
  if (isError || !emp) return (
    <div className="flex items-center justify-center py-24 gap-2 text-error">
      <AlertCircle className="h-5 w-5" /><span>Employee not found</span>
    </div>
  );

  const companies = companiesRes?.data ?? [];
  const depts = deptRes?.data ?? [];
  const desigs = desigRes?.data ?? [];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-5">
      <BreadcrumbNav />

      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/hr-manager/salary/staff">
            <button className="p-1.5 rounded-lg hover:bg-surface-secondary transition-colors">
              <ArrowLeft className="h-4 w-4 text-text-secondary" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-text-primary">{emp.employee_name}</h1>
              <Badge variant={emp.status === "Active" ? "success" : "outline"}>{emp.status}</Badge>
            </div>
            <p className="text-text-tertiary text-xs mt-0.5">{id}</p>
          </div>
        </div>
      </motion.div>

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Personal Information */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-primary" />Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel required>First Name</FieldLabel>
                <input type="text" value={f.first_name} onChange={set("first_name")} placeholder="First name" className={FC} />
              </div>
              <div>
                <FieldLabel>Last Name</FieldLabel>
                <input type="text" value={f.last_name} onChange={set("last_name")} placeholder="Last name" className={FC} />
              </div>
              <div>
                <FieldLabel>Gender</FieldLabel>
                <select value={f.gender} onChange={set("gender")} className={FC}>
                  <option value="">Select gender…</option>
                  {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel>Date of Birth</FieldLabel>
                <input type="date" value={f.dob} onChange={set("dob")} className={FC} />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Employment Details */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Briefcase className="h-4 w-4 text-primary" />Employment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel>Date of Joining</FieldLabel>
                <input type="date" value={f.doj} onChange={set("doj")} className={FC} />
              </div>
              <div>
                <FieldLabel required>Branch / Company</FieldLabel>
                <select value={f.company}
                  onChange={e => setF(p => ({ ...p, company: e.target.value, department: "" }))}
                  className={FC}>
                  <option value="">Select company…</option>
                  {companies.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel>Department</FieldLabel>
                <select value={f.department} onChange={set("department")} className={FC}>
                  <option value="">Select department…</option>
                  {depts.map(d => (
                    <option key={d.name} value={d.name}>
                      {d.name.replace(/\s*-\s*Smart Up.*$/i, "")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>Designation</FieldLabel>
                <select value={f.designation} onChange={set("designation")} className={FC}>
                  <option value="">Select designation…</option>
                  {desigs.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel>Employment Type</FieldLabel>
                <select value={f.emp_type} onChange={set("emp_type")} className={FC}>
                  <option value="">Select type…</option>
                  {EMP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel required>Status</FieldLabel>
                <select value={f.status} onChange={set("status")} className={FC}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Contact + Salary side by side */}
        <motion.div variants={itemVariants}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-primary" />Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <FieldLabel>Mobile Number</FieldLabel>
                  <input type="tel" value={f.phone} onChange={set("phone")} placeholder="e.g. 9876543210" className={FC} />
                </div>
                <div>
                  <FieldLabel>Personal Email</FieldLabel>
                  <input type="email" value={f.email} onChange={set("email")} placeholder="email@example.com" className={FC} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <IndianRupee className="h-4 w-4 text-primary" />Salary & Payroll
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <FieldLabel>Basic Salary (₹ / month)</FieldLabel>
                  <input type="number" min="0" step="100" value={f.salary} onChange={set("salary")} placeholder="e.g. 25000" className={FC} />
                </div>
                <div>
                  <FieldLabel>Payable Account</FieldLabel>
                  <div className="flex h-10 items-center gap-2 px-3 rounded-[10px] border border-border-input bg-surface-secondary/60">
                    <Landmark className="h-3.5 w-3.5 text-text-tertiary flex-shrink-0" />
                    <span className="text-xs text-text-secondary truncate">
                      {emp.custom_payable_account || "Set automatically on first payroll run"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Bank Details */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-primary" />Bank Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel>Account Number</FieldLabel>
                <input type="text" value={f.bank_ac_no} onChange={set("bank_ac_no")} placeholder="e.g. 1234567890" className={FC} />
              </div>
              <div>
                <FieldLabel>Bank Name</FieldLabel>
                <input type="text" value={f.bank_name} onChange={set("bank_name")} placeholder="e.g. State Bank of India" className={FC} />
              </div>
              <div>
                <FieldLabel>IFSC Code</FieldLabel>
                <input
                  type="text"
                  value={f.ifsc_code}
                  onChange={e => setF(p => ({ ...p, ifsc_code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. SBIN0001234"
                  maxLength={11}
                  className={FC}
                />
              </div>
              <div>
                <FieldLabel>Branch Location</FieldLabel>
                <input type="text" value={f.bank_branch_location} onChange={set("bank_branch_location")} placeholder="e.g. Kozhikode Main Branch" className={FC} />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Actions */}
        <motion.div variants={itemVariants}>
          <div className="flex gap-3">
            <Link href="/dashboard/hr-manager/salary/staff">
              <Button type="button" variant="outline" className="px-8">Cancel</Button>
            </Link>
            <Button type="submit" className="px-8" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </motion.div>
      </form>
    </motion.div>
  );
}

