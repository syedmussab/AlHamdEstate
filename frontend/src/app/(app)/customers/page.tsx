"use client";

import { ResourcePage } from "@/lib/crud";

export default function CustomersPage() {
  return (
    <ResourcePage
      config={{
        title: "Buyers",
        subtitle: "Property buyers and clients",
        permission: "customers",
        apiPath: "/customers",
        nameKey: "name",
        columns: [
          { key: "name", label: "Name", render: (r) => <span className="font-medium text-zinc-900 dark:text-zinc-100">{r.name}</span> },
          { key: "phone", label: "Phone" },
          { key: "email", label: "Email" },
          { key: "address", label: "Address" },
          { key: "isActive", label: "Status", render: (r) => (r.isActive ? <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400">Active</span> : <span className="rounded-md bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20 dark:bg-red-500/10 dark:text-red-400">Inactive</span>) },
        ],
        fields: [
          { name: "name", label: "Name", required: true },
          { name: "phone", label: "Phone", required: true },
          { name: "email", label: "Email" },
          { name: "address", label: "Address", type: "textarea", colSpan: 2 },
          { name: "isActive", label: "Status", type: "select", options: [{ value: "true", label: "Active" }, { value: "false", label: "Inactive" }] },
        ],
      }}
    />
  );
}
