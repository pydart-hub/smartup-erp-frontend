"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2, ArrowLeft, UserPlus,
  User, Briefcase, Phone, IndianRupee, Building2,
} from "lucide-react";
import Link from "next/link";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  getDesignations,
  createEmployee,
} from "@/lib/api/employees";
import apiClient from "@/lib/api/client";
import { toast } from "sonner";

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const itemVariants = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

const FC = "flex h-10 w-full rounded-[10px] border border-border-input bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200";

const GENDERS = ["Male", "Female", "Other", "Prefer Not To Say"] as const;
const STATUSES = ["Active", "Inactive", "Probation"] as const;
const EMP_TYPES = ["Full-time", "Part-time", "Probation", "Contract", "Intern"] as const;

interface F {
  first_name: string; last_name: string; gender: string; dob: string;
  doj: string; company: string; designation: string;
  emp_type: string; status: string; phone: string; email: string; salary: string;
  bank_name: string; bank_ac_no: string; ifsc_code: string; bank_branch_location: string;
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span className="text-sm font-medium text-text-secondary block mb-1.5">
      {children}{required && <span className="text-error ml-0.5">*</span>}
    </span>
  );
}

export default function NewEmployeePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [f, setF] = useState<F>({
    first_name: "", last_name: "", gender: "", dob: "",
    doj: new Date().toISOString().split("T")[0],
    company: "", designation: "", emp_type: "Full-time",
    status: "Active", phone: "", email: "", salary: "",
    bank_name: "", bank_ac_no: "", ifsc_code: "", bank_branch_location: "",
  });
  const [newDesignation, setNewDesignation] = useState("");
  const [addedDesignations, setAddedDesignations] = useState<string[]>([]);
  const [addingDesignation, setAddingDesignation] = useState(false);

  const set = (k: keyof F) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF(p => ({ ...p, [k]: e.target.value }));

  const { data: companiesRes } = useQuery({
    queryKey: ["companies-list"],
    queryFn: async () => {
      const { data } = await apiClient.get(`/resource/Company?fields=["name"]&limit_page_length=50`);
      return data as { data: { name: string }[] };
    },
    staleTime: 300_000,
  });
  const { data: desigRes } = useQuery({
    queryKey: ["designations"],
    queryFn: () => getDesignations(),
    staleTime: 300_000,
  });

  const mutation = useMutation({
    mutationFn: () =>
      createEmployee({
        first_name: f.first_name.trim(),
        last_name: f.last_name.trim() || undefined,
        gender: f.gender || undefined,
        date_of_birth: f.dob || undefined,
        date_of_joining: f.doj || undefined,
        company: f.company,
        designation: f.designation || undefined,
        employment_type: f.emp_type || undefined,
        status: f.status,
        cell_number: f.phone || undefined,
        personal_email: f.email || undefined,
        custom_basic_salary: f.salary ? Number(f.salary) : undefined,
        bank_name: f.bank_name || undefined,
        bank_ac_no: f.bank_ac_no || undefined,
        ifsc_code: f.ifsc_code || undefined,
        bank_branch_location: f.bank_branch_location || undefined,
      }),
    onSuccess: (res) => {
      toast.success(`Employee created: ${res.data.employee_name}`);
      router.push(`/dashboard/hr-manager/salary/staff/${encodeURIComponent(res.data.name)}`);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { exception?: string } } })?.response?.data?.exception;
      toast.error(msg ? msg.split("\n")[0] : "Failed to create employee");
    },
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.first_name.trim()) { toast.error("First name is required"); return; }
    if (!f.gender) { toast.error("Gender is required"); return; }
    if (!f.dob) { toast.error("Date of birth is required"); return; }
    if (!f.doj) { toast.error("Date of joining is required"); return; }
    if (!f.company) { toast.error("Branch / Company is required"); return; }
    mutation.mutate();
  }

  const companies = companiesRes?.data ?? [];
  const desigs = desigRes?.data ?? [];
  const designationOptions = Array.from(
    new Set([
      ...desigs.map((d) => d.name.trim()),
      ...addedDesignations.map((d) => d.trim()),
    ].filter(Boolean))
  );

  async function createDesignationInFrappe(value: string) {
    const payloads = [
      { designation: value },
      { designation_name: value },
      { name: value, designation: value },
      { name: value, designation_name: value },
    ];

    let lastError: unknown = null;
    for (const payload of payloads) {
      try {
        await apiClient.post("/resource/Designation", payload);
        return;
      } catch (err: unknown) {
        const message = (err as { response?: { data?: { exception?: string; message?: string } } })?.response?.data;
        const errText = `${message?.exception ?? ""} ${message?.message ?? ""}`.toLowerCase();
        if (errText.includes("duplicate") || errText.includes("already exists")) {
          return;
        }
        lastError = err;
      }
    }

    throw lastError;
  }

  async function handleAddDesignation() {
    const value = newDesignation.trim();
    if (!value) {
      toast.error("Enter a designation name");
      return;
    }

    const exists = designationOptions.some((d) => d.toLowerCase() === value.toLowerCase());
    if (exists) {
      setF((prev) => ({ ...prev, designation: value }));
      setNewDesignation("");
      toast.success("Designation selected");
      return;
    }

    setAddingDesignation(true);
    try {
      // Persist to Frappe master so it appears in /app/designation list.
      await createDesignationInFrappe(value);
      setAddedDesignations((prev) => [...prev, value]);
      await queryClient.invalidateQueries({ queryKey: ["designations"] });
      setF((prev) => ({ ...prev, designation: value }));
      setNewDesignation("");
      toast.success("Designation added in Frappe");
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { exception?: string; message?: string } } })?.response?.data;
      const friendly = message?.message || message?.exception || "Failed to add designation";
      toast.error(String(friendly).split("\n")[0]);
    } finally {
      setAddingDesignation(false);
    }
  }

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
            <h1 className="text-xl font-bold text-text-primary">Add New Employee</h1>
            <p className="text-text-tertiary text-xs mt-0.5">Creates a new employee record in Frappe</p>
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
                <input type="text" value={f.first_name} onChange={set("first_name")} placeholder="e.g. Ayesha" className={FC} autoFocus />
              </div>
              <div>
                <FieldLabel>Last Name</FieldLabel>
                <input type="text" value={f.last_name} onChange={set("last_name")} placeholder="e.g. Naushad" className={FC} />
              </div>
              <div>
                <FieldLabel required>Gender</FieldLabel>
                <select value={f.gender} onChange={set("gender")} className={FC}>
                  <option value="">Select gender…</option>
                  {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel required>Date of Birth</FieldLabel>
                <input type="date" value={f.dob} onChange={set("dob")} max={new Date().toISOString().split("T")[0]} className={FC} />
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
                <FieldLabel required>Date of Joining</FieldLabel>
                <input type="date" value={f.doj} onChange={set("doj")} className={FC} />
              </div>
              <div>
                <FieldLabel required>Branch / Company</FieldLabel>
                <select value={f.company}
                  onChange={e => setF(p => ({ ...p, company: e.target.value }))}
                  className={FC}>
                  <option value="">Select company…</option>
                  {companies.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel>Designation</FieldLabel>
                <select value={f.designation} onChange={set("designation")} className={FC}>
                  <option value="">Select designation…</option>
                  {designationOptions.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={newDesignation}
                    onChange={(e) => setNewDesignation(e.target.value)}
                    placeholder="Add new designation"
                    className={FC}
                  />
                  <Button type="button" variant="outline" onClick={handleAddDesignation} className="shrink-0 px-3">
                    {addingDesignation ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                  </Button>
                </div>
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

        {/* Contact + Salary */}
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
                  <IndianRupee className="h-4 w-4 text-primary" />Salary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <FieldLabel>Basic Salary (₹ / month)</FieldLabel>
                  <input type="number" min="0" step="100" value={f.salary} onChange={set("salary")} placeholder="e.g. 20000" className={FC} />
                  <p className="text-xs text-text-tertiary mt-1.5">Can also be set after creation.</p>
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
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
              Create Employee
            </Button>
          </div>
        </motion.div>
      </form>
    </motion.div>
  );
}
