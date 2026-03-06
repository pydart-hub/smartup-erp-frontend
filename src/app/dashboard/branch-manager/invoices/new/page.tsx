"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Plus, Trash2, FileText, Search, Info,
  ShoppingCart, AlertCircle, CheckCircle2,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { salesInvoiceSchema, type SalesInvoiceFormValues } from "@/lib/validators/sales";
import {
  createSalesInvoice, submitSalesInvoice, makeSalesInvoiceFromSO,
  searchCustomers, searchItems, getItem,
} from "@/lib/api/sales";
import { getBranches } from "@/lib/api/enrollment";
import { formatCurrency } from "@/lib/utils/formatters";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";

const selectCls =
  "h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 w-full";

const disabledCls =
  "h-10 rounded-[10px] border border-border-input bg-app-bg px-3 text-sm text-text-secondary cursor-not-allowed w-full";

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-sm font-medium text-text-secondary mb-1.5 block">
      {children}{required && " *"}
    </label>
  );
}

function NewInvoiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const soParam = searchParams.get("so"); // pre-fill from Sales Order
  const { defaultCompany, allowedCompanies } = useAuth();

  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<{ name: string; customer_name: string }[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [soFullyBilled, setSoFullyBilled] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<SalesInvoiceFormValues>({
    resolver: zodResolver(salesInvoiceSchema) as any,
    defaultValues: {
      posting_date: new Date().toISOString().split("T")[0],
      company: defaultCompany || "",
      items: [{ item_code: "", qty: 1, rate: 0, uom: "Nos" }],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({ control, name: "items" });

  // ── Use Frappe's make_sales_invoice for proper SO→SI mapping ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: mappedDoc, isLoading: soLoading } = useQuery<Record<string, any>>({
    queryKey: ["make-sales-invoice", soParam],
    queryFn: () => makeSalesInvoiceFromSO(soParam!),
    enabled: !!soParam,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!mappedDoc) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: any[] = mappedDoc.items ?? [];
    if (items.length === 0) {
      setSoFullyBilled(true);
      return;
    }
    setSoFullyBilled(false);

    setValue("customer", mappedDoc.customer ?? "");
    setValue("company", mappedDoc.company ?? "");
    setValue("sales_order", soParam ?? "");
    if (mappedDoc.posting_date) setValue("posting_date", mappedDoc.posting_date);
    if (mappedDoc.due_date) setValue("due_date", mappedDoc.due_date);
    setCustomerSearch(mappedDoc.customer_name || mappedDoc.customer || "");

    replace(
      items.map((item) => ({
        item_code: item.item_code ?? "",
        item_name: item.item_name ?? "",
        description: item.description ?? "",
        qty: item.qty ?? 0,
        uom: item.uom ?? "Nos",
        rate: item.rate ?? 0,
        sales_order: item.sales_order ?? soParam ?? "",
        so_detail: item.so_detail ?? "",
      }))
    );
  }, [mappedDoc, setValue, replace, soParam]);

  // ── Branches ──────────────────────────────────────────────
  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
    staleTime: Infinity,
  });

  // ── All items ─────────────────────────────────────────────
  const { data: allItems = [] } = useQuery({
    queryKey: ["sales-items"],
    queryFn: () => searchItems("", 200),
    staleTime: 300_000,
  });

  // ── Customer search ────────────────────────────────────────
  useEffect(() => {
    if (soParam) return; // don't search when from SO — customer is locked
    if (customerSearch.length < 2) { setCustomerResults([]); return; }
    const t = setTimeout(async () => {
      const results = await searchCustomers(customerSearch);
      setCustomerResults(results);
      setShowCustomerDropdown(true);
    }, 350);
    return () => clearTimeout(t);
  }, [customerSearch, soParam]);

  // ── Grand total ────────────────────────────────────────────
  const watchedItems = watch("items");
  const grandTotal = (watchedItems ?? []).reduce(
    (sum, row) => sum + (Number(row.qty) || 0) * (Number(row.rate) || 0),
    0
  );

  // ── Auto-fill rate when item selected (only for manual invoices) ──
  async function handleItemChange(index: number, itemCode: string) {
    if (!itemCode) return;
    try {
      const item = await getItem(itemCode);
      setValue(`items.${index}.item_name`, item.item_name);
      setValue(`items.${index}.rate`, item.standard_rate ?? 0);
      setValue(`items.${index}.uom`, item.uom ?? "Nos");
      setValue(`items.${index}.description`, item.description ?? "");
    } catch {
      /* ignore */
    }
  }

  // ── Submit ────────────────────────────────────────────────
  async function onSubmit(values: SalesInvoiceFormValues) {
    try {
      const payload = {
        ...values,
        items: values.items.map((item) => ({
          ...item,
          amount: Number(item.qty) * Number(item.rate),
        })),
      };
      const res = await createSalesInvoice(payload);
      const invName = res.data.name;
      await submitSalesInvoice(invName);
      toast.success(`Invoice ${invName} created & submitted!`);
      router.push(`/dashboard/branch-manager/invoices/${encodeURIComponent(invName)}`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err as Error)?.message ??
        "Failed to create invoice";
      toast.error(msg);
    }
  }

  // ── SO fully billed state ─────────────────────────────────
  if (soParam && soFullyBilled) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-5xl mx-auto">
        <BreadcrumbNav />
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <h2 className="text-xl font-bold text-text-primary">Sales Order Fully Billed</h2>
          <p className="text-sm text-text-secondary text-center max-w-md">
            <span className="font-mono font-semibold text-primary">{soParam}</span> has already been
            fully invoiced. There are no remaining items to bill.
          </p>
          <div className="flex gap-3 mt-2">
            <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
            <Button
              variant="primary"
              onClick={() => router.push("/dashboard/branch-manager/sales-orders")}
            >
              <ShoppingCart className="h-4 w-4" /> View Sales Orders
            </Button>
          </div>
        </div>
      </motion.div>
    );
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
            <FileText className="h-5 w-5 text-primary" />
            {soParam ? "Create Invoice from Sales Order" : "New Sales Invoice"}
          </h1>
          {soParam && (
            <p className="text-xs text-info flex items-center gap-1 mt-0.5">
              <Info className="h-3.5 w-3.5" /> Mapped from Sales Order: {soParam}
            </p>
          )}
        </div>
      </div>

      {soLoading && (
        <Card>
          <CardContent className="p-8 flex items-center justify-center gap-3">
            <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-text-secondary">Loading Sales Order data…</span>
          </CardContent>
        </Card>
      )}

      {/* SO context banner */}
      {soParam && mappedDoc && !soLoading && (
        <Card className="border-info/30 bg-info/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <ShoppingCart className="h-5 w-5 text-info mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-bold text-primary">{soParam}</span>
                  <Badge variant="info">Sales Order</Badge>
                </div>
                <p className="text-sm text-text-secondary mt-1">
                  Customer: <span className="font-medium text-text-primary">{mappedDoc.customer_name || mappedDoc.customer}</span>
                  {" · "}Branch: <span className="font-medium text-text-primary">{mappedDoc.company?.replace("Smart Up ", "")}</span>
                  {" · "}Items to bill: <span className="font-semibold text-text-primary">{mappedDoc.items?.length ?? 0}</span>
                </p>
                <p className="text-xs text-text-tertiary mt-0.5">
                  Only unbilled quantities are shown. Items already fully invoiced are excluded.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {(!soParam || (mappedDoc && !soLoading)) && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Invoice Details */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-text-primary mb-5 pb-3 border-b border-border-light">
                Invoice Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

                {/* Customer — searchable (locked when from SO) */}
                <div className="relative md:col-span-2 lg:col-span-1">
                  <Label required>Customer</Label>
                  {soParam ? (
                    <input
                      type="text"
                      value={customerSearch}
                      disabled
                      className={disabledCls}
                    />
                  ) : (
                    <div className="relative">
                      <Input
                        placeholder="Type customer name…"
                        leftIcon={<Search className="h-4 w-4" />}
                        value={customerSearch}
                        onChange={(e) => { setCustomerSearch(e.target.value); setValue("customer", ""); }}
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
                              onClick={() => {
                                setValue("customer", c.name);
                                setCustomerSearch(c.customer_name);
                                setShowCustomerDropdown(false);
                              }}
                            >
                              <span className="font-medium text-text-primary">{c.customer_name}</span>
                              <span className="text-xs text-text-tertiary ml-2">{c.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <input type="hidden" {...register("customer")} />
                </div>

                {/* Company / Branch (locked when from SO) */}
                <div>
                  <Label required>Branch / Company</Label>
                  {soParam ? (
                    <input
                      type="text"
                      value={watch("company")?.replace("Smart Up ", "") ?? ""}
                      disabled
                      className={disabledCls}
                    />
                  ) : (
                    <select {...register("company")} className={selectCls}>
                      <option value="">Select branch…</option>
                      {(allowedCompanies.length > 0
                        ? branches.filter((b) => allowedCompanies.includes(b.name))
                        : branches
                      ).map((b) => (
                        <option key={b.name} value={b.name}>{b.name.replace("Smart Up ", "")}</option>
                      ))}
                    </select>
                  )}
                  {errors.company && <p className="text-xs text-error mt-1">{errors.company.message}</p>}
                </div>

                {/* Posting Date */}
                <div>
                  <Label required>Posting Date</Label>
                  <input type="date" {...register("posting_date")} className={selectCls} />
                  {errors.posting_date && <p className="text-xs text-error mt-1">{errors.posting_date.message}</p>}
                </div>

                {/* Due Date */}
                <div>
                  <Label>Due Date</Label>
                  <input type="date" {...register("due_date")} className={selectCls} />
                </div>

                {/* Sales Order (locked when from SO) */}
                <div>
                  <Label>Linked Sales Order</Label>
                  {soParam ? (
                    <input
                      type="text"
                      value={soParam}
                      disabled
                      className={disabledCls}
                    />
                  ) : (
                    <input
                      {...register("sales_order")}
                      placeholder="e.g. SAL-ORD-2026-00001"
                      className={selectCls}
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-border-light">
                <h3 className="font-semibold text-text-primary">
                  Items {soParam && <span className="text-xs font-normal text-text-tertiary ml-1">(unbilled only)</span>}
                </h3>
                {!soParam && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ item_code: "", qty: 1, rate: 0, uom: "Nos" })}
                  >
                    <Plus className="h-4 w-4" /> Add Row
                  </Button>
                )}
              </div>

              {errors.items?.root && (
                <p className="text-xs text-error mb-3">{errors.items.root.message}</p>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-light text-text-secondary text-xs font-semibold">
                      <th className="text-left pb-2 pr-3 w-[28%]">Item</th>
                      <th className="text-left pb-2 pr-3 w-[24%]">Description</th>
                      <th className="text-right pb-2 pr-3 w-[10%]">Qty</th>
                      <th className="text-left pb-2 pr-3 w-[8%]">UOM</th>
                      <th className="text-right pb-2 pr-3 w-[14%]">Rate (₹)</th>
                      <th className="text-right pb-2 pr-3 w-[14%]">Amount</th>
                      {!soParam && <th className="w-[5%]"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light">
                    {fields.map((field, index) => {
                      const qty = Number(watch(`items.${index}.qty`) ?? 0);
                      const rate = Number(watch(`items.${index}.rate`) ?? 0);
                      return (
                        <tr key={field.id}>
                          <td className="py-2 pr-3">
                            {soParam ? (
                              <div>
                                <p className="text-sm font-medium text-text-primary">
                                  {watch(`items.${index}.item_name`) || watch(`items.${index}.item_code`)}
                                </p>
                                <p className="text-xs text-text-tertiary font-mono">{watch(`items.${index}.item_code`)}</p>
                              </div>
                            ) : (
                              <>
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
                                  <p className="text-xs text-error">{errors.items[index]?.item_code?.message}</p>
                                )}
                              </>
                            )}
                            {/* Hidden fields for SO linkage */}
                            <input type="hidden" {...register(`items.${index}.item_name`)} />
                            <input type="hidden" {...register(`items.${index}.sales_order`)} />
                            <input type="hidden" {...register(`items.${index}.so_detail`)} />
                          </td>
                          <td className="py-2 pr-3">
                            {soParam ? (
                              <span className="text-sm text-text-secondary">{watch(`items.${index}.description`) || "—"}</span>
                            ) : (
                              <input
                                {...register(`items.${index}.description`)}
                                placeholder="Optional…"
                                className="h-9 w-full rounded-[8px] border border-border-input bg-surface px-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            )}
                          </td>
                          <td className="py-2 pr-3">
                            <input
                              type="number"
                              min={1}
                              {...register(`items.${index}.qty`)}
                              className="h-9 w-full rounded-[8px] border border-border-input bg-surface px-2 text-sm text-right text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </td>
                          <td className="py-2 pr-3">
                            <input
                              {...register(`items.${index}.uom`)}
                              placeholder="Nos"
                              className="h-9 w-full rounded-[8px] border border-border-input bg-surface px-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                              readOnly={!!soParam}
                            />
                          </td>
                          <td className="py-2 pr-3">
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              {...register(`items.${index}.rate`)}
                              className="h-9 w-full rounded-[8px] border border-border-input bg-surface px-2 text-sm text-right text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </td>
                          <td className="py-2 pr-3 text-right font-semibold text-text-primary">
                            {formatCurrency(qty * rate)}
                          </td>
                          {!soParam && (
                            <td className="py-2 text-center">
                              {fields.length > 1 && (
                                <button type="button" onClick={() => remove(index)} className="p-1 rounded text-text-tertiary hover:text-error">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </td>
                          )}
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
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create & Submit Invoice"}
            </Button>
          </div>
        </form>
      )}
    </motion.div>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={null}>
      <NewInvoiceContent />
    </Suspense>
  );
}