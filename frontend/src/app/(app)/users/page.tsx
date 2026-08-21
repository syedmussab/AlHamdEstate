"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Power, X } from "lucide-react";
import { toast } from "sonner";
import { api, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
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

export default function UsersPage() {
  const { hasPerm } = useAuth();
  const qc = useQueryClient();
  const canCreate = hasPerm("users.create");
  const canUpdate = hasPerm("users.update");
  const canRead = hasPerm("users.read");

  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ name: "", email: "", password: "", phone: "", roleIds: [] });

  const rolesQ = useQuery({
    queryKey: ["roles", "all"],
    queryFn: async () => (await api.get("/roles")).data,
  });
  const listQ = useQuery({
    queryKey: ["users", page],
    queryFn: async () => (await api.get("/users", { params: { limit: 10, page } })).data,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editing) {
        const { email, password, ...rest } = payload;
        const body: any = { ...rest };
        if (password) body.password = password;
        return (await api.patch(`/users/${editing.id}`, body)).data;
      }
      return (await api.post("/users", payload)).data;
    },
    onSuccess: () => {
      toast.success(editing ? "User updated" : "User created");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, isActive }: any) => (await api.patch(`/users/${id}/status`, { isActive })).data,
    onSuccess: () => {
      toast.success("User status updated");
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", email: "", password: "", phone: "", roleIds: [] });
    setOpen(true);
  };
  const openEdit = (u: any) => {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: "", phone: u.phone ?? "", roleIds: u.roles?.map((r: any) => r.role.id) ?? [] });
    setOpen(true);
  };

  const submit = () => {
    if (!form.name.trim()) return toast.error("Name is required");
    if (!editing && !form.email.trim()) return toast.error("Email is required");
    if (!editing && !form.password) return toast.error("Password is required");
    if (!editing && !form.password.match(/^.{6,}$/)) return toast.error("Password must be at least 6 characters");
    saveMutation.mutate({ ...form, roleIds: form.roleIds });
  };

  const list = listQ.data?.data ?? [];
  const roles = rolesQ.data ?? [];

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Manage system users and their roles"
        action={canCreate ? (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New User
          </Button>
        ) : undefined}
      />

      {!canRead ? (
        <Card className="p-6 text-sm text-zinc-500">You don&apos;t have permission to view users.</Card>
      ) : (
        <Card>
          {listQ.isLoading ? (
            <Spinner />
          ) : list.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <Table>
                <THead>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th className="hidden md:table-cell">Phone</Th>
                  <Th>Roles</Th>
                  <Th>Status</Th>
                  <Th className="hidden lg:table-cell">Last Login</Th>
                  <Th className="text-right">Action</Th>
                </THead>
                <TBody>
                  {list.map((u: any) => (
                    <Tr key={u.id}>
                      <Td>
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                            {u.name?.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium">{u.name}</span>
                        </div>
                      </Td>
                      <Td className="text-sm">{u.email}</Td>
                      <Td className="hidden md:table-cell">{u.phone ?? "-"}</Td>
                      <Td>
                        <div className="flex flex-wrap gap-1">
                          {u.roles?.map((r: any) => (
                            <Badge key={r.role.id} tone="blue">{r.role.name}</Badge>
                          ))}
                        </div>
                      </Td>
                      <Td>
                        <Badge tone={u.isActive ? "green" : "red"}>{u.isActive ? "Active" : "Inactive"}</Badge>
                      </Td>
                      <Td className="hidden lg:table-cell text-xs text-zinc-500">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never"}</Td>
                      <Td className="text-right">
                        <div className="flex justify-end gap-1">
                          {canUpdate && (
                            <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canUpdate && (
                            <Button variant="ghost" size="sm" onClick={() => statusMutation.mutate({ id: u.id, isActive: !u.isActive })}>
                              <Power className={`h-4 w-4 ${u.isActive ? "text-red-500" : "text-emerald-600"}`} />
                            </Button>
                          )}
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
              <Pagination page={page} totalPages={listQ.data?.meta?.totalPages ?? 1} total={listQ.data?.meta?.total ?? 0} onPage={setPage} />
            </>
          )}
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit User" : "New User"}>
        <div className="space-y-4">
          <Field label="Name" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Email" required={!editing}>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!!editing} />
            </Field>
            <Field label={editing ? "Password (leave blank to keep)" : "Password"} required={!editing}>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editing ? "••••••••" : "Min 6 characters"} />
            </Field>
          </div>
          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Roles">
            <div className="space-y-1.5">
              {roles.map((r: any) => (
                <label key={r.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                    checked={form.roleIds.includes(r.id)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        roleIds: e.target.checked ? [...form.roleIds, r.id] : form.roleIds.filter((id: string) => id !== r.id),
                      })
                    }
                  />
                  {r.name}
                </label>
              ))}
              {roles.length === 0 && <p className="text-xs text-zinc-400">No roles available.</p>}
            </div>
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}><X className="h-4 w-4" /> Cancel</Button>
          <Button onClick={submit} loading={saveMutation.isPending}>{editing ? "Save Changes" : "Create User"}</Button>
        </div>
      </Modal>
    </div>
  );
}
