"use client";

import { useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Search, Eye, CheckCircle2, XCircle, Trash } from "lucide-react";
import { toast } from "sonner";
import { api, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/format";
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

interface DocumentConfig {
  title: string;
  itemTitle: string;
  apiPath: string;
  partyLabel: string;
  partyField: "supplierId" | "customerId";
  partyPath: string;
  partyName: string;
  priceField: "costPrice" | "sellingPrice";
  priceLabel: string;
  confirmAction: string;
  cancelAction: string;
  listQueryParams: string[];
}

interface DocRow {
  id: string;
  [key: string]: any;
}

export function DocumentPage({ config }: { config: DocumentConfig }) {
  const { hasPerm } = useAuth();
  const qc = useQueryClient();
  const canCreate = hasPerm(`${config.confirmAction.split(".")[0]}.create`);
  const canConfirm = hasPerm(`${config.confirmAction.split(".")[0]}.confirm`);
  const canCancel = hasPerm(`${config.cancelAction.split(".")[0]}.cancel`);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<DocRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [form, setForm] = useState<any>({
    partyId: "",
    warehouseId: "",
    date: new Date().toISOString().slice(0, 10),
    discount: 0,
    tax: 0,
    note: "",
    items: [],
  });

  const partiesQ = useQuery({
    queryKey: [config.partyPath, "all"],
    queryFn: async () => (await api.get(`${config.partyPath}?limit=100`)).data.data,
  });
  const warehousesQ = useQuery({
    queryKey: ["warehouses", "all"],
    queryFn: async () => (await api.get("/warehouses?limit=100")).data.data,
  });
  const productsQ = useQuery({
    queryKey: ["products", "all"],
    queryFn: async () => (await api.get("/products?limit=100")).data.data,
  });

  const { data, isLoading } = useQuery({
    queryKey: [config.apiPath, page, search, status],
    queryFn: async () => {
      const params: Record<string, any> = { limit: 10, page };
      if (search) params.search = search;
      if (status) params.status = status;
      return (await api.get(config.apiPath, { params })).data;
    },
  });

  const list: DocRow[] = data?.data ?? [];
  const meta = data?.meta;

  const fetchDetail = async (row: DocRow) => {
    setDetail(row);
    setDetailLoading(true);
    try {
      const res = await api.get(`${config.apiPath}/${row.id}`);
      setDetail(res.data);
    } finally {
      setDetailLoading(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: async (payload: any) => (await api.post(config.apiPath, payload)).data,
    onSuccess: (doc) => {
      toast.success(`${config.itemTitle} created`);
      setCreateOpen(false);
      qc.invalidateQueries({ queryKey: [config.apiPath] });
      fetchDetail(doc);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const confirmMutation = useMutation({
    mutationFn: async (id: string) => (await api.post(`${config.apiPath}/${id}/confirm`)).data,
    onSuccess: (doc) => {
      toast.success(`${config.itemTitle} confirmed`);
      qc.invalidateQueries({ queryKey: [config.apiPath] });
      fetchDetail(doc);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => (await api.post(`${config.apiPath}/${id}/cancel`)).data,
    onSuccess: (doc) => {
      toast.success(`${config.itemTitle} cancelled`);
      qc.invalidateQueries({ queryKey: [config.apiPath] });
      fetchDetail(doc);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const setPartyId = (id: string) => setForm({ ...form, partyId: id });
  const setItem = (idx: number, patch: any) => {
    const items = form.items.map((it: any, i: number) => (i === idx ? { ...it, ...patch } : it));
    setForm({ ...form, items });
  };
  const addItem = () => {
    const items = [...form.items, { productId: "", quantity: 1, [config.priceField]: 0 }];
    setForm({ ...form, items });
  };
  const removeItem = (idx: number) => {
    setForm({ ...form, items: form.items.filter((_: any, i: number) => i !== idx) });
  };

  const itemTotal = (it: any) => Number(it.quantity) * Number(it[config.priceField] ?? 0);
  const subTotal = form.items.reduce((s: number, it: any) => s + itemTotal(it), 0);
  const total = subTotal - Number(form.discount || 0) + (subTotal - Number(form.discount || 0)) * (Number(form.tax || 0) / 100);

  const submit = () => {
    if (form.items.length === 0 || form.items.some((it: any) => !it.productId)) {
      toast.error("Add at least one line item with a product");
      return;
    }
    if (!form.partyId) {
      toast.error(`Please select a ${config.partyLabel}`);
      return;
    }
    createMutation.mutate({
      [config.partyField]: form.partyId,
      warehouseId: form.warehouseId || undefined,
      purchaseDate: config.partyField === "supplierId" ? form.date || undefined : undefined,
      saleDate: config.partyField === "customerId" ? form.date || undefined : undefined,
      discount: Number(form.discount || 0),
      tax: Number(form.tax || 0),
      note: form.note || undefined,
      items: form.items.map((it: any) => ({
        productId: it.productId,
        quantity: Number(it.quantity),
        [config.priceField]: Number(it[config.priceField] ?? 0),
      })),
    });
  };

  const detailItems = detail?.items ?? [];

  return (
    <div>
      <PageHeader
        title={config.title}
        subtitle={`Manage ${config.title.toLowerCase()}`}
        action={
          canCreate ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New {config.itemTitle}
            </Button>
          ) : undefined
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div className="relative flex-1 min-w-52">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              className="pl-9"
              placeholder="Search by invoice no..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select className="w-40" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All status</option>
            <option value="DRAFT">Draft</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
        </div>

        {isLoading ? (
          <Spinner />
        ) : list.length === 0 ? (
          <EmptyState message={`No ${config.title.toLowerCase()} found`} />
        ) : (
          <>
            <Table>
              <THead>
                <Th>Invoice</Th>
                <Th>{config.partyLabel}</Th>
                <Th className="hidden md:table-cell">Date</Th>
                <Th className="hidden lg:table-cell">Items</Th>
                <Th className="text-right">Total</Th>
                <Th className="text-right">Due</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </THead>
              <TBody>
                {list.map((row) => (
                  <Tr key={row.id}>
                    <Td>
                      <button
                        onClick={() => fetchDetail(row)}
                        className="font-mono text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                      >
                        {row.invoiceNo}
                      </button>
                    </Td>
                    <Td>{config.partyField === "supplierId" ? row.supplier?.name ?? "-" : row.customer?.name ?? "-"}</Td>
                    <Td className="hidden md:table-cell">{formatDate(config.partyField === "supplierId" ? row.purchaseDate : row.saleDate)}</Td>
                    <Td className="hidden lg:table-cell">{row._count?.items ?? "-"}</Td>
                    <Td className="text-right font-semibold">{formatCurrency(row.total)}</Td>
                    <Td className="text-right text-amber-600">{formatCurrency(row.dueAmount)}</Td>
                    <Td>
                      <Badge tone={statusTone(row.status)}>{row.status}</Badge>
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => fetchDetail(row)} aria-label="View">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {canConfirm && row.status === "DRAFT" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-emerald-600 hover:text-emerald-700"
                            onClick={() => confirmMutation.mutate(row.id)}
                            aria-label="Confirm"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                        {canCancel && row.status === "DRAFT" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-600"
                            onClick={() => cancelMutation.mutate(row.id)}
                            aria-label="Cancel"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} totalPages={meta?.totalPages ?? 1} total={meta?.total ?? 0} onPage={setPage} />
          </>
        )}
      </Card>

      {/* Create modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={`New ${config.itemTitle}`} wide>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label={config.partyLabel} required>
            <Select value={form.partyId} onChange={(e) => setPartyId(e.target.value)}>
              <option value="">Select {config.partyLabel.toLowerCase()}...</option>
              {partiesQ.data?.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Warehouse">
            <Select value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}>
              <option value="">Select warehouse...</option>
              {warehousesQ.data?.map((w: any) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Date">
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Line Items</p>
            <Button variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-3.5 w-3.5" /> Add item
            </Button>
          </div>
          <div className="space-y-2">
            {form.items.map((it: any, idx: number) => (
              <div key={idx} className="grid grid-cols-12 items-end gap-2">
                <div className="col-span-12 sm:col-span-5">
                  <Field label="Product">
                    <Select value={it.productId} onChange={(e) => setItem(idx, { productId: e.target.value })}>
                      <option value="">Select product...</option>
                      {productsQ.data?.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <Field label="Qty">
                    <Input type="number" min={1} value={it.quantity} onChange={(e) => setItem(idx, { quantity: e.target.value })} />
                  </Field>
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <Field label={config.priceLabel}>
                    <Input type="number" min={0} value={it[config.priceField]} onChange={(e) => setItem(idx, { [config.priceField]: e.target.value })} />
                  </Field>
                </div>
                <div className="col-span-3 sm:col-span-2 py-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(itemTotal(it))}
                </div>
                <div className="col-span-1 flex justify-end pb-1">
                  <Button variant="ghost" size="icon" className="text-red-500" onClick={() => removeItem(idx)} aria-label="Remove item">
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {form.items.length === 0 && (
              <p className="rounded-lg border border-dashed border-zinc-300 py-4 text-center text-xs text-zinc-400 dark:border-zinc-700">
                No items yet
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Discount">
            <Input type="number" min={0} value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
          </Field>
          <Field label="Tax (%)">
            <Input type="number" min={0} value={form.tax} onChange={(e) => setForm({ ...form, tax: e.target.value })} />
          </Field>
          <div>
            <Field label="Subtotal">
              <Input value={formatCurrency(subTotal)} disabled />
            </Field>
          </div>
          <div>
            <Field label="Total">
              <Input value={formatCurrency(total)} disabled className="font-semibold" />
            </Field>
          </div>
        </div>

        <div className="mt-4">
          <Field label="Note">
            <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Optional note..." />
          </Field>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button onClick={submit} loading={createMutation.isPending}>
            Create {config.itemTitle}
          </Button>
        </div>
      </Modal>

      {/* Detail modal */}
      <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title={`${config.itemTitle} ${detail?.invoiceNo ?? ""}`} wide>
        {detailLoading ? (
          <Spinner />
        ) : detail ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-xs text-zinc-400">{config.partyLabel}</p>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {config.partyField === "supplierId" ? detail.supplier?.name : detail.customer?.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Date</p>
                  <p className="text-zinc-900 dark:text-zinc-100">
                    {formatDate(config.partyField === "supplierId" ? detail.purchaseDate : detail.saleDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Warehouse</p>
                  <p className="text-zinc-900 dark:text-zinc-100">{detail.warehouse?.name ?? "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Created by</p>
                  <p className="text-zinc-900 dark:text-zinc-100">{detail.createdByUser?.name ?? "-"}</p>
                </div>
              </div>
              <Badge tone={statusTone(detail.status)}>{detail.status}</Badge>
            </div>

            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/40">
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">{config.priceLabel}</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
                  {detailItems.map((it: any) => (
                    <tr key={it.id}>
                      <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">
                        {it.product?.name}
                        <span className="ml-1 font-mono text-[11px] text-zinc-400">{it.product?.sku}</span>
                      </td>
                      <td className="px-3 py-2 text-right text-zinc-700 dark:text-zinc-300">{it.quantity}</td>
                      <td className="px-3 py-2 text-right text-zinc-700 dark:text-zinc-300">
                        {formatCurrency(it[config.priceField])}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(it.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-1 text-sm sm:ml-auto sm:w-64">
              <div className="flex justify-between text-zinc-500">
                <span>Subtotal</span><span>{formatCurrency(detail.subTotal)}</span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>Discount</span><span>-{formatCurrency(detail.discount)}</span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>Tax</span><span>{Number(detail.tax)}%</span>
              </div>
              <div className="flex justify-between border-t border-zinc-200 pt-1 text-base font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">
                <span>Total</span><span>{formatCurrency(detail.total)}</span>
              </div>
              <div className="flex justify-between text-sm text-zinc-500">
                <span>Paid</span><span className="text-emerald-600">{formatCurrency(detail.paidAmount)}</span>
              </div>
              <div className="flex justify-between text-sm text-zinc-500">
                <span>Due</span><span className="text-amber-600">{formatCurrency(detail.dueAmount)}</span>
              </div>
            </div>

            {detail.payments && detail.payments.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">Payments</p>
                <div className="space-y-1">
                  {detail.payments.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-800/40">
                      <span className="text-zinc-500">{p.paymentNo} · {formatDate(p.paymentDate)}</span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detail.note && (
              <p className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-800/40 dark:text-zinc-300">
                {detail.note}
              </p>
            )}

            {detail.status === "DRAFT" && (
              <div className="flex justify-end gap-2">
                {canCancel && (
                  <Button variant="danger" loading={cancelMutation.isPending} onClick={() => cancelMutation.mutate(detail.id)}>
                    Cancel
                  </Button>
                )}
                {canConfirm && (
                  <Button loading={confirmMutation.isPending} onClick={() => confirmMutation.mutate(detail.id)}>
                    Confirm
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
