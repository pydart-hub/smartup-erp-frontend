"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Users, Search, Mail, Phone, Building2, Briefcase, Filter,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/hooks/useAuth";
import { getEmployees, type Employee } from "@/lib/api/hr";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { getInitials } from "@/lib/utils/formatters";

const STATUS_TABS = ["Active", "Left", "Inactive", "All"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function HREmployeesPage() {
  const { defaultCompany } = useAuth();
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<StatusTab>("Active");
  const debouncedSearch = useDebounce(search, 300);

  const { data: employeesRes, isLoading } = useQuery({
    queryKey: ["hr-employees", defaultCompany, statusTab, debouncedSearch],
    queryFn: () =>
      getEmployees({
        ...(defaultCompany ? { company: defaultCompany } : {}),
        ...(statusTab !== "All" ? { status: statusTab } : {}),
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        limit_page_length: 200,
      }),
    staleTime: 60_000,
  });

  const employees = employeesRes?.data ?? [];

  // Group by department
  const byDepartment = employees.reduce<Record<string, Employee[]>>((acc, emp) => {
    const dept = emp.department || "Unassigned";
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(emp);
    return acc;
  }, {});

  const departments = Object.keys(byDepartment).sort();

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <BreadcrumbNav />

      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Employees</h1>
            <p className="text-text-secondary text-sm mt-0.5">
              Manage employee records and details
            </p>
          </div>
          <Badge variant="outline" className="self-start text-sm">
            {employees.length} employee{employees.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <Input
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 bg-surface border border-border-light rounded-[10px] p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusTab(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-[8px] transition-all ${
                statusTab === tab
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary hover:bg-app-bg"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Employee Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-44 bg-border-light rounded-[12px] animate-pulse" />
          ))}
        </div>
      ) : employees.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <Users className="h-10 w-10 text-text-tertiary" />
            <p className="text-text-secondary">No employees found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {departments.map((dept) => (
            <motion.div key={dept} variants={itemVariants}>
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-4 w-4 text-text-tertiary" />
                <h2 className="text-sm font-semibold text-text-primary">{dept}</h2>
                <span className="text-xs text-text-tertiary">
                  ({byDepartment[dept].length})
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {byDepartment[dept].map((emp) => (
                  <motion.div
                    key={emp.name}
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="h-full hover:shadow-md transition-shadow border-border-light hover:border-primary/30">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3 mb-3">
                          {emp.image ? (
                            <img
                              src={emp.image}
                              alt={emp.employee_name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-brand-wash flex items-center justify-center text-sm font-semibold text-primary">
                              {getInitials(emp.employee_name)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-text-primary truncate">
                              {emp.employee_name}
                            </p>
                            <p className="text-xs text-text-tertiary truncate">
                              {emp.name}
                            </p>
                          </div>
                          <Badge
                            variant={
                              emp.status === "Active"
                                ? "success"
                                : emp.status === "Left"
                                  ? "error"
                                  : "warning"
                            }
                            className="text-[10px] shrink-0"
                          >
                            {emp.status}
                          </Badge>
                        </div>

                        <div className="space-y-1.5">
                          {emp.designation && (
                            <div className="flex items-center gap-2 text-xs text-text-secondary">
                              <Briefcase className="h-3 w-3 text-text-tertiary shrink-0" />
                              <span className="truncate">{emp.designation}</span>
                            </div>
                          )}
                          {emp.personal_email && (
                            <div className="flex items-center gap-2 text-xs text-text-secondary">
                              <Mail className="h-3 w-3 text-text-tertiary shrink-0" />
                              <span className="truncate">{emp.personal_email}</span>
                            </div>
                          )}
                          {emp.cell_number && (
                            <div className="flex items-center gap-2 text-xs text-text-secondary">
                              <Phone className="h-3 w-3 text-text-tertiary shrink-0" />
                              <span>{emp.cell_number}</span>
                            </div>
                          )}
                          {emp.date_of_joining && (
                            <div className="text-[10px] text-text-tertiary mt-1">
                              Joined: {new Date(emp.date_of_joining).toLocaleDateString("en-IN")}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
