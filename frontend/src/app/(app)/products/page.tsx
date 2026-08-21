"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Search, Building2 } from "lucide-react";
import { toast } from "sonner";
import { api, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatCurrency, formatNumber } from "@/lib/format";
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
  Textarea,
  Th,
  THead,
  Table,
  Tr,
} from "@/lib/ui";

export default function ProductsPage() {
  const { hasPerm } = useAuth();
  const qc = useQueryClient();
  const canCreate = hasPerm("products.create");
  const canUpdate = hasPerm("products.update");
  const canDelete = hasPerm("products.delete");

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const categoriesQ = useQuery({
    queryKey: ["categories", "all"],
    queryFn: async () => (await api.get("/categories?limit=100")).data.data,
  });
  const brandsQ = useQuery({
    queryKey: ["brands", "all"],
    queryFn: async () => (await api.get("/brands?limit=100")).data.data,
  });
  const unitsQ = useQuery({
    queryKey: ["units", "all"],
    queryFn: async () => (await api.get("/units?limit=100")).data.data,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["products", page, search, categoryId],
    queryFn: async () => {
      const params: Record<string, any> = { limit: 10, page };
      if (search) params.search = search;
      if (categoryId) params.categoryId = categoryId;
      return (await api.get("/products", { params })).data;
    },
  });

  const list = data?.data ?? [];
  const meta = data?.meta;

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editing) {
        const { data: d } = await api.patch(`/products/${editing.id}`, payload);
        return d;
      }
      const { data: d } = await api.post("/products", payload);
      return d;
    },
    onSuccess: () => {
      toast.success(editing ? "Property updated" : "Property added");
      setModalOpen(false);
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      toast.success("Property deleted");
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const openCreate = () => {
    setForm({
      name: "",
      sku: "",
      plotNo: "",
      block: "",
      area: "",
      facing: "",
      description: "",
      categoryId: "",
      brandId: "",
      unitId: "",
      costPrice: 0,
      sellingPrice: 0,
      minStockLevel: 1,
      isActive: true,
    });
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (row: any) => {
    setForm({
      name: row.name,
      sku: row.sku,
      plotNo: row.plotNo ?? "",
      block: row.block ?? "",
      area: row.area != null ? Number(row.area) : "",
      facing: row.facing ?? "",
      description: row.description ?? "",
      categoryId: row.categoryId ?? "",
      brandId: row.brandId ?? "",
      unitId: row.unitId ?? "",
      costPrice: Number(row.costPrice),
      sellingPrice: Number(row.sellingPrice),
      minStockLevel: Number(row.minStockLevel),
      isActive: row.isActive,
    });
    setEditing(row);
    setModalOpen(true);
  };

  const submit = () => {
    if (!form.name.trim()) return toast.error("Property title is required");
    if (!form.sku.trim()) return toast.error("Property code is required");
    saveMutation.mutate({
      ...form,
      area: form.area === "" ? undefined : Number(form.area),
      costPrice: Number(form.costPrice),
      sellingPrice: Number(form.sellingPrice),
      minStockLevel: Number(form.minStockLevel),
      categoryId: form.categoryId || undefined,
      brandId: form.brandId || undefined,
      unitId: form.unitId || undefined,
    });
  };

  return (
    <div>
      <PageHeader
        title="Properties"
        subtitle="Manage plots, houses and flats inventory"
        action={
          canCreate ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Add Property
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
              placeholder="Search by title, code or plot no..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select className="w-44" value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}>
            <option value="">All types</option>
            {categoriesQ.data?.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>

        {isLoading ? (
          <Spinner />
        ) : list.length === 0 ? (
          <EmptyState message="No properties found" />
        ) : (
          <>
            <Table>
              <THead>
                <Th>Property</Th>
                <Th>Code</Th>
                <Th className="hidden md:table-cell">Plot No</Th>
                <Th className="hidden lg:table-cell">Type</Th>
                <Th className="text-right">Purchase Price</Th>
                <Th className="text-right">Sale Price</Th>
                <Th className="text-right">Units</Th>
                <Th>Status</Th>
                {(canUpdate || canDelete) && <Th className="text-right">Actions</Th>}
              </THead>
              <TBody>
                {list.map((p: any) => (
                  <Tr key={p.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">{p.name}</p>
                          <p className="text-xs text-zinc-400">
                            {[p.area != null ? `${formatNumber(Number(p.area))} ${p.unit?.code ?? ""}` : "", p.facing ? `· ${p.facing} facing` : ""].filter(Boolean).join(" ")}
                          </p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <span className="font-mono text-xs text-zinc-500">{p.sku}</span>
                    </Td>
                    <Td className="hidden md:table-cell">
                      <span className="font-mono text-xs">{p.plotNo ?? "-"}</span>
                      {p.block && <p className="text-xs text-zinc-400">{p.block}</p>}
                    </Td>
                    <Td className="hidden lg:table-cell">{p.category?.name ?? "-"}</Td>
                    <Td className="text-right">{formatCurrency(p.costPrice)}</Td>
                    <Td className="text-right font-medium">{formatCurrency(p.sellingPrice)}</Td>
                    <Td className="text-right">
                      <span className={Number(p.totalStock) <= Number(p.minStockLevel) ? "font-semibold text-amber-600" : ""}>
                        {formatNumber(p.totalStock)}
                      </span>
                    </Td>
                    <Td>
                      {p.isActive ? <Badge tone="green">Available</Badge> : <Badge tone="red">Inactive</Badge>}
                    </Td>
                    {(canUpdate || canDelete) && (
                      <Td className="text-right">
                        <div className="flex justify-end gap-1">
                          {canUpdate && (
                            <Button variant="ghost" size="icon" onClick={() => openEdit(p)} aria-label="Edit">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-600"
                              onClick={() => setDeleting(p)}
                              aria-label="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </Td>
                    )}
                  </Tr>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} totalPages={meta?.totalPages ?? 1} total={meta?.total ?? 0} onPage={setPage} />
          </>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Property" : "Add Property"}
        wide
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Property Title" required>
            <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Residential Plot 5 Marla - Phase 1" />
          </Field>
          <Field label="Property Code" required>
            <Input value={form.sku ?? ""} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="e.g. PLT-001" />
          </Field>
          <Field label="Plot / House No">
            <Input value={form.plotNo ?? ""} onChange={(e) => setForm({ ...form, plotNo: e.target.value })} placeholder="e.g. A-12" />
          </Field>
          <Field label="Block / Sector">
            <Input value={form.block ?? ""} onChange={(e) => setForm({ ...form, block: e.target.value })} placeholder="e.g. Block A" />
          </Field>
          <Field label="Size / Area">
            <Input type="number" min={0} step="0.01" value={form.area ?? ""} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="e.g. 5" />
          </Field>
          <Field label="Area Unit">
            <Select value={form.unitId ?? ""} onChange={(e) => setForm({ ...form, unitId: e.target.value })}>
              <option value="">None</option>
              {unitsQ.data?.map((u: any) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Facing">
            <Select value={form.facing ?? ""} onChange={(e) => setForm({ ...form, facing: e.target.value })}>
              <option value="">None</option>
              <option value="North">North</option>
              <option value="South">South</option>
              <option value="East">East</option>
              <option value="West">West</option>
              <option value="Corner">Corner</option>
              <option value="Park Facing">Park Facing</option>
              <option value="Main Boulevard">Main Boulevard</option>
            </Select>
          </Field>
          <Field label="Society / Project">
            <Select value={form.brandId ?? ""} onChange={(e) => setForm({ ...form, brandId: e.target.value })}>
              <option value="">None</option>
              {brandsQ.data?.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Property Type">
            <Select value={form.categoryId ?? ""} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              <option value="">None</option>
              {categoriesQ.data?.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={String(form.isActive ?? true)} onChange={(e) => setForm({ ...form, isActive: e.target.value === "true" })}>
              <option value="true">Available</option>
              <option value="false">Inactive</option>
            </Select>
          </Field>
          <Field label="Purchase Price (per unit)">
            <Input type="number" min={0} value={form.costPrice ?? 0} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
          </Field>
          <Field label="Sale Price (per unit)">
            <Input type="number" min={0} value={form.sellingPrice ?? 0} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} />
          </Field>
          <Field label="Min Units Alert">
            <Input type="number" min={0} value={form.minStockLevel ?? 0} onChange={(e) => setForm({ ...form, minStockLevel: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description">
              <Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Location details, possession status, development charges..." />
            </Field>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={submit} loading={saveMutation.isPending}>
            {editing ? "Save changes" : "Add Property"}
          </Button>
        </div>
      </Modal>

      <Modal open={Boolean(deleting)} onClose={() => setDeleting(null)} title="Delete property">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">{deleting?.name}</span>?
          This action cannot be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
          <Button variant="danger" loading={deleteMutation.isPending} onClick={() => deleting && deleteMutation.mutate(deleting.id)}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
