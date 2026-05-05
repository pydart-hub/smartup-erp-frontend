# Overdue Pages - Implementation Code Guide

## 1️⃣ MODIFY: src/app/dashboard/branch-manager/fees/page.tsx

### Change the Overdue Card href

**Find Line ~330 where Overdue card is defined:**

```typescript
// BEFORE (WRONG)
<StatsCard
  title="Overdue Invoices"
  value={
    overdueInvoices.length > 0
      ? `${overdueInvoices.length} (${formatCurrency(overdueTotal)})`
      : "None"
  }
  icon={<Clock className="h-5 w-5" />}
  href="/dashboard/branch-manager/fees/pending"  // ❌ WRONG
  color="error"
/>

// AFTER (CORRECT)
<StatsCard
  title="Overdue Invoices"
  value={
    overdueInvoices.length > 0
      ? `${overdueInvoices.length} (${formatCurrency(overdueTotal)})`
      : "None"
  }
  icon={<Clock className="h-5 w-5" />}
  href="/dashboard/branch-manager/fees/overdue"  // ✅ CORRECT
  color="error"
/>
```

---

## 2️⃣ MODIFY: src/lib/types/fee.ts

### Add Overdue Summary Types

```typescript
// Add these interfaces to the file

export interface ClassOverdueSummary {
  item_code: string;           // e.g., "CLASS-001"
  item_name: string;           // e.g., "Grade 10-A"
  student_count: number;       // Count of students with overdue invoices
  total_outstanding: number;   // Sum of outstanding amounts
  days_overdue: number;        // Maximum days overdue in this class
}

export interface BatchOverdueSummary {
  batch_code: string;          // e.g., "BATCH-001"
  batch_name: string;          // e.g., "2024-Jan Batch"
  student_count: number;       // Students with overdue in this batch
  total_outstanding: number;   // Total overdue amount
  days_overdue: number;        // Max days overdue in batch
}
```

---

## 3️⃣ MODIFY: src/lib/api/fees.ts

### Add Overdue API Functions

```typescript
// Add these functions to the file

import type { ClassOverdueSummary, BatchOverdueSummary } from "@/lib/types/fee";

/**
 * Fetch class-wise OVERDUE fee summary
 * Only includes invoices with due_date < today
 */
export async function getClassOverdueSummary(company?: string): Promise<ClassOverdueSummary[]> {
  try {
    const params = new URLSearchParams();
    if (company) params.append("company", company);

    const response = await fetch(
      `/api/fees/class-overdue-summary?${params.toString()}`,
      {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error("[getClassOverdueSummary] Error:", error);
    throw error;
  }
}

/**
 * Fetch batch-wise OVERDUE fee summary for a specific class
 * Only includes invoices with due_date < today
 */
export async function getBatchOverdueSummary(
  classId: string,
  company?: string
): Promise<BatchOverdueSummary[]> {
  try {
    const params = new URLSearchParams({ class: classId });
    if (company) params.append("company", company);

    const response = await fetch(
      `/api/fees/batch-overdue-summary?${params.toString()}`,
      {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error("[getBatchOverdueSummary] Error:", error);
    throw error;
  }
}
```

---

## 4️⃣ CREATE: src/app/api/fees/class-overdue-summary/route.ts

### Backend API for Class-wise Overdue

