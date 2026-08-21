"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Eye, X } from "lucide-react";
import { toast } from "sonner";
import { api, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
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
  statusTone,
} from "@/lib/ui";

export default function ReturnsPage() {
  const { hasPerm } = useAuth();
  const qc = useQueryClient();
  const canCreate = hasPerm("returns.create");
  const canRead = hasPerm("returns.read");

  const [tab, setTab] = useState<"purchase" | "sale">("purchase");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [form, setForm] = useState<any>({ refId: "", returnDate: "", reason: "" });
  const [items, setItems] = useState<any[]>([{ productId: "", quantity: 1, unitPrice: 0 }]);

  const purchasesQ = useQuery({
    queryKey: ["purchases", "refs"],
    queryFn: async () => (await api.get("/purchases", { params: { limit: 100, status: "CONFIRMED" } })).data.data,
  });
  const salesQ = useQuery({
    queryKey: ["sales", "refs"],
    queryFn: async () => (await api.get("/sales", { params: { limit: 100, status: "CONFIRMED" } })).data.data,
  });
  const productsQ = useQuery({
    queryKey: ["products", "all"],
    queryFn: async () => (await api.get("/products?limit=100")).data.data,
  });

  const listQ = useQuery({
    queryKey: [tab === "purchase" ? "purchase-returns" : "sale-returns", page],
    queryFn: async () => {
      const path = tab === "purchase" ? "/purchase-returns" : "/sale-returns";
      return (await api.get(path, { params: { limit: 10, page } })).data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const path = tab === "purchase" ? "/purchase-returns" : "/sale-returns";
      return (await api.post(path, payload)).data;
    },
    onSuccess: () => {
      toast.success("Return created");
      setCreateOpen(false);
      qc.invalidateQueries({ queryKey: ["purchase-returns"] });
      qc.invalidateQueries({ queryKey: ["sale-returns"] });
      qc.invalidateQueries({ queryKey: ["stock"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const refs = tab === "purchase" ? purchasesQ.data ?? [] : salesQ.data ?? [];
  const list = listQ.data?.data ?? [];

  const addItem = () => setItems([...items, { productId: "", quantity: 1, unitPrice: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const setItem = (i: number, patch: any) => setItems(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  const submit = () => {
    if (!form.refId) return toast.error(`Select ${tab === "purchase" ? "purchase" : "sale"} invoice`);
    const valid = items.filter((i) => i.productId && Number(i.quantity) > 0);
    if (valid.length === 0) return toast.error("Add at least one item");
    const payload: any = {
      [tab === "purchase" ? "purchaseId" : "saleId"]: form.refId,
      returnDate: form.returnDate || undefined,
      reason: form.reason || undefined,
      items: valid.map((i) => ({ productId: i.productId, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })),
    };
    createMutation.mutate(payload);
  };

  return (
    <div>
      <PageHeader
        title="Returns"
        subtitle="Purchase and sale returns"
        action={canCreate ? (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New {tab === "purchase" ? "Purchase" : "Sale"} Return
          </Button>
        ) : undefined}
      />

      <Card>
        <div className="flex gap-1 border-b border-zinc-200 px-4 pt-3 dark:border-zinc-800">
          {(["purchase", "sale"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setPage(1); }}
              className={`rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                tab === t
                  ? "border-emerald-600 text-emerald-700 dark:text-emerald-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              {t === "purchase" ? "Purchase Returns" : "Sale Returns"}
            </button>
          ))}
        </div>

        {!canRead ? (
          <div className="p-6 text-sm text-zinc-500">You don&apos;t have permission to view returns.</div>
        ) : listQ.isLoading ? (
          <Spinner />
        ) : list.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <Table>
              <THead>
                <Th>Return #</Th>
                <Th>{tab === "purchase" ? "Purchase Invoice" : "Sale Invoice"}</Th>
                <Th className="hidden md:table-cell">{tab === "purchase" ? "Supplier" : "Customer"}</Th>
                <Th className="text-right">Total</Th>
                <Th className="hidden lg:table-cell">Date</Th>
                <Th>Status</Th>
                <Th className="text-right">Action</Th>
              </THead>
              <TBody>
                {list.map((r: any) => (
                  <Tr key={r.id}>
                    <Td className="font-mono text-xs">{r.returnNo}</Td>
                    <Td className="font-mono text-xs">{tab === "purchase" ? r.purchase?.invoiceNo : r.sale?.invoiceNo}</Td>
                    <Td className="hidden md:table-cell">{tab === "purchase" ? r.supplier?.name : r.customer?.name}</Td>
                    <Td className="text-right font-medium">{formatCurrency(r.total)}</Td>
                    <Td className="hidden lg:table-cell">{formatDate(r.returnDate)}</Td>
                    <Td><Badge tone={statusTone(r.status)}>{r.status}</Badge></Td>
                    <Td className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setDetail(r)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} totalPages={listQ.data?.meta?.totalPages ?? 1} total={listQ.data?.meta?.total ?? 0} onPage={setPage} />
          </>
        )}
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={`New ${tab === "purchase" ? "Purchase" : "Sale"} Return`}>
        <div className="space-y-4">
          <Field label={tab === "purchase" ? "Purchase Invoice" : "Sale Invoice"} required>
            <Select value={form.refId} onChange={(e) => setForm({ ...form, refId: e.target.value })}>
              <option value="">Select invoice...</option>
              {refs.map((r: any) => (
                <option key={r.id} value={r.id}>
                  {tab === "purchase" ? r.invoiceNo : r.invoiceNo}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Return Date">
              <Input type="date" value={form.returnDate} onChange={(e) => setForm({ ...form, returnDate: e.target.value })} />
            </Field>
            <Field label="Reason">
              <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. damaged goods..." />
            </Field>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Items</p>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-3.5 w-3.5" /> Add Item
              </Button>
            </div>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Select className="flex-1" value={it.productId} onChange={(e) => setItem(i, { productId: e.target.value })}>
                    <option value="">Select product...</option>
                    {productsQ.data?.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                  </Select>
                  <Input className="w-24" type="number" min={1} placeholder="Qty" value={it.quantity} onChange={(e) => setItem(i, { quantity: e.target.value })} />
                  <Input className="w-28" type="number" min={0} step="0.01" placeholder="Price" value={it.unitPrice} onChange={(e) => setItem(i, { unitPrice: e.target.value })} />
                  <Button variant="ghost" size="sm" onClick={() => removeItem(i)}>
                    <X className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button onClick={submit} loading={createMutation.isPending}>Create Return</Button>
        </div>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={`Return ${detail?.returnNo ?? ""}`}>
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-800/50">
              <div>
                <p className="text-xs text-zinc-500">{tab === "purchase" ? "Purchase" : "Sale"} Invoice</p>
                <p className="font-mono text-xs">{tab === "purchase" ? detail.purchase?.invoiceNo : detail.sale?.invoiceNo}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Status</p>
                <Badge tone={statusTone(detail.status)}>{detail.status}</Badge>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Date</p>
                <p>{formatDateTime(detail.returnDate)}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Warehouse</p>
                <p>{detail.warehouse?.name ?? "-"}</p>
              </div>
              {detail.reason && (
                <div className="col-span-2">
                  <p className="text-xs text-zinc-500">Reason</p>
                  <p>{detail.reason}</p>
                </div>
              )}
            </div>
            <Table>
              <THead>
                <Th>Product</Th>
                <Th className="text-right">Qty</Th>
                <Th className="text-right">Unit Price</Th>
                <Th className="text-right">Line Total</Th>
              </THead>
              <TBody>
                {detail.items?.map((it: any) => (
                  <Tr key={it.id}>
                    <Td>{it.product?.name}</Td>
                    <Td className="text-right">{it.quantity}</Td>
                    <Td className="text-right">{formatCurrency(it.unitPrice)}</Td>
                    <Td className="text-right">{formatCurrency(it.lineTotal ?? it.quantity * it.unitPrice)}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
            <div className="flex justify-between border-t border-zinc-200 pt-3 text-sm dark:border-zinc-800">
              <span className="font-medium text-zinc-500">Total</span>
              <span className="text-lg font-semibold">{formatCurrency(detail.total)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
