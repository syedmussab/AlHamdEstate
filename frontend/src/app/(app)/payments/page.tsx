"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { api, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatCurrency, formatDateTime } from "@/lib/format";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Pagination,
  Select,
  Spinner,
  TBody,
  Td,
  Th,
  THead,
  Table,
  Tr,
} from "@/lib/ui";

const METHODS = ["CASH", "CARD", "BANK_TRANSFER", "CHEQUE", "OTHER"];

export default function PaymentsPage() {
  const { hasPerm } = useAuth();
  const qc = useQueryClient();
  const canRead = hasPerm("payments.read");
  const canCreate = hasPerm("payments.create");

  const [tab, setTab] = useState<"RECEIVED" | "PAID">("RECEIVED");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<any>({
    type: "RECEIVED",
    amount: "",
    method: "CASH",
    paymentDate: "",
    purchaseId: "",
    saleId: "",
    supplierId: "",
    customerId: "",
    note: "",
  });

  const purchasesQ = useQuery({
    queryKey: ["purchases", "refs"],
    queryFn: async () => (await api.get("/purchases", { params: { limit: 100, status: "CONFIRMED" } })).data.data,
  });
  const salesQ = useQuery({
    queryKey: ["sales", "refs"],
    queryFn: async () => (await api.get("/sales", { params: { limit: 100, status: "CONFIRMED" } })).data.data,
  });
  const suppliersQ = useQuery({
    queryKey: ["suppliers", "all"],
    queryFn: async () => (await api.get("/suppliers?limit=100")).data.data,
  });
  const customersQ = useQuery({
    queryKey: ["customers", "all"],
    queryFn: async () => (await api.get("/customers?limit=100")).data.data,
  });

  const listQ = useQuery({
    queryKey: ["payments", tab, page],
    queryFn: async () => (await api.get("/payments", { params: { limit: 10, page, type: tab } })).data,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => (await api.post("/payments", payload)).data,
    onSuccess: () => {
      toast.success("Payment recorded");
      setCreateOpen(false);
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["purchases"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const list = listQ.data?.data ?? [];

  const submit = () => {
    if (!Number(form.amount) || Number(form.amount) <= 0) return toast.error("Enter a valid amount");
    createMutation.mutate({
      type: form.type,
      amount: Number(form.amount),
      method: form.method || undefined,
      paymentDate: form.paymentDate || undefined,
      purchaseId: form.purchaseId || undefined,
      saleId: form.saleId || undefined,
      supplierId: form.supplierId || undefined,
      customerId: form.customerId || undefined,
      note: form.note || undefined,
    });
  };

  return (
    <div>
      <PageHeader
        title="Payments"
        subtitle="Record and track payments received and paid"
        action={canCreate ? (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Record Payment
          </Button>
        ) : undefined}
      />

      <Card>
        <div className="flex gap-1 border-b border-zinc-200 px-4 pt-3 dark:border-zinc-800">
          {(["RECEIVED", "PAID"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setPage(1); }}
              className={`rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                tab === t
                  ? "border-emerald-600 text-emerald-700 dark:text-emerald-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              {t === "RECEIVED" ? "Money In" : "Money Out"}
            </button>
          ))}
        </div>

        {!canRead ? (
          <div className="p-6 text-sm text-zinc-500">You don&apos;t have permission to view payments.</div>
        ) : listQ.isLoading ? (
          <Spinner />
        ) : list.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <Table>
              <THead>
                <Th>Reference</Th>
                <Th className="hidden md:table-cell">Against</Th>
                <Th className="hidden lg:table-cell">Method</Th>
                <Th className="text-right">Amount</Th>
                <Th className="hidden lg:table-cell">Date</Th>
                <Th className="hidden lg:table-cell">Recorded By</Th>
              </THead>
              <TBody>
                {list.map((p: any) => (
                  <Tr key={p.id}>
                    <Td className="font-mono text-xs">{p.paymentNo}</Td>
                    <Td className="hidden md:table-cell">
                      {p.purchase ? `Purchase ${p.purchase.invoiceNo}` : p.sale ? `Sale ${p.sale.invoiceNo}` : p.supplier?.name ?? p.customer?.name ?? "General"}
                    </Td>
                    <Td className="hidden lg:table-cell">
                      <Badge tone={p.method === "CASH" ? "green" : "blue"}>{p.method}</Badge>
                    </Td>
                    <Td className={`text-right font-semibold ${p.type === "RECEIVED" ? "text-emerald-600" : "text-red-500"}`}>
                      {p.type === "RECEIVED" ? "+" : "-"}{formatCurrency(p.amount)}
                    </Td>
                    <Td className="hidden lg:table-cell">{formatDateTime(p.paymentDate)}</Td>
                    <Td className="hidden lg:table-cell">{p.user?.name}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} totalPages={listQ.data?.meta?.totalPages ?? 1} total={listQ.data?.meta?.total ?? 0} onPage={setPage} />
          </>
        )}
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Record Payment">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type" required>
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="RECEIVED">Received (money in)</option>
                <option value="PAID">Paid (money out)</option>
              </Select>
            </Field>
            <Field label="Amount" required>
              <Input type="number" min={0.01} step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Method">
              <Select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                {METHODS.map((m) => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
              </Select>
            </Field>
            <Field label="Payment Date">
              <Input type="date" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} />
            </Field>
          </div>

          {form.type === "PAID" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Against Purchase">
                <Select value={form.purchaseId} onChange={(e) => setForm({ ...form, purchaseId: e.target.value })}>
                  <option value="">None</option>
                  {purchasesQ.data?.map((p: any) => <option key={p.id} value={p.id}>{p.invoiceNo}</option>)}
                </Select>
              </Field>
              <Field label="Supplier">
                <Select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
                  <option value="">None</option>
                  {suppliersQ.data?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </Field>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Against Sale">
                <Select value={form.saleId} onChange={(e) => setForm({ ...form, saleId: e.target.value })}>
                  <option value="">None</option>
                  {salesQ.data?.map((s: any) => <option key={s.id} value={s.id}>{s.invoiceNo}</option>)}
                </Select>
              </Field>
              <Field label="Customer">
                <Select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
                  <option value="">None</option>
                  {customersQ.data?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
            </div>
          )}

          <Field label="Note">
            <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button onClick={submit} loading={createMutation.isPending}>Save Payment</Button>
        </div>
      </Modal>
    </div>
  );
}