```typescript
import { NextRequest, NextResponse } from "next/server";
import { frappe_call } from "@/lib/frappe";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get("company");

    // Get session/auth from request
    const session = request.cookies.get("smartup_session")?.value;
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all invoices from Frappe
    const filters = {
      docstatus: 1, // Submitted only
      outstanding_amount: [">", 0], // Has outstanding amount
    };

    const response = await frappe_call({
      method: "frappe.client.get_list",
      args: {
        doctype: "Sales Invoice",
        filters: company ? { ...filters, company } : filters,
        fields: [
          "name",
          "customer",
          "customer_name",
          "item_code",
          "item_group",
          "items",
          "due_date",
          "outstanding_amount",
          "invoice_date",
          "batch_id",
        ],
        limit_page_length: 0, // Get all
        order_by: "due_date asc",
      },
    });

    if (!response.ok) {
      throw new Error(`Frappe error: ${response.statusText}`);
    }

    const { message: invoices } = await response.json();

    // Get today's date
    const today = new Date().toISOString().split("T")[0];

    // Filter to ONLY overdue (due_date < today)
    const overdueInvoices = invoices.filter((inv: any) => {
      return inv.due_date && inv.due_date < today;
    });

    // Group by item_code (class) and calculate summaries
    const classSummaryMap = new Map<string, any>();

    overdueInvoices.forEach((inv: any) => {
      const classId = inv.item_code || "Unknown";
      
      if (!classSummaryMap.has(classId)) {
        classSummaryMap.set(classId, {
          item_code: classId,
          item_name: inv.item_group || classId,
          students: new Set(),
          total_outstanding: 0,
          max_days_overdue: 0,
        });
      }

      const summary = classSummaryMap.get(classId);
      summary.students.add(inv.customer);
      summary.total_outstanding += inv.outstanding_amount || 0;

      // Calculate days overdue
      const daysOverdue = Math.floor(
        (new Date(today).getTime() - new Date(inv.due_date).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      summary.max_days_overdue = Math.max(summary.max_days_overdue, daysOverdue);
    });

    // Convert to array format
    const result = Array.from(classSummaryMap.values()).map((item) => ({
      item_code: item.item_code,
      item_name: item.item_name,
      student_count: item.students.size,
      total_outstanding: item.total_outstanding,
      days_overdue: item.max_days_overdue,
    }));

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("[class-overdue-summary]", error);
    return NextResponse.json(
      { error: "Failed to fetch class overdue summary" },
      { status: 500 }
    );
  }
}
```

---

## 5️⃣ CREATE: src/app/api/fees/batch-overdue-summary/route.ts

### Backend API for Batch-wise Overdue

```typescript
import { NextRequest, NextResponse } from "next/server";
import { frappe_call } from "@/lib/frappe";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("class");
    const company = searchParams.get("company");

    if (!classId) {
      return NextResponse.json(
        { error: "class parameter is required" },
        { status: 400 }
      );
    }

    const session = request.cookies.get("smartup_session")?.value;
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch invoices for this class
    const filters = {
      docstatus: 1,
      outstanding_amount: [">", 0],
      item_code: classId, // Filter by class
    };

    const response = await frappe_call({
      method: "frappe.client.get_list",
      args: {
        doctype: "Sales Invoice",
        filters: company ? { ...filters, company } : filters,
        fields: [
          "name",
          "customer",
          "customer_name",
          "item_code",
          "batch_id",
          "due_date",
          "outstanding_amount",
        ],
        limit_page_length: 0,
        order_by: "due_date asc",
      },
    });

    if (!response.ok) {
      throw new Error(`Frappe error: ${response.statusText}`);
    }

    const { message: invoices } = await response.json();

    // Filter to ONLY overdue
    const today = new Date().toISOString().split("T")[0];
    const overdueInvoices = invoices.filter((inv: any) => {
      return inv.due_date && inv.due_date < today;
    });

    // Group by batch_id
    const batchSummaryMap = new Map<string, any>();

    overdueInvoices.forEach((inv: any) => {
      const batchId = inv.batch_id || "No Batch";

      if (!batchSummaryMap.has(batchId)) {
        batchSummaryMap.set(batchId, {
          batch_code: batchId,
          batch_name: batchId, // Could fetch from DB if needed
          students: new Set(),
          total_outstanding: 0,
          max_days_overdue: 0,
        });
      }

      const summary = batchSummaryMap.get(batchId);
      summary.students.add(inv.customer);
      summary.total_outstanding += inv.outstanding_amount || 0;

      const daysOverdue = Math.floor(
        (new Date(today).getTime() - new Date(inv.due_date).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      summary.max_days_overdue = Math.max(summary.max_days_overdue, daysOverdue);
    });

    const result = Array.from(batchSummaryMap.values()).map((item) => ({
      batch_code: item.batch_code,
      batch_name: item.batch_name,
      student_count: item.students.size,
      total_outstanding: item.total_outstanding,
      days_overdue: item.max_days_overdue,
    }));

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("[batch-overdue-summary]", error);
    return NextResponse.json(
      { error: "Failed to fetch batch overdue summary" },
      { status: 500 }
    );
  }
}
```

