"use client";

import { useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { api, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
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
  statusTone,
} from "@/lib/ui";

export interface ColumnDef<T = any> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  className?: string;
}

export interface FieldDef {
  name: string;
  label: string;
  type?: "text" | "number" | "textarea" | "select" | "date";
  options?: { value: string | number; label: string }[];
    required?: boolean;
    hidden?: boolean;
    colSpan?: number;
    hint?: string;
}

export interface ResourceConfig {
  title: string;
  subtitle?: string;
  permission: string;
  apiPath: string;
  columns: ColumnDef[];
  fields: FieldDef[];
  formTitle?: string;
  nameKey?: string;
}

interface Row {
  id: string;
  [key: string]: any;
}

export function ResourcePage({ config }: { config: ResourceConfig }) {
  const { hasPerm } = useAuth();
  const qc = useQueryClient();
  const canCreate = hasPerm(`${config.permission}.create`);
  const canUpdate = hasPerm(`${config.permission}.update`);
  const canDelete = hasPerm(`${config.permission}.delete`);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isActive, setIsActive] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});

  const limit = 10;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [config.apiPath, page, search, isActive],
    queryFn: async () => {
      const params: Record<string, any> = { limit, page };
      if (search) params.search = search;
      if (isActive) params.isActive = isActive;
      const res = await api.get(config.apiPath, { params });
      return res.data;
    },
  });

  const list: Row[] = data?.data ?? [];
  const meta = data?.meta;

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      if (editing) {
        const { data: d } = await api.patch(`${config.apiPath}/${editing.id}`, payload);
        return d;
      }
      const { data: d } = await api.post(config.apiPath, payload);
      return d;
    },
    onSuccess: () => {
      toast.success(editing ? "Updated successfully" : "Created successfully");
      setModalOpen(false);
      qc.invalidateQueries({ queryKey: [config.apiPath] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${config.apiPath}/${id}`);
    },
    onSuccess: () => {
      toast.success("Deleted successfully");
      setDeleting(null);
      qc.invalidateQueries({ queryKey: [config.apiPath] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const openCreate = () => {
    const initial: Record<string, any> = {};
    for (const f of config.fields) {
      if (f.type === "select" && f.options) initial[f.name] = f.options[0]?.value ?? "";
      else if (f.type === "number") initial[f.name] = 0;
      else initial[f.name] = f.type === "textarea" ? "" : "";
    }
    setForm(initial);
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (row: Row) => {
    const initial: Record<string, any> = {};
    for (const f of config.fields) initial[f.name] = row[f.name] ?? "";
    setForm(initial);
    setEditing(row);
    setModalOpen(true);
  };

  const setValue = (name: string, value: any) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const submit = () => {
    const payload: Record<string, any> = {};
    for (const f of config.fields) {
      if (f.hidden) continue;
      if (f.type === "select") {
        payload[f.name] = form[f.name] === "true" || form[f.name] === true;
      } else if (f.type === "number") {
        payload[f.name] = Number(form[f.name] ?? 0);
      } else {
        payload[f.name] = form[f.name];
      }
    }
    saveMutation.mutate(payload);
  };

  return (
    <div>
      <PageHeader
        title={config.title}
        subtitle={config.subtitle}
        action={
          canCreate ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> Add {config.title.replace(/s$/, "")}
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
              placeholder="Search..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            className="w-40"
            value={isActive}
            onChange={(e) => {
              setIsActive(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>
        </div>

        {isLoading ? (
          <Spinner />
        ) : list.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <Table>
              <THead>
                {config.columns.map((c) => (
                  <Th key={c.key} className={c.className}>
                    {c.label}
                  </Th>
                ))}
                {(canUpdate || canDelete) && <Th className="text-right">Actions</Th>}
              </THead>
              <TBody>
                {list.map((row) => (
                  <Tr key={row.id}>
                    {config.columns.map((c) => (
                      <Td key={c.key} className={c.className}>
                        {c.render ? c.render(row) : row[c.key]}
                      </Td>
                    ))}
                    {(canUpdate || canDelete) && (
                      <Td className="text-right">
                        <div className="flex justify-end gap-1">
                          {canUpdate && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(row)}
                              aria-label="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-600"
                              onClick={() => setDeleting(row)}
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
            <Pagination
              page={page}
              totalPages={meta?.totalPages ?? 1}
              total={meta?.total ?? 0}
              onPage={setPage}
            />
          </>
        )}
        {isFetching && !isLoading && (
          <div className="flex justify-center py-2">
            <Spinner className="h-4 w-4 py-0" />
          </div>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${config.formTitle ?? config.title}` : `Add ${config.formTitle ?? config.title}`}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {config.fields
            .filter((f) => !f.hidden)
            .map((f) => (
              <div key={f.name} className={f.colSpan === 2 ? "sm:col-span-2" : ""}>
                <Field label={f.label} required={f.required}>
                  {f.type === "textarea" ? (
                    <Textarea
                      value={form[f.name] ?? ""}
                      onChange={(e) => setValue(f.name, e.target.value)}
                    />
                  ) : f.type === "select" ? (
                    <Select
                      value={String(form[f.name] ?? "")}
                      onChange={(e) => setValue(f.name, e.target.value)}
                    >
                      {f.options?.map((o) => (
                        <option key={String(o.value)} value={String(o.value)}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  ) : f.type === "number" ? (
                    <Input
                      type="number"
                      value={form[f.name] ?? 0}
                      onChange={(e) => setValue(f.name, e.target.value)}
                    />
                  ) : (
                    <Input
                      value={form[f.name] ?? ""}
                      onChange={(e) => setValue(f.name, e.target.value)}
                    />
                  )}
                </Field>
              </div>
            ))}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saveMutation.isPending}>
            {editing ? "Save changes" : "Create"}
          </Button>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete record"
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">
            {deleting?.[config.nameKey ?? "name"]}
          </span>
          ? This action cannot be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleting(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={deleteMutation.isPending}
            onClick={() => deleting && deleteMutation.mutate(deleting.id)}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export const boolBadge = (v: boolean) =>
  v ? (
    <Badge tone="green">Active</Badge>
  ) : (
    <Badge tone="red">Inactive</Badge>
  );
