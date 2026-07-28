"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Award,
  BookOpen,
  Calendar,
  Edit2,
  Plus,
  Search,
  Trash2,
  User,
  GraduationCap,
  Sparkles,
  ChevronLeft,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  getEvaluations,
  deleteEvaluation,
} from "@/lib/api/trainingEvaluation";

export default function TrainingEvaluationListPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");

  const { data: evaluations = [], isLoading } = useQuery({
    queryKey: ["evaluations"],
    queryFn: getEvaluations,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEvaluation,
    onSuccess: (deleted) => {
      if (deleted) {
        toast.success("Evaluation deleted successfully!");
        queryClient.invalidateQueries({ queryKey: ["evaluations"] });
      } else {
        toast.error("Failed to delete evaluation");
      }
    },
    onError: () => {
      toast.error("An error occurred while deleting the evaluation");
    },
  });

  const handleDelete = (name: string) => {
    if (confirm("Are you sure you want to delete this scorecard record?")) {
      deleteMutation.mutate(name);
    }
  };

  const filteredEvals = evaluations.filter(
    (ev) =>
      ev.teacher_display_name?.toLowerCase().includes(search.toLowerCase()) ||
      ev.teacher_name.toLowerCase().includes(search.toLowerCase()) ||
      ev.subject.toLowerCase().includes(search.toLowerCase()) ||
      ev.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl flex items-center gap-1.5"
          onClick={() => router.push("/dashboard/branch-manager/teachers")}
        >
          <ChevronLeft className="h-4 w-4" />
          Teachers List
        </Button>
        <BreadcrumbNav />
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Award className="h-6 w-6 text-primary" />
            Training Evaluation Scorecards
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {isLoading
              ? "Loading..."
              : `${evaluations.length} evaluation scorecard${
                  evaluations.length !== 1 ? "s" : ""
                } recorded`}
          </p>
        </div>
        <Link href="/dashboard/branch-manager/teachers/training-evaluation/entry">
          <Button className="rounded-xl flex items-center gap-2 bg-primary text-white shadow-sm hover:shadow-md transition-all">
            <Plus className="h-4 w-4" />
            New Scorecard Entry
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-4">
          <Input
            placeholder="Search by teacher, subject, or ID..."
            leftIcon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </Card>

      {/* Evaluations List/Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-40 bg-slate-100 dark:bg-slate-800 rounded-2xl"
            />
          ))}
        </div>
      ) : filteredEvals.length === 0 ? (
        <div className="text-center py-16 text-text-secondary text-sm flex flex-col items-center gap-3">
          <Award className="h-10 w-10 text-text-tertiary" />
          <p>No training evaluation scorecards found.</p>
          <p className="text-xs text-text-tertiary">
            Create a scorecard to evaluate instructors under the 10 assessment criteria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvals.map((ev) => (
            <motion.div
              key={ev.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="hover:shadow-card-hover transition-shadow overflow-hidden border border-border-light">
                <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                  <div>
                    {/* Header */}
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-mono text-[10px]">
                        {ev.name}
                      </Badge>
                      <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
                        <Calendar className="h-3 w-3" />
                        <span>{ev.evaluation_date}</span>
                      </div>
                    </div>

                    {/* Teacher / Course info */}
                    <h3 className="font-bold text-text-primary text-base truncate flex items-center gap-1.5">
                      <User className="h-4 w-4 text-primary" />
                      {ev.teacher_display_name || ev.teacher_name}
                    </h3>
                    <p className="text-xs text-text-secondary font-semibold mt-0.5 truncate flex items-center gap-1.5 pl-5">
                      <BookOpen className="h-3.5 w-3.5 text-text-tertiary" />
                      {ev.subject}
                    </p>

                    <div className="mt-3 pt-3 border-t border-border-light space-y-1 text-xs text-text-secondary">
                      <div className="flex justify-between">
                        <span>Branch:</span>
                        <span className="font-semibold text-text-primary">
                          {ev.branch}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Evaluator:</span>
                        <span className="font-semibold text-text-primary">
                          {ev.evaluator}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2 mt-2 border-t border-dashed border-border-light">
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-primary">
                          <Sparkles className="h-3.5 w-3.5" />
                          Overall Performance:
                        </span>
                        <span className="font-extrabold text-primary font-mono text-sm bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20">
                          {ev.total_score}/100 Marks
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-2 border-t border-border-light">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl flex items-center gap-1.5 h-8 text-xs hover:bg-primary hover:text-white"
                      onClick={() =>
                        router.push(
                          `/dashboard/branch-manager/teachers/training-evaluation/entry?id=${ev.name}`
                        )
                      }
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl flex items-center gap-1.5 h-8 text-xs hover:bg-error hover:text-white hover:border-error text-error border-error/30"
                      onClick={() => handleDelete(ev.name)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
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
