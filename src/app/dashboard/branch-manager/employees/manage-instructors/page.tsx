"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Users,
  UserCheck,
  UserPlus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Shield,
  ShieldOff,
  RefreshCw,
  Building2,
  GraduationCap,
  Lock,
  Ban,
} from "lucide-react";
import axios from "axios";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { useAuth } from "@/lib/hooks/useAuth";
import { toast } from "sonner";

// ── Types ──

interface MissingEmployee {
  name: string;
  employee_name: string;
  company: string;
  user_id?: string;
}

interface StatusResponse {
  total_employees: number;
  total_instructors: number;
  employees_without_instructor: number;
  missing_employees: MissingEmployee[];
}

interface AssignResult {
  employee: string;
  employee_name: string;
  status: "created" | "already_exists" | "role_added" | "error";
  instructor_name?: string;
  message?: string;
}

interface AssignResponse {
  message: string;
  results: AssignResult[];
  summary: {
    total: number;
    created: number;
    already_exists: number;
    role_added: number;
    errors: number;
  };
}

// ── Accounts Permission Types ──

interface AccountsUser {
  user: string;
  full_name: string;
  employee: string;
  accounts_roles: string[];
  accounts_blocked: boolean;
}

interface AccountsStatusResponse {
  total_instructor_users: number;
  users_with_accounts_access: number;
  users_with_accounts_roles: number;
  users_without_module_block: number;
  users: AccountsUser[];
  scoped_company: string | null;
}

interface AccountsRemoveResult {
  user: string;
  full_name: string;
  roles_removed: string[];
  module_blocked: boolean;
  status: "updated" | "already_clean" | "error";
  message?: string;
}

interface AccountsRemoveResponse {
  message: string;
  results: AccountsRemoveResult[];
  summary: {
    total: number;
    updated: number;
    already_clean: number;
    errors: number;
    roles_removed: number;
    modules_blocked: number;
  };
}

