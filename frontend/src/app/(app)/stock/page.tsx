"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, SlidersHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import { api, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";
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

const TABS = [
  { key: "stock", label: "Available Units" },
  { key: "movements", label: "Movements" },
  { key: "low", label: "Low Stock" },
];

export default function StockPage() {
  const { hasPerm } = useAuth();
  const qc = useQueryClient();
  const canAdjust = hasPerm("stock.adjust");

  const [tab, setTab] = useState("stock");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [adjustOpen, setAdjustOpen] = useState(false);

  const [form, setForm] = useState<any>({
    productId: "",
    warehouseId: "",
    quantity: 0,
    reason: "",
  });

  const productsQ = useQuery({
    queryKey: ["products", "all"],
    queryFn: async () => (await api.get("/products?limit=100")).data.data,
  });
  const warehousesQ = useQuery({
    queryKey: ["warehouses", "all"],
    queryFn: async () => (await api.get("/warehouses?limit=100")).data.data,
  });

  const stockQ = useQuery({
    queryKey: ["stock", page, search],
    queryFn: async () => {
      const params: Record<string, any> = { limit: 10, page };
      if (search) params.search = search;
      return (await api.get("/stock", { params })).data;
    },
  });

  const movementsQ = useQuery({
    queryKey: ["stock-movements", page],
    queryFn: async () => (await api.get("/stock-movements", { params: { limit: 10, page } })).data,
  });

  const lowStockQ = useQuery({
    queryKey: ["stock-low", page],
    queryFn: async () => (await api.get("/stock/low-stock", { params: { limit: 10, page } })).data,
  });

  const adjustMutation = useMutation({
    mutationFn: async (payload: any) => (await api.post("/stock/adjustments", payload)).data,
    onSuccess: () => {
      toast.success("Stock adjusted");
      setAdjustOpen(false);
      qc.invalidateQueries({ queryKey: ["stock"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
      qc.invalidateQueries({ queryKey: ["stock-low"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const data = tab === "stock" ? stockQ.data : tab === "movements" ? movementsQ.data : lowStockQ.data;
  const list = data?.data ?? [];
  const meta = data?.meta;
  const loading = tab === "stock" ? stockQ.isLoading : tab === "movements" ? movementsQ.isLoading : lowStockQ.isLoading;

  const submitAdjust = () => {
    if (!form.productId || !form.warehouseId) {
      toast.error("Select product and warehouse");
      return;
    }
    adjustMutation.mutate({
      productId: form.productId,
      warehouseId: form.warehouseId,
      quantity: Number(form.quantity),
      reason: form.reason || undefined,
    });
  };

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="Property inventory levels, movements and adjustments"
        action={
          canAdjust ? (
            <Button onClick={() => setAdjustOpen(true)}>
              <SlidersHorizontal className="h-4 w-4" /> Adjust Stock
            </Button>
          ) : undefined
        }
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 pt-3 dark:border-zinc-800">
          <div className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setPage(1); }}
                className={`rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                  tab === t.key
                    ? "border-emerald-600 text-emerald-700 dark:text-emerald-400"
                    : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {tab === "stock" && (
            <div className="relative pb-3 w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <Input
                className="pl-9"
                placeholder="Search products..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
          )}
        </div>

        {loading ? (
          <Spinner />
        ) : list.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <Table>
              <THead>
                {tab === "stock" && (<>
                  <Th>Property</Th>
                  <Th>Phase</Th>
                  <Th className="text-right">Quantity</Th>
                </>)}
                {tab === "movements" && (<>
                  <Th>Type</Th>
                  <Th>Property</Th>
                  <Th className="hidden md:table-cell">Warehouse</Th>
                  <Th className="text-right">Qty</Th>
                  <Th className="hidden lg:table-cell">Reference</Th>
                  <Th className="hidden lg:table-cell">When</Th>
                </>)}
                {tab === "low" && (<>
                  <Th>Property</Th>
                  <Th className="hidden md:table-cell">Warehouse</Th>
                  <Th className="text-right">Current</Th>
                  <Th className="text-right">Min Level</Th>
                </>)}
              </THead>
              <TBody>
                {list.map((row: any) =>
                  tab === "stock" ? (
                    <Tr key={row.id}>
                      <Td>
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">{row.product?.name}</p>
                        <p className="font-mono text-xs text-zinc-400">{row.product?.sku}</p>
                      </Td>
                      <Td>{row.warehouse?.name}</Td>
                      <Td className="text-right font-semibold text-zinc-900 dark:text-zinc-100">
                        {formatNumber(row.quantity)}
                      </Td>
                    </Tr>
                  ) : tab === "movements" ? (
                    <Tr key={row.id}>
                      <Td><Badge tone={statusTone(row.type)}>{row.type}</Badge></Td>
                      <Td>
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">{row.product?.name}</p>
                        <p className="font-mono text-xs text-zinc-400">{row.product?.sku}</p>
                      </Td>
                      <Td className="hidden md:table-cell">{row.warehouse?.name}</Td>
                      <Td className="text-right">
                        <span className={row.quantity >= 0 ? "text-emerald-600" : "text-red-500"}>
                          {row.quantity >= 0 ? "+" : ""}{row.quantity}
                        </span>
                      </Td>
                      <Td className="hidden lg:table-cell text-xs text-zinc-500">{row.referenceType}</Td>
                      <Td className="hidden lg:table-cell text-xs text-zinc-500">{formatDateTime(row.createdAt)}</Td>
                    </Tr>
                  ) : (
                    <Tr key={`${row.productId}-${row.warehouse}`}>
                      <Td>
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">{row.productName}</p>
                        <p className="font-mono text-xs text-zinc-400">{row.sku}</p>
                      </Td>
                      <Td className="hidden md:table-cell">{row.warehouse}</Td>
                      <Td className="text-right">
                        <span className="font-semibold text-amber-600">{formatNumber(row.currentStock)}</span>
                      </Td>
                      <Td className="text-right">{formatNumber(row.minStockLevel)}</Td>
                    </Tr>
                  )
                )}
              </TBody>
            </Table>
            <Pagination page={page} totalPages={meta?.totalPages ?? 1} total={meta?.total ?? 0} onPage={setPage} />
          </>
        )}
      </Card>

      <Modal open={adjustOpen} onClose={() => setAdjustOpen(false)} title="Adjust Stock">
        <div className="space-y-4">
          <Field label="Product" required>
            <Select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
              <option value="">Select product...</option>
              {productsQ.data?.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
              ))}
            </Select>
          </Field>
          <Field label="Warehouse" required>
            <Select value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}>
              <option value="">Select warehouse...</option>
              {warehousesQ.data?.map((w: any) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Quantity" required hint="Positive adds stock, negative deducts stock">
            <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          </Field>
          <Field label="Reason">
            <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. damaged goods, cycle count..." />
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setAdjustOpen(false)}>Cancel</Button>
          <Button onClick={submitAdjust} loading={adjustMutation.isPending}>Adjust</Button>
        </div>
      </Modal>
    </div>
  );
}
