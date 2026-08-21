"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ShieldCheck, X } from "lucide-react";
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
  Spinner,
} from "@/lib/ui";

export default function RolesPage() {
  const { hasPerm } = useAuth();
  const qc = useQueryClient();
  const canCreate = hasPerm("roles.create");
  const canUpdate = hasPerm("roles.update");
  const canDelete = hasPerm("roles.delete");
  const canAssign = hasPerm("roles.assign_permissions");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [permsRole, setPermsRole] = useState<any>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const rolesQ = useQuery({
    queryKey: ["roles"],
    queryFn: async () => (await api.get("/roles")).data,
  });
  const permsQ = useQuery({
    queryKey: ["permissions"],
    queryFn: async () => (await api.get("/permissions")).data,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editing) return (await api.patch(`/roles/${editing.id}`, payload)).data;
      return (await api.post("/roles", payload)).data;
    },
    onSuccess: () => {
      toast.success(editing ? "Role updated" : "Role created");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["roles"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/roles/${id}`)).data,
    onSuccess: () => {
      toast.success("Role deleted");
      qc.invalidateQueries({ queryKey: ["roles"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const assignMutation = useMutation({
    mutationFn: async ({ id, permissionIds }: any) => (await api.put(`/roles/${id}/permissions`, { permissionIds })).data,
    onSuccess: () => {
      toast.success("Permissions assigned");
      setPermsRole(null);
      qc.invalidateQueries({ queryKey: ["roles"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", description: "" });
    setOpen(true);
  };
  const openEdit = (r: any) => {
    setEditing(r);
    setForm({ name: r.name, description: r.description ?? "" });
    setOpen(true);
  };
  const openPerms = (r: any) => {
    setPermsRole(r);
    setSelected(r.permissions?.map((p: any) => p.permissionId) ?? []);
  };

  const submit = () => {
    if (!form.name.trim()) return toast.error("Role name is required");
    saveMutation.mutate(form);
  };

  const roles = rolesQ.data ?? [];
  const perms = permsQ.data ?? [];
  const modules: string[] = Array.from(new Set(perms.map((p: any) => p.module as string)));

  const togglePerm = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div>
      <PageHeader
        title="Roles"
        subtitle="Manage roles and their permissions"
        action={canCreate ? (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New Role
          </Button>
        ) : undefined}
      />

      <Card>
        {rolesQ.isLoading ? (
          <Spinner />
        ) : roles.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {roles.map((r: any) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{r.name}</span>
                    {r.isSystem && <Badge tone="amber">System</Badge>}
                    {canAssign && (
                      <button onClick={() => openPerms(r)} className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline">
                        <ShieldCheck className="h-3 w-3" /> {r.permissions?.length ?? 0} perms
                      </button>
                    )}
                  </div>
                  {r.description && <p className="text-xs text-zinc-500">{r.description}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400">{r.users?.length ?? 0} user(s)</span>
                  <div className="flex gap-1">
                    {canUpdate && (
                      <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {canDelete && !r.isSystem && (
                      <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(r.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit Role" : "New Role"}>
        <div className="space-y-4">
          <Field label="Name" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Description">
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}><X className="h-4 w-4" /> Cancel</Button>
          <Button onClick={submit} loading={saveMutation.isPending}>{editing ? "Save Changes" : "Create Role"}</Button>
        </div>
      </Modal>

      <Modal open={!!permsRole} onClose={() => setPermsRole(null)} title={`Permissions — ${permsRole?.name ?? ""}`} wide>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          {modules.map((mod) => (
            <div key={mod}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">{mod}</p>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {perms.filter((p: any) => p.module === mod).map((p: any) => (
                  <label key={p.id} className="flex items-center gap-2 rounded-md border border-zinc-200 px-2.5 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                      checked={selected.includes(p.id)}
                      onChange={() => togglePerm(p.id)}
                    />
                    <span className="font-mono text-xs">{p.name}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between">
          <span className="text-xs text-zinc-400">{selected.length} selected</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPermsRole(null)}>Cancel</Button>
            <Button onClick={() => assignMutation.mutate({ id: permsRole.id, permissionIds: selected })} loading={assignMutation.isPending}>
              Save Permissions
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