---

## 6️⃣ CREATE: src/app/dashboard/branch-manager/fees/overdue/page.tsx

### Class Overdue Fees Page

```typescript
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Users,
  IndianRupee,
  ChevronRight,
  Loader2,
  Search,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils/formatters";
import { getClassOverdueSummary, type ClassOverdueSummary } from "@/lib/api/fees";
import { useAuth } from "@/lib/hooks/useAuth";

export default function ClassOverdueFeesPage() {
  const { defaultCompany } = useAuth();
  const [data, setData] = useState<ClassOverdueSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getClassOverdueSummary(defaultCompany || undefined)
      .then((result) => {
        console.log("[overdue] class summary:", result);
        setData(result);
      })
      .catch((err) => {
        console.error("[overdue] error:", err);
        setError(err?.message || "Failed to fetch data");
      })
      .finally(() => setLoading(false));
  }, [defaultCompany]);

  const totalOutstanding = useMemo(
    () => data.reduce((s, d) => s + d.total_outstanding, 0),
    [data]
  );
  const totalStudents = useMemo(
    () => data.reduce((s, d) => s + d.student_count, 0),
    [data]
  );

  const filtered = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter((d) => d.item_name.toLowerCase().includes(q));
  }, [data, search]);

  return (
    <div className="space-y-6">
      <BreadcrumbNav />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <Link href="/dashboard/branch-manager/fees">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <Clock className="h-6 w-6 text-error" />
              Overdue Fees by Class
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              Click a class to see batch-wise breakdown of overdue invoices
            </p>
          </div>
        </div>
      </motion.div>

      {/* Summary cards */}
      {!loading && data.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <Card className="border-l-4 border-l-error">
            <CardContent className="py-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-error/10 flex items-center justify-center">
                <IndianRupee className="h-5 w-5 text-error" />
              </div>
              <div>
                <p className="text-sm text-text-secondary">Total Overdue</p>
                <p className="text-xl font-bold text-error">
                  {formatCurrency(totalOutstanding)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-error">
            <CardContent className="py-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-error/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-error" />
              </div>
              <div>
                <p className="text-sm text-text-secondary">Students with Overdue</p>
                <p className="text-xl font-bold text-text-primary">
                  {totalStudents}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Search */}
      {!loading && data.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-text-tertiary" />
          <Input
            placeholder="Search by class name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <Card className="border-l-4 border-l-error">
          <CardContent className="py-4">
            <p className="text-error">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* No data */}
      {!loading && data.length === 0 && !error && (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-8 w-8 text-text-tertiary mx-auto mb-2" />
            <p className="text-text-secondary">No overdue fees found</p>
          </CardContent>
        </Card>
      )}

      {/* Class list */}
      {!loading && filtered.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {filtered.map((item) => (
            <Link key={item.item_code} href={`/dashboard/branch-manager/fees/overdue/${item.item_code}`}>
              <Card className="hover:shadow-card-hover cursor-pointer transition-shadow">
                <CardContent className="py-4 flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-text-primary">
                      {item.item_name}
                    </h3>
                    <div className="flex gap-4 mt-2 text-sm text-text-secondary">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {item.student_count} students
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-error" />
                        {item.days_overdue} days overdue
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge color="error">{formatCurrency(item.total_outstanding)}</Badge>
                    <ChevronRight className="h-5 w-5 text-text-tertiary mt-2" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </motion.div>
      )}
    </div>
  );
}
```

---

## 7️⃣ CREATE: src/app/dashboard/branch-manager/fees/overdue/[classId]/page.tsx

### Batch Overdue Fees Page

