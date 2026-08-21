"use client";

import { ResourcePage } from "@/lib/crud";

export default function WarehousesPage() {
  return (
    <ResourcePage
      config={{
        title: "Phases / Locations",
        subtitle: "Project phases and property locations",
        permission: "warehouses",
        apiPath: "/warehouses",
        nameKey: "name",
        columns: [
          { key: "name", label: "Name", render: (r) => <span className="font-medium text-zinc-900 dark:text-zinc-100">{r.name}</span> },
          { key: "code", label: "Code", render: (r) => <span className="font-mono text-xs text-zinc-500">{r.code}</span> },
          { key: "address", label: "Address" },
          { key: "isActive", label: "Status", render: (r) => (r.isActive ? <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400">Active</span> : <span className="rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20 dark:bg-red-500/10 dark:text-red-400">Inactive</span>) },
        ],
        fields: [
          { name: "name", label: "Name", required: true },
          { name: "code", label: "Code", required: true, hint: "e.g. MAIN, STORE2" },
          { name: "address", label: "Address", colSpan: 2 },
          { name: "phone", label: "Phone" },
          { name: "isActive", label: "Status", type: "select", options: [{ value: "true", label: "Active" }, { value: "false", label: "Inactive" }] },
        ],
      }}
    />
  );
}
