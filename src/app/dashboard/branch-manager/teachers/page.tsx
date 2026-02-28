"use client";

import React, { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen, Search, Users, Building2, GraduationCap, Phone, Mail, Calendar, Briefcase, UserCircle,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/hooks/useAuth";
import { getEmployees, getInstructors } from "@/lib/api/employees";

export default function TeachersPage() {
  const { defaultCompany } = useAuth();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Fetch employees for this branch (with extended fields)
  const { data: empRes, isLoading: empLoading } = useQuery({
    queryKey: ["employees", defaultCompany],
    queryFn: () => getEmployees({ company: defaultCompany || undefined, limit_page_length: 500 }),
    staleTime: 5 * 60_000,
    enabled: !!defaultCompany,
  });

  // Fetch all instructors
  const { data: instrRes, isLoading: instrLoading } = useQuery({
    queryKey: ["instructors-all"],
    queryFn: () => getInstructors({ limit_page_length: 500 }),
    staleTime: 5 * 60_000,
  });

  const isLoading = empLoading || instrLoading;

  // Cross-reference: instructors whose employee link is in this branch's employee list
  const teachers = useMemo(() => {
    const employees = empRes?.data ?? [];
    const instructors = instrRes?.data ?? [];
    const employeeNames = new Set(employees.map((e) => e.name));
    const empMap = new Map(employees.map((e) => [e.name, e]));

    return instructors
      .filter((i) => employeeNames.has(i.employee))
      .map((i) => ({
        ...i,
        employee_data: empMap.get(i.employee),
      }))
      .filter((t) =>
        !search ||
        t.instructor_name.toLowerCase().includes(search.toLowerCase()) ||
        t.employee.toLowerCase().includes(search.toLowerCase())
      );
  }, [empRes, instrRes, search]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <BreadcrumbNav />

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          Teachers
        </h1>
        <p className="text-sm text-text-secondary mt-0.5">
          {isLoading ? "Loading…" : `${teachers.length} instructor${teachers.length !== 1 ? "s" : ""} at this branch`}
        </p>
      </div>

      {/* Search */}
      <Card>
        <div className="p-4">
          <Input
            placeholder="Search by name…"
            leftIcon={<Search className="h-4 w-4" />}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </Card>

      {/* Teachers Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-14 w-14 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : teachers.length === 0 ? (
        <div className="text-center py-16 text-text-secondary text-sm flex flex-col items-center gap-3">
          <Users className="h-10 w-10 text-text-tertiary" />
          <p>No teachers found for this branch.</p>
          <p className="text-xs text-text-tertiary">
            Teachers are employees linked to an Instructor record in ERPNext.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teachers.map((teacher, index) => (
            <motion.div
              key={teacher.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <Card className="hover:shadow-card-hover transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-14 h-14 rounded-full bg-brand-wash flex items-center justify-center overflow-hidden flex-shrink-0">
                      {teacher.image ? (
                        <img
                          src={`${process.env.NEXT_PUBLIC_FRAPPE_URL}${teacher.image}`}
                          alt={teacher.instructor_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xl font-bold text-primary">
                          {teacher.instructor_name?.charAt(0)?.toUpperCase() || "?"}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-text-primary">
                          {teacher.instructor_name}
                        </h3>
                        <Badge
                          variant={
                            teacher.employee_data?.status === "Active" ? "success"
                            : teacher.employee_data?.status === "Left" ? "error"
                            : "default"
                          }
                          className="text-[10px]"
                        >
                          {teacher.employee_data?.status ?? "Unknown"}
                        </Badge>
                      </div>

                      <p className="text-xs text-text-secondary font-mono mb-2">{teacher.name}</p>

                      <div className="space-y-1">
                        {teacher.employee_data?.designation && (
                          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                            <GraduationCap className="h-3 w-3 text-text-tertiary" />
                            <span className="truncate">{teacher.employee_data.designation}</span>
                          </div>
                        )}
                        {(teacher.department || teacher.employee_data?.department) && (
                          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                            <Building2 className="h-3 w-3 text-text-tertiary" />
                            <span className="truncate">{teacher.department || teacher.employee_data?.department}</span>
                          </div>
                        )}
                        {teacher.employee_data?.employment_type && (
                          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                            <Briefcase className="h-3 w-3 text-text-tertiary" />
                            <span className="truncate">{teacher.employee_data.employment_type}</span>
                          </div>
                        )}
                        {(teacher.gender || teacher.employee_data?.gender) && (
                          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                            <UserCircle className="h-3 w-3 text-text-tertiary" />
                            <span className="truncate">{teacher.gender || teacher.employee_data?.gender}</span>
                          </div>
                        )}
                        {teacher.employee_data?.cell_number && (
                          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                            <Phone className="h-3 w-3 text-text-tertiary" />
                            <span className="truncate">{teacher.employee_data.cell_number}</span>
                          </div>
                        )}
                        {teacher.employee_data?.user_id && (
                          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                            <Mail className="h-3 w-3 text-text-tertiary" />
                            <span className="truncate">{teacher.employee_data.user_id}</span>
                          </div>
                        )}
                        {teacher.employee_data?.date_of_joining && (
                          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                            <Calendar className="h-3 w-3 text-text-tertiary" />
                            <span className="truncate">Joined {teacher.employee_data.date_of_joining}</span>
                          </div>
                        )}
                        {teacher.custom_company && teacher.custom_company !== defaultCompany && (
                          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                            <Building2 className="h-3 w-3 text-text-tertiary" />
                            <span className="truncate text-primary">{teacher.custom_company}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