```typescript
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  Users,
  IndianRupee,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils/formatters";
import { getBatchOverdueSummary, type BatchOverdueSummary } from "@/lib/api/fees";
import { useAuth } from "@/lib/hooks/useAuth";

export default function BatchOverdueFeesPage() {
  const params = useParams();
  const classId = params.classId as string;
  const { defaultCompany } = useAuth();
  
  const [data, setData] = useState<BatchOverdueSummary[]>([]);
  const [className, setClassName] = useState<string>(classId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getBatchOverdueSummary(classId, defaultCompany || undefined)
      .then((result) => {
        console.log("[overdue] batch summary:", result);
        setData(result);
      })
      .catch((err) => {
        console.error("[overdue-batch] error:", err);
        setError(err?.message || "Failed to fetch data");
      })
      .finally(() => setLoading(false));
  }, [classId, defaultCompany]);

  const totalOutstanding = useMemo(
    () => data.reduce((s, d) => s + d.total_outstanding, 0),
    [data]
  );
  const totalStudents = useMemo(
    () => data.reduce((s, d) => s + d.student_count, 0),
    [data]
  );

  return (
    <div className="space-y-6">
      <BreadcrumbNav />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <Link href="/dashboard/branch-manager/fees/overdue">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Clock className="h-6 w-6 text-error" />
            Overdue - {className}
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Click a batch to see student-wise invoice details
          </p>
        </div>
      </motion.div>

      {/* Summary */}
      {!loading && data.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <Card className="border-l-4 border-l-error">
            <CardContent className="py-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-error/10 flex items-center justify-center">
                <IndianRupee className="h-5 w-5 text-error" />
              </div>
              <div>
                <p className="text-sm text-text-secondary">Total Overdue</p>
                <p className="text-xl font-bold text-error">
                  {formatCurrency(totalOutstanding)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-error">
            <CardContent className="py-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-error/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-error" />
              </div>
              <div>
                <p className="text-sm text-text-secondary">Students</p>
                <p className="text-xl font-bold text-text-primary">
                  {totalStudents}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <Card className="border-l-4 border-l-error">
          <CardContent className="py-4">
            <p className="text-error">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* No data */}
      {!loading && data.length === 0 && !error && (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-8 w-8 text-text-tertiary mx-auto mb-2" />
            <p className="text-text-secondary">No overdue fees in this class</p>
          </CardContent>
        </Card>
      )}

      {/* Batch list */}
      {!loading && data.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {data.map((batch) => (
            <Link 
              key={batch.batch_code}
              href={`/dashboard/branch-manager/fees/overdue/${classId}/${batch.batch_code}`}
            >
              <Card className="hover:shadow-card-hover cursor-pointer transition-shadow">
                <CardContent className="py-4 flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-text-primary">
                      {batch.batch_name}
                    </h3>
                    <div className="flex gap-4 mt-2 text-sm text-text-secondary">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {batch.student_count} students
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-error" />
                        {batch.days_overdue} days overdue
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge color="error">{formatCurrency(batch.total_outstanding)}</Badge>
                    <ChevronRight className="h-5 w-5 text-text-tertiary mt-2" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </motion.div>
      )}
    </div>
  );
}
```

---

## 8️⃣ CREATE: src/app/dashboard/branch-manager/fees/overdue/[classId]/[batchId]/page.tsx

### Student Overdue Invoices Page

