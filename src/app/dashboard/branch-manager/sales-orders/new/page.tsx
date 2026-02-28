"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Plus, Trash2, Loader2, ShoppingCart, Search,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { salesOrderSchema, type SalesOrderFormValues } from "@/lib/validators/sales";
import {
  createSalesOrder, submitSalesOrder,
  searchCustomers, searchItems, getItem,
  getStudentByCustomer, getTuitionFeeItem,
} from "@/lib/api/sales";
import { getBranches } from "@/lib/api/enrollment";
import { formatCurrency } from "@/lib/utils/formatters";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";

const selectCls =
  "h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 w-full";

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-sm font-medium text-text-secondary mb-1.5 block">
      {children}{required && " *"}
    </label>
  );
}

export default function NewSalesOrderPage() {
  const router = useRouter();
  const { defaultCompany, allowedCompanies } = useAuth();
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<{ name: string; customer_name: string }[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [linkedStudent, setLinkedStudent] = useState<{ name: string; student_name: string; custom_branch?: string; program?: string } | null>(null);
  const [autoFilling, setAutoFilling] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<SalesOrderFormValues>({
    resolver: zodResolver(salesOrderSchema) as any,
    defaultValues: {
      transaction_date: new Date().toISOString().split("T")[0],
      delivery_date: new Date().toISOString().split("T")[0],
      order_type: "Sales",
      company: defaultCompany || "",
      items: [{ item_code: "", qty: 1, rate: 0, uom: "Nos" }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  // ── Branches ──────────────────────────────────────────────
  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
    staleTime: Infinity,
  });

  // ── All items for dropdowns ────────────────────────────────
  const { data: allItems = [] } = useQuery({
    queryKey: ["sales-items"],
    queryFn: () => searchItems("", 200),
    staleTime: 300_000,
  });

  // ── Customer search ────────────────────────────────────────
  useEffect(() => {
    if (customerSearch.length < 2) { setCustomerResults([]); return; }
    const t = setTimeout(async () => {
      const results = await searchCustomers(customerSearch);
      setCustomerResults(results);
      setShowCustomerDropdown(true);
    }, 350);
    return () => clearTimeout(t);
  }, [customerSearch]);

  // ── Compute line totals + grand total ──────────────────────
  const watchedItems = watch("items");
  const grandTotal = (watchedItems ?? []).reduce(
    (sum, row) => sum + (Number(row.qty) || 0) * (Number(row.rate) || 0),
    0
  );

  // ── Customer select: look up linked student + auto-fill tuition item ────
  async function handleCustomerSelect(c: { name: string; customer_name: string }) {
    setValue("customer", c.name);
    setCustomerSearch(c.customer_name);
    setShowCustomerDropdown(false);
    setLinkedStudent(null);
    setAutoFilling(true);
    try {
      const student = await getStudentByCustomer(c.name);
      if (student) {
        setLinkedStudent(student);
        if (student.program) {
          const feeItem = await getTuitionFeeItem(student.program);
          if (feeItem) {
            // Replace the first empty item or add new row with tuition fee
            const currentItems = watch("items");
            const emptyIdx = currentItems.findIndex((i) => !i.item_code);
            if (emptyIdx !== -1) {
              setValue(`items.${emptyIdx}.item_code`, feeItem.item_code);
              setValue(`items.${emptyIdx}.item_name`, feeItem.item_name);
              setValue(`items.${emptyIdx}.rate`, feeItem.standard_rate ?? 0);
              setValue(`items.${emptyIdx}.uom`, feeItem.uom ?? "Nos");
              setValue(`items.${emptyIdx}.description`, feeItem.description ?? "");
            } else {
              append({
                item_code: feeItem.item_code,
                item_name: feeItem.item_name,
                qty: 1,
                rate: feeItem.standard_rate ?? 0,
                uom: feeItem.uom ?? "Nos",
                description: feeItem.description ?? "",
              });
            }
          }
        }
      }
    } catch {
      // non-critical — ignore
    } finally {
      setAutoFilling(false);
    }
  }

  // ── Auto-fill rate when item selected ─────────────────────
  async function handleItemChange(index: number, itemCode: string) {
    if (!itemCode) return;
    try {
      const item = await getItem(itemCode);
      setValue(`items.${index}.item_name`, item.item_name);
      setValue(`items.${index}.rate`, item.standard_rate ?? 0);
      setValue(`items.${index}.uom`, item.uom ?? "Nos");
      setValue(`items.${index}.description`, item.description ?? "");
    } catch {
      // item not found — ignore
    }
  }

  // ── Submit ────────────────────────────────────────────────
  async function onSubmit(values: SalesOrderFormValues) {
    try {
      const payload = {
        ...values,
        items: values.items.map((item) => ({
          ...item,
          amount: Number(item.qty) * Number(item.rate),
        })),
      };
      const res = await createSalesOrder(payload);
      const soName = res.data.name;
      // Auto-submit
      await submitSalesOrder(soName);
      toast.success(`Sales Order ${soName} created & submitted!`);
      router.push(`/dashboard/branch-manager/sales-orders/${encodeURIComponent(soName)}`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err as Error)?.message ??
        "Failed to create sales order";
      toast.error(msg);
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-5xl mx-auto">
      <BreadcrumbNav />

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-10 h-10 rounded-[10px] flex items-center justify-center text-text-secondary hover:bg-app-bg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            New Sales Order
          </h1>
          <p className="text-xs text-text-tertiary">Fill in the details below and submit</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Order Details Card */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-text-primary mb-5 pb-3 border-b border-border-light">
              Order Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

              {/* Customer — searchable */}
              <div className="relative md:col-span-2 lg:col-span-1">
                <Label required>Customer</Label>
                <div className="relative">
                  <Input
                    placeholder="Type customer name…"
                    leftIcon={<Search className="h-4 w-4" />}
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setValue("customer", "");
                    }}
                    onFocus={() => customerResults.length > 0 && setShowCustomerDropdown(true)}
                    onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                    error={errors.customer?.message}
                  />
                  {showCustomerDropdown && customerResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-surface border border-border-light rounded-[10px] shadow-lg max-h-48 overflow-y-auto">
                      {customerResults.map((c) => (
                        <button
                          key={c.name}
                          type="button"
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-brand-wash transition-colors"
                          onClick={() => handleCustomerSelect(c)}
                        >
                          <span className="font-medium text-text-primary">{c.customer_name}</span>
                          <span className="text-xs text-text-tertiary ml-2">{c.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Hidden register for validation */}
                <input type="hidden" {...register("customer")} />
                {/* Student info badge */}
                {autoFilling && (
                  <p className="text-xs text-text-tertiary mt-1.5 flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Looking up student info…
                  </p>
                )}
                {linkedStudent && !autoFilling && (
                  <div className="mt-2 flex items-center gap-2 rounded-[8px] bg-brand-wash border border-primary/20 px-3 py-1.5">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-primary">
                        {linkedStudent.student_name?.[0]?.toUpperCase() ?? "S"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-primary truncate">{linkedStudent.student_name}</p>
                      <p className="text-[10px] text-text-tertiary truncate">
                        {[linkedStudent.program, linkedStudent.custom_branch?.replace("Smart Up ", "")].filter(Boolean).join(" • ")}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Company / Branch */}
              <div>
                <Label required>Branch / Company</Label>
                <select {...register("company")} className={selectCls}>
                  <option value="">Select branch…</option>
                  {(allowedCompanies.length > 0
                    ? branches.filter((b) => allowedCompanies.includes(b.name))
                    : branches
                  ).map((b) => (
                    <option key={b.name} value={b.name}>
                      {b.name.replace("Smart Up ", "")}
                    </option>
                  ))}
                </select>
                {errors.company && (
                  <p className="text-xs text-error mt-1">{errors.company.message}</p>
                )}
              </div>

              {/* Transaction Date */}
              <div>
                <Label required>Order Date</Label>
                <input type="date" {...register("transaction_date")} className={selectCls} />
                {errors.transaction_date && (
                  <p className="text-xs text-error mt-1">{errors.transaction_date.message}</p>
                )}
              </div>

              {/* Delivery Date */}
              <div>
                <Label required>Delivery Date</Label>
                <input type="date" {...register("delivery_date")} className={selectCls} />
                {errors.delivery_date && (
                  <p className="text-xs text-error mt-1">{errors.delivery_date.message}</p>
                )}
              </div>

              {/* Order Type */}
              <div>
                <Label>Order Type</Label>
                <select {...register("order_type")} className={selectCls}>
                  <option value="Sales">Sales</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items Table */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-border-light">
              <h3 className="font-semibold text-text-primary">Items</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ item_code: "", qty: 1, rate: 0, uom: "Nos" })}
              >
                <Plus className="h-4 w-4" /> Add Row
              </Button>
            </div>

            {errors.items?.root && (
              <p className="text-xs text-error mb-3">{errors.items.root.message}</p>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-light text-text-secondary text-xs font-semibold">
                    <th className="text-left pb-2 pr-3 w-[30%]">Item</th>
                    <th className="text-left pb-2 pr-3 w-[30%]">Description</th>
                    <th className="text-right pb-2 pr-3 w-[10%]">Qty</th>
                    <th className="text-left pb-2 pr-3 w-[8%]">UOM</th>
                    <th className="text-right pb-2 pr-3 w-[12%]">Rate (₹)</th>
                    <th className="text-right pb-2 pr-3 w-[13%]">Amount</th>
                    <th className="w-[5%]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light">
                  {fields.map((field, index) => {
                    const qty = Number(watch(`items.${index}.qty`) ?? 0);
                    const rate = Number(watch(`items.${index}.rate`) ?? 0);
                    return (
                      <tr key={field.id}>
                        {/* Item select */}
                        <td className="py-2 pr-3">
                          <select
                            {...register(`items.${index}.item_code`)}
                            onChange={(e) => {
                              register(`items.${index}.item_code`).onChange(e);
                              handleItemChange(index, e.target.value);
                            }}
                            className={`${selectCls} h-9`}
                          >
                            <option value="">Select item…</option>
                            {allItems.map((item) => (
                              <option key={item.item_code} value={item.item_code}>
                                {item.item_name}
                              </option>
                            ))}
                          </select>
                          {errors.items?.[index]?.item_code && (
                            <p className="text-xs text-error mt-0.5">
                              {errors.items[index]?.item_code?.message}
                            </p>
                          )}
                        </td>
                        {/* Description */}
                        <td className="py-2 pr-3">
                          <input
                            {...register(`items.${index}.description`)}
                            placeholder="Optional…"
                            className="h-9 w-full rounded-[8px] border border-border-input bg-surface px-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </td>
                        {/* Qty */}
                        <td className="py-2 pr-3">
                          <input
                            type="number"
                            min={1}
                            {...register(`items.${index}.qty`)}
                            className="h-9 w-full rounded-[8px] border border-border-input bg-surface px-2 text-sm text-right text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </td>
                        {/* UOM */}
                        <td className="py-2 pr-3">
                          <input
                            {...register(`items.${index}.uom`)}
                            placeholder="Nos"
                            className="h-9 w-full rounded-[8px] border border-border-input bg-surface px-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </td>
                        {/* Rate */}
                        <td className="py-2 pr-3">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            {...register(`items.${index}.rate`)}
                            className="h-9 w-full rounded-[8px] border border-border-input bg-surface px-2 text-sm text-right text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </td>
                        {/* Amount */}
                        <td className="py-2 pr-3 text-right font-semibold text-text-primary">
                          {formatCurrency(qty * rate)}
                        </td>
                        {/* Remove */}
                        <td className="py-2 text-center">
                          {fields.length > 1 && (
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="p-1 rounded text-text-tertiary hover:text-error transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-4 pt-4 border-t border-border-light flex justify-end">
              <div className="w-48 space-y-1">
                <div className="flex justify-between text-sm text-text-secondary">
                  <span>Total</span>
                  <span className="font-medium text-text-primary">{formatCurrency(grandTotal)}</span>
                </div>
                <div className="flex justify-between text-base font-bold border-t border-border-light pt-1">
                  <span className="text-text-primary">Grand Total</span>
                  <span className="text-primary">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-6">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            {isSubmitting ? "Creating…" : "Create & Submit Order"}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
