"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import {
  Badge,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Pagination,
  Spinner,
  TBody,
  Td,
  Th,
  THead,
  Table,
  Tr,
} from "@/lib/ui";

export default function AuditLogsPage() {
  const { hasPerm } = useAuth();
  const canRead = hasPerm("auditlogs.read");

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const listQ = useQuery({
    queryKey: ["audit-logs", page, search],
    queryFn: async () => {
      const params: Record<string, any> = { limit: 20, page };
      if (search) params.search = search;
      return (await api.get("/audit-logs", { params })).data;
    },
  });

  const list = listQ.data?.data ?? [];

  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="Track all system activity" />

      {!canRead ? (
        <Card className="p-6 text-sm text-zinc-500">You don&apos;t have permission to view audit logs.</Card>
      ) : (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <div className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <Input
                className="pl-9"
                placeholder="Search action or entity..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
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
                  <Th>Action</Th>
                  <Th>Entity</Th>
                  <Th className="hidden md:table-cell">Entity ID</Th>
                  <Th>User</Th>
                  <Th className="hidden lg:table-cell">IP</Th>
                  <Th>When</Th>
                </THead>
                <TBody>
                  {list.map((l: any) => (
                    <Tr key={l.id}>
                      <Td>
                        <Badge tone={l.action.includes("DELETE") ? "red" : l.action.includes("CREATE") ? "green" : "blue"}>
                          {l.action}
                        </Badge>
                      </Td>
                      <Td>{l.entity}</Td>
                      <Td className="hidden md:table-cell font-mono text-xs">{l.entityId ?? "-"}</Td>
                      <Td>{l.user?.name ?? "-"}</Td>
                      <Td className="hidden lg:table-cell font-mono text-xs">{l.ip ?? "-"}</Td>
                      <Td className="whitespace-nowrap text-xs">{formatDateTime(l.createdAt)}</Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
              <Pagination page={page} totalPages={listQ.data?.meta?.totalPages ?? 1} total={listQ.data?.meta?.total ?? 0} onPage={setPage} />
            </>
          )}
        </Card>
      )}
    </div>
  );
}