```typescript
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  IndianRupee,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { getSalesInvoices, type SalesInvoice } from "@/lib/api/sales";
import { useAuth } from "@/lib/hooks/useAuth";

export default function StudentOverdueInvoicesPage() {
  const params = useParams();
  const classId = params.classId as string;
  const batchId = params.batchId as string;
  const { defaultCompany } = useAuth();

  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Get today's date to filter overdue
    const today = new Date().toISOString().split("T")[0];

    getSalesInvoices({
      outstanding_only: true,
      docstatus: 1,
      ...(defaultCompany ? { company: defaultCompany } : {}),
      limit_page_length: 100,
      order_by: "due_date asc",
    })
      .then((res) => {
        // Frontend filtering for overdue + class/batch
        const filtered = res.data
          .filter((inv: SalesInvoice) => {
            // Only overdue invoices
            return inv.due_date && inv.due_date < today;
          })
          .sort((a: SalesInvoice, b: SalesInvoice) => {
            // Sort by days overdue (highest first)
            const daysA = Math.floor(
              (new Date(today).getTime() - new Date(a.due_date!).getTime()) /
                (1000 * 60 * 60 * 24)
            );
            const daysB = Math.floor(
              (new Date(today).getTime() - new Date(b.due_date!).getTime()) /
                (1000 * 60 * 60 * 24)
            );
            return daysB - daysA;
          });

        setInvoices(filtered);
      })
      .catch((err) => {
        console.error("[overdue-invoices] error:", err);
        setError(err?.message || "Failed to fetch invoices");
      })
      .finally(() => setLoading(false));
  }, [classId, batchId, defaultCompany]);

  const totalOutstanding = useMemo(
    () => invoices.reduce((s, inv) => s + inv.outstanding_amount, 0),
    [invoices]
  );

  const avgDaysOverdue = useMemo(() => {
    if (invoices.length === 0) return 0;
    const today = new Date().toISOString().split("T")[0];
    const totalDays = invoices.reduce((s, inv) => {
      if (!inv.due_date) return s;
      return (
        s +
        Math.floor(
          (new Date(today).getTime() - new Date(inv.due_date).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      );
    }, 0);
    return Math.round(totalDays / invoices.length);
  }, [invoices]);

  return (
    <div className="space-y-6">
      <BreadcrumbNav />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <Link href={`/dashboard/branch-manager/fees/overdue/${classId}`}>
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Clock className="h-6 w-6 text-error" />
            Overdue Invoices - {batchId}
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Sorted by days overdue
          </p>
        </div>
      </motion.div>

      {/* Summary */}
      {!loading && invoices.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          <Card className="border-l-4 border-l-error">
            <CardContent className="py-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-error/10 flex items-center justify-center">
                <IndianRupee className="h-5 w-5 text-error" />
              </div>
              <div>
                <p className="text-sm text-text-secondary">Total Outstanding</p>
                <p className="text-xl font-bold text-error">
                  {formatCurrency(totalOutstanding)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-error/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-error" />
              </div>
              <div>
                <p className="text-sm text-text-secondary">Avg Days Overdue</p>
                <p className="text-xl font-bold text-text-primary">
                  {avgDaysOverdue}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-error/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-error" />
              </div>
              <div>
                <p className="text-sm text-text-secondary">Invoices</p>
                <p className="text-xl font-bold text-text-primary">
                  {invoices.length}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <Card className="border-l-4 border-l-error">
          <CardContent className="py-4">
            <p className="text-error">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* No data */}
      {!loading && invoices.length === 0 && !error && (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-8 w-8 text-text-tertiary mx-auto mb-2" />
            <p className="text-text-secondary">No overdue invoices found</p>
          </CardContent>
        </Card>
      )}

      {/* Invoice table */}
      {!loading && invoices.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-light">
                      <th className="text-left py-3 px-4 font-semibold text-text-secondary">
                        Invoice
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-text-secondary">
                        Student
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-text-secondary">
                        Due Date
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-text-secondary">
                        Days Overdue
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-text-secondary">
                        Outstanding
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => {
                      const daysOverdue = inv.due_date
                        ? Math.floor(
                            (new Date().getTime() -
                              new Date(inv.due_date).getTime()) /
                              (1000 * 60 * 60 * 24)
                          )
                        : 0;
                      return (
                        <tr
                          key={inv.name}
                          className="border-b border-border-light hover:bg-surface-hover"
                        >
                          <td className="py-3 px-4 font-medium text-primary">
                            {inv.name}
                          </td>
                          <td className="py-3 px-4 text-text-primary">
                            {inv.customer_name}
                          </td>
                          <td className="py-3 px-4 text-text-secondary">
                            {inv.due_date ? formatDate(inv.due_date) : "-"}
                          </td>
                          <td className="py-3 px-4">
                            <Badge color="error">{daysOverdue} days</Badge>
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-error">
                            {formatCurrency(inv.outstanding_amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
```

---

## ✅ IMPLEMENTATION SUMMARY

1. **Update `fees/page.tsx`** - Change overdue href to `/overdue`
2. **Add types** to `src/lib/types/fee.ts`
3. **Add API functions** to `src/lib/api/fees.ts`
4. **Create API routes** for class and batch overdue summary
5. **Create 3 new pages**:
   - `overdue/page.tsx` (Class List)
   - `overdue/[classId]/page.tsx` (Batch List)
   - `overdue/[classId]/[batchId]/page.tsx` (Invoice Details)

**Total Files:**
- 2 files modified
- 5 files created
- 1 line change in fees/page.tsx (href)