// ── Animations ──

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function ManageInstructorsPage() {
  const { defaultCompany } = useAuth();
  const [assignResults, setAssignResults] = useState<AssignResponse | null>(null);
  const [accountsResults, setAccountsResults] = useState<AccountsRemoveResponse | null>(null);

  // ── Fetch current status — always scoped to branch manager's company ──
  const {
    data: status,
    isLoading: statusLoading,
    error: statusError,
    refetch: refetchStatus,
  } = useQuery<StatusResponse>({
    queryKey: ["instructor-assignment-status", defaultCompany],
    queryFn: async () => {
      const params = defaultCompany ? `?company=${encodeURIComponent(defaultCompany)}` : "";
      const { data } = await axios.get(`/api/admin/assign-instructor-role${params}`);
      return data;
    },
    staleTime: 30_000,
    enabled: !!defaultCompany,
  });

  // ── Assign mutation — always scoped to branch manager's company ──
  const assignMutation = useMutation<AssignResponse, Error, string | undefined>({
    mutationFn: async (company?: string) => {
      const { data } = await axios.post("/api/admin/assign-instructor-role", {
        company: company || defaultCompany,
      });
      return data;
    },
    onSuccess: (data) => {
      setAssignResults(data);
      toast.success(data.message);
      refetchStatus();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to assign instructor roles");
    },
  });

  // ── Accounts Permission Status ──
  const {
    data: accountsStatus,
    isLoading: accountsLoading,
    refetch: refetchAccounts,
  } = useQuery<AccountsStatusResponse>({
    queryKey: ["accounts-permission-status", defaultCompany],
    queryFn: async () => {
      const params = defaultCompany ? `?company=${encodeURIComponent(defaultCompany)}` : "";
      const { data } = await axios.get(`/api/admin/remove-accounts-permission${params}`);
      return data;
    },
    staleTime: 30_000,
    enabled: !!defaultCompany,
  });

  // ── Remove Accounts Permission Mutation ──
  const removeAccountsMutation = useMutation<AccountsRemoveResponse, Error, void>({
    mutationFn: async () => {
      const { data } = await axios.post("/api/admin/remove-accounts-permission", {
        company: defaultCompany,
      });
      return data;
    },
    onSuccess: (data) => {
      setAccountsResults(data);
      toast.success(data.message);
      refetchAccounts();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to remove accounts permissions");
    },
  });

  const missing = status?.missing_employees ?? [];
  const hasMissing = missing.length > 0;

  // Group missing employees by company
  const groupedByCompany = missing.reduce(
    (acc, emp) => {
      const key = emp.company || "Unassigned";
      if (!acc[key]) acc[key] = [];
      acc[key].push(emp);
      return acc;
    },
    {} as Record<string, MissingEmployee[]>
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <BreadcrumbNav />

      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Manage Instructor Roles
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Assign the Instructor role to employees in{" "}
            <strong>{defaultCompany || "your branch"}</strong>. This creates an Instructor doc in Frappe
            and adds the &ldquo;Instructor&rdquo; role to their user account.
          </p>
        </div>
        <Button
          variant="outline"
          size="md"
          onClick={() => refetchStatus()}
          disabled={statusLoading}
        >
          <RefreshCw className={`h-4 w-4 ${statusLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </motion.div>

      {/* Status Cards */}
      {statusLoading && (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="animate-spin h-6 w-6 text-primary" />
        </div>
      )}

      {statusError && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardContent className="py-8 text-center">
              <AlertCircle className="h-8 w-8 text-error mx-auto mb-3" />
              <p className="text-error font-medium">Failed to load status</p>
              <p className="text-sm text-text-secondary mt-1">
                {(statusError as Error).message || "Check your connection and try again."}
              </p>
              <Button variant="outline" size="sm" onClick={() => refetchStatus()} className="mt-4">
                Retry
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {status && !statusLoading && (
        <>
          {/* Overview Stats */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="py-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[10px] bg-brand-wash flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-text-primary">{status.total_employees}</p>
                    <p className="text-xs text-text-secondary">Active Employees</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[10px] bg-success-light flex items-center justify-center">
                    <UserCheck className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-text-primary">{status.total_instructors}</p>
                    <p className="text-xs text-text-secondary">Existing Instructors</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-5">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center ${hasMissing ? "bg-warning-light" : "bg-success-light"}`}>
                    <UserPlus className={`h-5 w-5 ${hasMissing ? "text-warning" : "text-success"}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-text-primary">{status.employees_without_instructor}</p>
                    <p className="text-xs text-text-secondary">Missing Instructor Doc</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Action: Assign All */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    Bulk Assign Instructor Role
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {!hasMissing && !assignResults && (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-10 w-10 text-success mx-auto mb-3" />
                    <p className="text-text-primary font-medium">All employees already have Instructor docs!</p>
                    <p className="text-sm text-text-secondary mt-1">
                      {status.total_instructors} instructors linked to {status.total_employees} employees.
                    </p>
                  </div>
                )}

                {hasMissing && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        variant="primary"
                        size="lg"
                        onClick={() => assignMutation.mutate(defaultCompany)}
                        disabled={assignMutation.isPending}
                        className="flex-shrink-0"
                      >
                        {assignMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserPlus className="h-4 w-4" />
                        )}
                        Assign Instructor Role ({missing.length} employees)
                      </Button>
                    </div>

                    <p className="text-xs text-text-tertiary">
                      This will create Instructor docs for {missing.length} employee{missing.length !== 1 ? "s" : ""} in{" "}
                      <strong>{defaultCompany || "your branch"}</strong> and add the
                      &ldquo;Instructor&rdquo; role to their Frappe user accounts.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Missing Employees List */}
          {hasMissing && (
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-warning" />
                    Employees Without Instructor Doc ({missing.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.entries(groupedByCompany).map(([company, employees]) => (
                    <div key={company} className="mb-4 last:mb-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="h-3.5 w-3.5 text-text-tertiary" />
                        <span className="text-sm font-semibold text-text-secondary">{company}</span>
                        <Badge variant="outline">{employees.length}</Badge>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border-light">
                              <th className="text-left pb-2 font-semibold text-text-secondary w-12">#</th>
                              <th className="text-left pb-2 font-semibold text-text-secondary">Employee ID</th>
                              <th className="text-left pb-2 font-semibold text-text-secondary">Name</th>
                              <th className="text-left pb-2 font-semibold text-text-secondary">User ID</th>
                            </tr>
                          </thead>
                          <tbody>
                            {employees.map((emp, idx) => (
                              <tr key={emp.name} className="border-b border-border-light hover:bg-brand-wash/30 transition-colors">
                                <td className="py-2 text-text-tertiary">{idx + 1}</td>
                                <td className="py-2 text-primary font-medium">{emp.name}</td>
                                <td className="py-2 text-text-primary">{emp.employee_name}</td>
                                <td className="py-2 text-text-secondary">{emp.user_id || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Results after assignment */}
          <AnimatePresence>
            {assignResults && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                      Assignment Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Summary */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      <div className="bg-success-light rounded-[10px] p-3 text-center">
                        <p className="text-lg font-bold text-success">{assignResults.summary.created}</p>
                        <p className="text-xs text-success font-medium">Created</p>
                      </div>
                      <div className="bg-brand-wash rounded-[10px] p-3 text-center">
                        <p className="text-lg font-bold text-primary">{assignResults.summary.role_added}</p>
                        <p className="text-xs text-primary font-medium">Roles Added</p>
                      </div>
                      <div className="bg-app-bg rounded-[10px] p-3 text-center">
                        <p className="text-lg font-bold text-text-secondary">{assignResults.summary.already_exists}</p>
                        <p className="text-xs text-text-secondary font-medium">Already Existed</p>
                      </div>
                      <div className="bg-error-light rounded-[10px] p-3 text-center">
                        <p className="text-lg font-bold text-error">{assignResults.summary.errors}</p>
                        <p className="text-xs text-error font-medium">Errors</p>
                      </div>
                    </div>

                    {/* Detailed Results */}
                    <div className="overflow-x-auto max-h-80 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-surface">
                          <tr className="border-b border-border-light">
                            <th className="text-left pb-2 font-semibold text-text-secondary">Employee</th>
                            <th className="text-left pb-2 font-semibold text-text-secondary">Name</th>
                            <th className="text-left pb-2 font-semibold text-text-secondary">Status</th>
                            <th className="text-left pb-2 font-semibold text-text-secondary">Instructor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {assignResults.results.map((r) => (
                            <tr key={r.employee} className="border-b border-border-light">
                              <td className="py-2 text-primary font-medium">{r.employee}</td>
                              <td className="py-2 text-text-primary">{r.employee_name}</td>
                              <td className="py-2">
                                {r.status === "created" && (
                                  <Badge variant="success">Created</Badge>
                                )}
                                {r.status === "already_exists" && (
                                  <Badge variant="outline">Exists</Badge>
                                )}
                                {r.status === "role_added" && (
                                  <Badge variant="info">Role Added</Badge>
                                )}
                                {r.status === "error" && (
                                  <Badge variant="error">Error</Badge>
                                )}
                              </td>
                              <td className="py-2 text-text-secondary">
                                {r.instructor_name || r.message || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Accounts Permission Management ── */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <CardTitle className="flex items-center gap-2">
                    <ShieldOff className="h-5 w-5 text-error" />
                    Remove Accounts Permissions
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchAccounts()}
                    disabled={accountsLoading}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${accountsLoading ? "animate-spin" : ""}`} />
                    Check Status
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {accountsLoading && (
                  <div className="flex items-center justify-center h-20">
                    <Loader2 className="animate-spin h-5 w-5 text-primary" />
                  </div>
                )}

                {accountsStatus && !accountsLoading && (
                  <div className="space-y-4">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-brand-wash rounded-[10px] p-3 text-center">
                        <p className="text-lg font-bold text-primary">{accountsStatus.total_instructor_users}</p>
                        <p className="text-xs text-primary font-medium">Instructor Users</p>
                      </div>
                      <div className={`rounded-[10px] p-3 text-center ${accountsStatus.users_with_accounts_access > 0 ? "bg-warning-light" : "bg-success-light"}`}>
                        <p className={`text-lg font-bold ${accountsStatus.users_with_accounts_access > 0 ? "text-warning" : "text-success"}`}>
                          {accountsStatus.users_with_accounts_access}
                        </p>
                        <p className={`text-xs font-medium ${accountsStatus.users_with_accounts_access > 0 ? "text-warning" : "text-success"}`}>
                          Need Cleanup
                        </p>
                      </div>
                      <div className="bg-error-light rounded-[10px] p-3 text-center">
                        <p className="text-lg font-bold text-error">{accountsStatus.users_with_accounts_roles}</p>
                        <p className="text-xs text-error font-medium">Have Acct Roles</p>
                      </div>
                      <div className="bg-app-bg rounded-[10px] p-3 text-center">
                        <p className="text-lg font-bold text-text-secondary">{accountsStatus.users_without_module_block}</p>
                        <p className="text-xs text-text-secondary font-medium">Module Not Blocked</p>
                      </div>
                    </div>

                    {/* Action Button or Clean Status */}
                    {accountsStatus.users_with_accounts_access === 0 && !accountsResults && (
                      <div className="text-center py-4">
                        <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2" />
                        <p className="text-text-primary font-medium">All instructor users are clean!</p>
                        <p className="text-sm text-text-secondary mt-1">
                          No instructors have accounts roles and the Accounts module is blocked for all.
                        </p>
                      </div>
                    )}

                    {accountsStatus.users_with_accounts_access > 0 && (
                      <div className="space-y-3">
                        <Button
                          variant="primary"
                          size="lg"
                          onClick={() => removeAccountsMutation.mutate()}
                          disabled={removeAccountsMutation.isPending}
                          className="bg-error hover:bg-error/90"
                        >
                          {removeAccountsMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Ban className="h-4 w-4" />
                          )}
                          Remove Accounts Access ({accountsStatus.users_with_accounts_access} users)
                        </Button>
                        <p className="text-xs text-text-tertiary">
                          This will remove &ldquo;Accounts User&rdquo;, &ldquo;Accounts Manager&rdquo;, and
                          &ldquo;Auditor&rdquo; roles from instructor users and block the Accounts module.
                        </p>

                        {/* Users with accounts access table */}
                        <div className="overflow-x-auto max-h-60 overflow-y-auto mt-3">
                          <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-surface">
                              <tr className="border-b border-border-light">
                                <th className="text-left pb-2 font-semibold text-text-secondary w-8">#</th>
                                <th className="text-left pb-2 font-semibold text-text-secondary">User</th>
                                <th className="text-left pb-2 font-semibold text-text-secondary">Name</th>
                                <th className="text-left pb-2 font-semibold text-text-secondary">Acct Roles</th>
                                <th className="text-left pb-2 font-semibold text-text-secondary">Module Blocked</th>
                              </tr>
                            </thead>
                            <tbody>
                              {accountsStatus.users.map((u, idx) => (
                                <tr key={u.user} className="border-b border-border-light hover:bg-brand-wash/30 transition-colors">
                                  <td className="py-2 text-text-tertiary">{idx + 1}</td>
                                  <td className="py-2 text-primary font-medium text-xs">{u.user}</td>
                                  <td className="py-2 text-text-primary">{u.full_name}</td>
                                  <td className="py-2">
                                    {u.accounts_roles.length > 0 ? (
                                      <div className="flex flex-wrap gap-1">
                                        {u.accounts_roles.map((r) => (
                                          <Badge key={r} variant="error">{r}</Badge>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-text-tertiary">—</span>
                                    )}
                                  </td>
                                  <td className="py-2">
                                    {u.accounts_blocked ? (
                                      <Badge variant="success">Blocked</Badge>
                                    ) : (
                                      <Badge variant="warning">Not Blocked</Badge>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Accounts Removal Results */}
          <AnimatePresence>
            {accountsResults && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lock className="h-5 w-5 text-success" />
                      Accounts Removal Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      <div className="bg-success-light rounded-[10px] p-3 text-center">
                        <p className="text-lg font-bold text-success">{accountsResults.summary.updated}</p>
                        <p className="text-xs text-success font-medium">Updated</p>
                      </div>
                      <div className="bg-brand-wash rounded-[10px] p-3 text-center">
                        <p className="text-lg font-bold text-primary">{accountsResults.summary.roles_removed}</p>
                        <p className="text-xs text-primary font-medium">Roles Removed</p>
                      </div>
                      <div className="bg-app-bg rounded-[10px] p-3 text-center">
                        <p className="text-lg font-bold text-text-secondary">{accountsResults.summary.already_clean}</p>
                        <p className="text-xs text-text-secondary font-medium">Already Clean</p>
                      </div>
                      <div className="bg-error-light rounded-[10px] p-3 text-center">
                        <p className="text-lg font-bold text-error">{accountsResults.summary.errors}</p>
                        <p className="text-xs text-error font-medium">Errors</p>
                      </div>
                    </div>

                    <div className="overflow-x-auto max-h-60 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-surface">
                          <tr className="border-b border-border-light">
                            <th className="text-left pb-2 font-semibold text-text-secondary">User</th>
                            <th className="text-left pb-2 font-semibold text-text-secondary">Name</th>
                            <th className="text-left pb-2 font-semibold text-text-secondary">Status</th>
                            <th className="text-left pb-2 font-semibold text-text-secondary">Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {accountsResults.results.map((r) => (
                            <tr key={r.user} className="border-b border-border-light">
                              <td className="py-2 text-primary font-medium text-xs">{r.user}</td>
                              <td className="py-2 text-text-primary">{r.full_name}</td>
                              <td className="py-2">
                                {r.status === "updated" && <Badge variant="success">Updated</Badge>}
                                {r.status === "already_clean" && <Badge variant="outline">Clean</Badge>}
                                {r.status === "error" && <Badge variant="error">Error</Badge>}
                              </td>
                              <td className="py-2 text-text-secondary text-xs">
                                {r.status === "updated" && (
                                  <span>
                                    {r.roles_removed.length > 0 && `Removed: ${r.roles_removed.join(", ")}`}
                                    {r.roles_removed.length > 0 && r.module_blocked && " | "}
                                    {r.module_blocked && "Module blocked"}
                                  </span>
                                )}
                                {r.status === "error" && r.message}
                                {r.status === "already_clean" && "No changes needed"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}
