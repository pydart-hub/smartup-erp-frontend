"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2, ArrowLeft, AlertCircle, Save,
  IndianRupee, User, Building2, Briefcase, Landmark,
} from "lucide-react";
import Link from "next/link";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { getEmployeeDoc, updateEmployeeBasicSalary } from "@/lib/api/employees";
import { formatCurrency } from "@/lib/utils/formatters";
import { toast } from "sonner";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function EditEmployeeSalaryPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const employeeId = decodeURIComponent(params.id as string);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["hr-employee-doc", employeeId],
    queryFn: () => getEmployeeDoc(employeeId),
    staleTime: 30_000,
  });

  const employee = data?.data;

  const [basicSalary, setBasicSalary] = useState("");

  useEffect(() => {
    if (employee) {
      setBasicSalary(String(employee.custom_basic_salary ?? ""));
    }
  }, [employee]);

  const mutation = useMutation({
    mutationFn: () => updateEmployeeBasicSalary(employeeId, Number(basicSalary)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-employee-list"] });
      queryClient.invalidateQueries({ queryKey: ["hr-employee-doc", employeeId] });
      queryClient.invalidateQueries({ queryKey: ["hr-salary-staff"] });
      toast.success("Basic salary updated");
      router.push("/dashboard/hr-manager/salary/staff");
    },
    onError: () => toast.error("Failed to update salary"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const val = Number(basicSalary);
    if (!basicSalary || isNaN(val) || val <= 0) {
      toast.error("Enter a valid salary amount");
      return;
    }
    mutation.mutate();
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-text-tertiary">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading employee...</span>
      </div>
    );
  }

  if (isError || !employee) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-error">
        <AlertCircle className="h-5 w-5" />
        <span>Employee not found</span>
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <BreadcrumbNav />

      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/hr-manager/salary/staff">
            <button className="p-2 rounded-lg hover:bg-surface-secondary transition-colors">
              <ArrowLeft className="h-4 w-4 text-text-secondary" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-text-primary">{employee.employee_name}</h1>
              <Badge variant={employee.status === "Active" ? "success" : "outline"}>
                {employee.status}
              </Badge>
            </div>
            <p className="text-text-secondary text-sm mt-0.5">
              {employee.company?.replace("Smart Up ", "") || "Head Office"}
              {employee.designation ? ` · ${employee.designation}` : ""}
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-primary" />
                Employee Details
                <span className="ml-auto text-xs font-normal text-text-tertiary">(read-only)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {([
                { label: "Name", value: employee.employee_name },
                { label: "Branch", value: employee.company?.replace("Smart Up ", "") || "Head Office" },
                { label: "Designation", value: employee.designation || "\u2014" },
                { label: "Department", value: employee.department || "\u2014" },
                { label: "Employee ID", value: employee.name },
              ] as { label: string; value: string }[]).map(({ label, value }) => (
                <div key={label} className="flex items-center gap-3 text-sm">
                  <span className="text-text-tertiary w-28 flex-shrink-0">{label}</span>
                  <span className="text-text-primary font-medium truncate">{value}</span>
                </div>
              ))}
              {/* Payable Account */}
              <div className="flex items-start gap-3 text-sm pt-1 border-t border-border-primary mt-1">
                <span className="text-text-tertiary w-28 flex-shrink-0 pt-0.5">Payable A/C</span>
                {employee.custom_payable_account ? (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Landmark className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    <span className="text-text-primary font-medium font-mono text-xs">
                      {employee.custom_payable_account}
                    </span>
                  </div>
                ) : (
                  <span className="text-text-tertiary italic text-xs">
                    Created automatically on first payroll run
                  </span>
                )}
              </div>            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <IndianRupee className="h-4 w-4 text-primary" />
                Basic Salary for Payroll
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    Basic Salary (\u20b9 / month) <span className="text-error">*</span>
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="100"
                    placeholder="e.g. 25000"
                    value={basicSalary}
                    onChange={(e) => setBasicSalary(e.target.value)}
                    autoFocus
                  />
                  {employee.custom_basic_salary ? (
                    <p className="text-xs text-text-tertiary mt-1.5">
                      Current: {formatCurrency(employee.custom_basic_salary)} / month
                    </p>
                  ) : (
                    <p className="text-xs text-warning mt-1.5">
                      No salary set yet. This employee will be skipped in payroll until a salary is set.
                    </p>
                  )}
                </div>

                <p className="text-xs text-text-tertiary bg-surface-secondary rounded-lg p-3">
                  This updates the base salary used in payroll calculations.
                  LOP deductions are applied on top during monthly processing.
                </p>

                <div className="flex gap-3 pt-1">
                  <Link href="/dashboard/hr-manager/salary/staff" className="flex-1">
                    <Button type="button" variant="outline" className="w-full">
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" className="flex-1" disabled={mutation.isPending}>
                    {mutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Salary
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
