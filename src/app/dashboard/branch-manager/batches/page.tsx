"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Plus, School, Users, Clock, User } from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { useFeatureFlagsStore } from "@/lib/stores/featureFlagsStore";

// Placeholder data
const mockBatches = [
  { name: "Class 8 - Batch A", program: "Class 8", batch: "A", strength: 58, max: 60, incharge: "Ms. Lakshmi", timing: "8:00 AM - 12:00 PM" },
  { name: "Class 8 - Batch B", program: "Class 8", batch: "B", strength: 42, max: 60, incharge: "Mr. Ravi", timing: "12:30 PM - 4:30 PM" },
  { name: "Class 9 - Batch A", program: "Class 9", batch: "A", strength: 60, max: 60, incharge: "Ms. Anjali", timing: "8:00 AM - 12:00 PM" },
  { name: "Class 9 - Batch B", program: "Class 9", batch: "B", strength: 55, max: 60, incharge: "Mr. Kumar", timing: "12:30 PM - 4:30 PM" },
  { name: "Class 10 - Batch A", program: "Class 10", batch: "A", strength: 52, max: 60, incharge: "Dr. Priya", timing: "8:00 AM - 12:00 PM" },
  { name: "Class 10 - Batch B", program: "Class 10", batch: "B", strength: 35, max: 60, incharge: "Mr. Suresh", timing: "12:30 PM - 4:30 PM" },
  { name: "Class 11 - Batch A", program: "Class 11", batch: "A", strength: 60, max: 60, incharge: "Ms. Deepa", timing: "8:00 AM - 12:00 PM" },
  { name: "Class 11 - Batch B", program: "Class 11", batch: "B", strength: 60, max: 60, incharge: "Mr. Vijay", timing: "12:30 PM - 4:30 PM" },
  { name: "Class 11 - Batch C", program: "Class 11", batch: "C", strength: 20, max: 60, incharge: "Ms. Nisha", timing: "5:00 PM - 9:00 PM" },
  { name: "Class 12 - Batch A", program: "Class 12", batch: "A", strength: 57, max: 60, incharge: "Dr. Ramesh", timing: "8:00 AM - 12:00 PM" },
];

export default function BatchesPage() {
  const { flags } = useFeatureFlagsStore();
  if (!flags.batches) return null;

  // Group by class
  const groupedBatches = mockBatches.reduce(
    (acc, batch) => {
      if (!acc[batch.program]) acc[batch.program] = [];
      acc[batch.program].push(batch);
      return acc;
    },
    {} as Record<string, typeof mockBatches>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <BreadcrumbNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Batches</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Manage class batches, timings, and student allocation
          </p>
        </div>
        <Link href="/dashboard/branch-manager/batches/new">
          <Button variant="primary" size="md">
            <Plus className="h-4 w-4" />
            Create Batch
          </Button>
        </Link>
      </div>

      {/* Batch Grid by Class */}
      {Object.entries(groupedBatches).map(([className, batches]) => (
        <Card key={className}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <School className="h-5 w-5 text-primary" />
              <CardTitle>{className}</CardTitle>
              <Badge variant="outline" className="ml-2">
                {batches.length} batch{batches.length > 1 ? "es" : ""}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {batches.map((batch, index) => {
                const percentage = (batch.strength / batch.max) * 100;
                const isFull = batch.strength >= batch.max;
                return (
                  <motion.div
                    key={batch.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -2 }}
                  >
                    <div className="bg-app-bg rounded-[12px] p-4 border border-border-light hover:border-primary/20 transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-text-primary">Batch {batch.batch}</h4>
                        {isFull ? (
                          <Badge variant="error">Full</Badge>
                        ) : percentage > 80 ? (
                          <Badge variant="warning">Almost Full</Badge>
                        ) : (
                          <Badge variant="success">Open</Badge>
                        )}
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-text-secondary">
                          <Users className="h-3.5 w-3.5 text-text-tertiary" />
                          <span>{batch.strength}/{batch.max} students</span>
                        </div>
                        <div className="flex items-center gap-2 text-text-secondary">
                          <Clock className="h-3.5 w-3.5 text-text-tertiary" />
                          <span>{batch.timing}</span>
                        </div>
                        <div className="flex items-center gap-2 text-text-secondary">
                          <User className="h-3.5 w-3.5 text-text-tertiary" />
                          <span>{batch.incharge}</span>
                        </div>
                      </div>

                      {/* Capacity Bar */}
                      <div className="mt-3">
                        <div className="w-full h-2 bg-surface rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className={`h-full rounded-full ${
                              isFull ? "bg-error" : percentage > 80 ? "bg-warning" : "bg-primary"
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </motion.div>
  );
}
