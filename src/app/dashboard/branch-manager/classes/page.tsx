"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Plus, School, BookOpen } from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { useFeatureFlagsStore } from "@/lib/stores/featureFlagsStore";

const mockClasses = [
  { name: "Class 8", batches: 2, students: 100, courses: ["Mathematics", "Science", "English", "Social Studies"] },
  { name: "Class 9", batches: 2, students: 115, courses: ["Mathematics", "Physics", "Chemistry", "Biology", "English"] },
  { name: "Class 10", batches: 2, students: 87, courses: ["Mathematics", "Physics", "Chemistry", "Biology", "English", "Computer Science"] },
  { name: "Class 11", batches: 3, students: 140, courses: ["Mathematics", "Physics", "Chemistry", "English", "Computer Science"] },
  { name: "Class 12", batches: 1, students: 57, courses: ["Mathematics", "Physics", "Chemistry", "English"] },
];

export default function ClassesPage() {
  const { flags } = useFeatureFlagsStore();
  if (!flags.classes) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <BreadcrumbNav />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Classes</h1>
          <p className="text-sm text-text-secondary mt-0.5">Manage class levels, courses, and syllabus</p>
        </div>
        <Button variant="primary" size="md">
          <Plus className="h-4 w-4" />
          Add Class
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockClasses.map((cls, index) => (
          <motion.div
            key={cls.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            whileHover={{ y: -3 }}
          >
            <Card hover className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-light rounded-[10px] flex items-center justify-center">
                      <School className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle>{cls.name}</CardTitle>
                  </div>
                  <Badge variant="outline">{cls.batches} batches</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">Total Students</span>
                    <span className="font-semibold text-text-primary">{cls.students}</span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-text-secondary mb-2 flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" /> Courses
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {cls.courses.map((course) => (
                        <span
                          key={course}
                          className="text-[11px] px-2 py-0.5 rounded-full bg-app-bg text-text-secondary border border-border-light"
                        >
                          {course}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
