"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft, Plus, Eye, X, Check } from "lucide-react";
import { toast } from "sonner";
import { api, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/format";
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

const STATUSES = ["PENDING", "CONFIRMED", "CANCELLED"];

export default function TransfersPage() {
  const { hasPerm } = useAuth();
  const qc = useQueryClient();
  const can = hasPerm("stock.transfer");

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [search, setSearch] = useState("");

  const [items, setItems] = useState<any[]>([{ productId: "", quantity: 1 }]);
  const [form, setForm] = useState<any>({ fromWarehouseId: "", toWarehouseId: "", transferDate: "", note: "" });

  const productsQ = useQuery({
    queryKey: ["products", "all"],
    queryFn: async () => (await api.get("/products?limit=100")).data.data,
  });
  const warehousesQ = useQuery({
    queryKey: ["warehouses", "all"],
    queryFn: async () => (await api.get("/warehouses?limit=100")).data.data,
  });

  const listQ = useQuery({
    queryKey: ["transfers", page, status],
    queryFn: async () => {
      const params: Record<string, any> = { limit: 10, page };
      if (status) params.status = status;
      return (await api.get("/stock-transfers", { params })).data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => (await api.post("/stock-transfers", payload)).data,
    onSuccess: () => {
      toast.success("Transfer created");
      setCreateOpen(false);
      qc.invalidateQueries({ queryKey: ["transfers"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const confirmMutation = useMutation({
    mutationFn: async (id: string) => (await api.patch(`/stock-transfers/${id}/confirm`)).data,
    onSuccess: () => {
      toast.success("Transfer confirmed");
      qc.invalidateQueries({ queryKey: ["transfers"] });
      setDetail(null);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => (await api.patch(`/stock-transfers/${id}/cancel`)).data,
    onSuccess: () => {
      toast.success("Transfer cancelled");
      qc.invalidateQueries({ queryKey: ["transfers"] });
      setDetail(null);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const data = listQ.data;
  const list = data?.data ?? [];

  const addItem = () => setItems([...items, { productId: "", quantity: 1 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const setItem = (i: number, patch: any) => setItems(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  const submit = () => {
    if (!form.fromWarehouseId || !form.toWarehouseId) return toast.error("Select source and destination phases");
    if (form.fromWarehouseId === form.toWarehouseId) return toast.error("Source and destination must differ");
    const valid = items.filter((i) => i.productId && Number(i.quantity) > 0);
    if (valid.length === 0) return toast.error("Add at least one item");
    createMutation.mutate({ ...form, transferDate: form.transferDate || undefined, items: valid.map((i) => ({ productId: i.productId, quantity: Number(i.quantity) })) });
  };

  return (
    <div>
      <PageHeader
        title="Property Transfers"
        subtitle="Transfer properties between phases"
        action={can ? (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New Transfer
          </Button>
        ) : undefined}
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div className="flex gap-1">
            <button
              onClick={() => setStatus("")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${!status ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"}`}
            >
              All
            </button>
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${status === s ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"}`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Input
              placeholder="Search transfer #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {listQ.isLoading ? (
          <Spinner />
        ) : list.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <Table>
              <THead>
                <Th>Transfer #</Th>
                <Th>Phase Route</Th>
                <Th>Items</Th>
                <Th className="hidden md:table-cell">Date</Th>
                <Th>Status</Th>
                <Th className="text-right">Action</Th>
              </THead>
              <TBody>
                {list
                  .filter((t: any) => !search || t.transferNo.toLowerCase().includes(search.toLowerCase()))
                  .map((t: any) => (
                    <Tr key={t.id}>
                      <Td className="font-mono text-xs font-medium">{t.transferNo}</Td>
                      <Td>
                        <span className="font-medium">{t.fromWarehouse?.name}</span>
                        <ArrowRightLeft className="mx-1 inline h-3 w-3 text-zinc-400" />
                        <span className="font-medium">{t.toWarehouse?.name}</span>
                      </Td>
                      <Td>{t.items?.length ?? 0}</Td>
                      <Td className="hidden md:table-cell">{formatDate(t.transferDate)}</Td>
                      <Td><Badge tone={statusTone(t.status)}>{t.status}</Badge></Td>
                      <Td className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setDetail(t)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Td>
                    </Tr>
                  ))}
              </TBody>
            </Table>
            <Pagination page={page} totalPages={data?.meta?.totalPages ?? 1} total={data?.meta?.total ?? 0} onPage={setPage} />
          </>
        )}
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Transfer">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="From Phase" required>
              <Select value={form.fromWarehouseId} onChange={(e) => setForm({ ...form, fromWarehouseId: e.target.value })}>
                <option value="">Select...</option>
                {warehousesQ.data?.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </Select>
            </Field>
            <Field label="To Phase" required>
              <Select value={form.toWarehouseId} onChange={(e) => setForm({ ...form, toWarehouseId: e.target.value })}>
                <option value="">Select...</option>
                {warehousesQ.data?.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Transfer Date">
            <Input type="date" value={form.transferDate} onChange={(e) => setForm({ ...form, transferDate: e.target.value })} />
          </Field>
          <Field label="Note">
            <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </Field>

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
                  <Input className="w-24" type="number" min={1} value={it.quantity} onChange={(e) => setItem(i, { quantity: e.target.value })} />
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
          <Button onClick={submit} loading={createMutation.isPending}>Create Transfer</Button>
        </div>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={`Transfer ${detail?.transferNo ?? ""}`}>
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-zinc-50 p-3 text-sm dark:bg-zinc-800/50">
              <div>
                <p className="text-xs text-zinc-500">From</p>
                <p className="font-medium">{detail.fromWarehouse?.name}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">To</p>
                <p className="font-medium">{detail.toWarehouse?.name}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Date</p>
                <p>{formatDateTime(detail.transferDate)}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Status</p>
                <Badge tone={statusTone(detail.status)}>{detail.status}</Badge>
              </div>
              {detail.note && (
                <div className="col-span-2">
                  <p className="text-xs text-zinc-500">Note</p>
                  <p>{detail.note}</p>
                </div>
              )}
            </div>
            <Table>
              <THead>
                <Th>Product</Th>
                <Th className="text-right">Qty</Th>
              </THead>
              <TBody>
                {detail.items?.map((it: any) => (
                  <Tr key={it.id}>
                    <Td>{it.product?.name}</Td>
                    <Td className="text-right">{it.quantity}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
            {detail.status === "PENDING" && (
              <div className="flex justify-end gap-2">
                <Button variant="outline" className="text-red-600" onClick={() => cancelMutation.mutate(detail.id)} loading={cancelMutation.isPending}>
                  <X className="h-4 w-4" /> Cancel
                </Button>
                <Button onClick={() => confirmMutation.mutate(detail.id)} loading={confirmMutation.isPending}>
                  <Check className="h-4 w-4" /> Confirm
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
