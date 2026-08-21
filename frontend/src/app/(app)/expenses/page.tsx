"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Tag, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, getErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatCurrency, formatDateTime } from "@/lib/format";
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

export default function ExpensesPage() {
  const { hasPerm } = useAuth();
  const qc = useQueryClient();
  const canCreate = hasPerm("expenses.create");
  const canUpdate = hasPerm("expenses.update");
  const canDelete = hasPerm("expenses.delete");
  const canRead = hasPerm("expenses.read");

  const [page, setPage] = useState(1);
  const [categoryId, setCategoryId] = useState("");
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [catForm, setCatForm] = useState<any>({ id: "", name: "" });
  const [expenseForm, setExpenseForm] = useState<any>({ expenseCategoryId: "", amount: "", expenseDate: "", description: "" });

  const categoriesQ = useQuery({
    queryKey: ["expense-categories"],
    queryFn: async () => (await api.get("/expenses/categories")).data,
  });
  const summaryQ = useQuery({
    queryKey: ["expenses-summary"],
    queryFn: async () => (await api.get("/expenses/summary")).data,
  });
  const listQ = useQuery({
    queryKey: ["expenses", page, categoryId],
    queryFn: async () => {
      const params: Record<string, any> = { limit: 10, page };
      if (categoryId) params.categoryId = categoryId;
      return (await api.get("/expenses", { params })).data;
    },
  });

  const createExpense = useMutation({
    mutationFn: async (p: any) => (await api.post("/expenses", p)).data,
    onSuccess: () => {
      toast.success("Expense added");
      setExpenseOpen(false);
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["expenses-summary"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const saveCategory = useMutation({
    mutationFn: async (p: any) => {
      const { id, ...body } = p;
      return id ? (await api.patch(`/expenses/categories/${id}`, body)).data : (await api.post("/expenses/categories", body)).data;
    },
    onSuccess: () => {
      toast.success("Category saved");
      setCatOpen(false);
      setCatForm({ id: "", name: "" });
      qc.invalidateQueries({ queryKey: ["expense-categories"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/expenses/categories/${id}`)).data,
    onSuccess: () => {
      toast.success("Category deleted");
      qc.invalidateQueries({ queryKey: ["expense-categories"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/expenses/${id}`)).data,
    onSuccess: () => {
      toast.success("Expense deleted");
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["expenses-summary"] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const list = listQ.data?.data ?? [];
  const categories = categoriesQ.data ?? [];
  const summary = summaryQ.data;
  const catMap = Object.fromEntries(categories.map((c: any) => [c.id, c.name]));

  const submitExpense = () => {
    if (!expenseForm.expenseCategoryId) return toast.error("Select category");
    if (!Number(expenseForm.amount) || Number(expenseForm.amount) <= 0) return toast.error("Enter a valid amount");
    createExpense.mutate({
      expenseCategoryId: expenseForm.expenseCategoryId,
      amount: Number(expenseForm.amount),
      expenseDate: expenseForm.expenseDate || undefined,
      description: expenseForm.description || undefined,
    });
  };

  const submitCategory = () => {
    if (!catForm.name.trim()) return toast.error("Enter category name");
    saveCategory.mutate(catForm);
  };

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle="Track business expenses and categories"
        action={
          canCreate ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCatOpen(true)}>
                <Tag className="h-4 w-4" /> Categories
              </Button>
              <Button onClick={() => setExpenseOpen(true)}>
                <Plus className="h-4 w-4" /> Add Expense
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-sm text-zinc-500">Total Expenses</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(summary?.totalAmount ?? 0)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-zinc-500">Transactions</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{summary?.totalCount ?? 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-zinc-500">Categories</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{categories.length}</p>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategoryId("")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${!categoryId ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"}`}
            >
              All
            </button>
            {categories.map((c: any) => (
              <button
                key={c.id}
                onClick={() => setCategoryId(c.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${categoryId === c.id ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {!canRead ? (
          <div className="p-6 text-sm text-zinc-500">You don&apos;t have permission to view expenses.</div>
        ) : listQ.isLoading ? (
          <Spinner />
        ) : list.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <Table>
              <THead>
                <Th>Description</Th>
                <Th>Category</Th>
                <Th className="hidden md:table-cell">Date</Th>
                <Th className="text-right">Amount</Th>
                <Th className="hidden lg:table-cell">By</Th>
                {canDelete && <Th className="text-right">Action</Th>}
              </THead>
              <TBody>
                {list.map((e: any) => (
                  <Tr key={e.id}>
                    <Td>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">{e.description || "—"}</p>
                    </Td>
                    <Td><Badge tone="amber">{e.expenseCategory?.name}</Badge></Td>
                    <Td className="hidden md:table-cell">{formatDateTime(e.expenseDate)}</Td>
                    <Td className="text-right font-semibold text-red-500">{formatCurrency(e.amount)}</Td>
                    <Td className="hidden lg:table-cell">{e.user?.name}</Td>
                    {canDelete && (
                      <Td className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => deleteExpense.mutate(e.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </Td>
                    )}
                  </Tr>
                ))}
              </TBody>
            </Table>
            <Pagination page={page} totalPages={listQ.data?.meta?.totalPages ?? 1} total={listQ.data?.meta?.total ?? 0} onPage={setPage} />
          </>
        )}
      </Card>

      <Modal open={expenseOpen} onClose={() => setExpenseOpen(false)} title="Add Expense">
        <div className="space-y-4">
          <Field label="Category" required>
            <Select value={expenseForm.expenseCategoryId} onChange={(e) => setExpenseForm({ ...expenseForm, expenseCategoryId: e.target.value })}>
              <option value="">Select category...</option>
              {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Amount" required>
              <Input type="number" min={0.01} step="0.01" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} />
            </Field>
            <Field label="Date">
              <Input type="date" value={expenseForm.expenseDate} onChange={(e) => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })} />
            </Field>
          </div>
          <Field label="Description">
            <Input value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} placeholder="e.g. electricity bill..." />
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setExpenseOpen(false)}>Cancel</Button>
          <Button onClick={submitExpense} loading={createExpense.isPending}>Save Expense</Button>
        </div>
      </Modal>

      <Modal open={catOpen} onClose={() => setCatOpen(false)} title="Expense Categories">
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} placeholder="New category name..." />
            <Button onClick={submitCategory} loading={saveCategory.isPending}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
          <div className="max-h-72 space-y-2 overflow-y-auto">
            {categories.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                <span className="text-sm font-medium">{c.name}</span>
                <div className="flex gap-1">
                  {canUpdate && (
                    <Button variant="ghost" size="sm" onClick={() => setCatForm({ id: c.id, name: c.name })}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button variant="ghost" size="sm" onClick={() => deleteCategory.mutate(c.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {categories.length === 0 && <p className="py-4 text-center text-sm text-zinc-500">No categories yet.</p>}
          </div>
          <p className="text-xs text-zinc-400">{catMap[catForm.id] ? `Editing: ${catMap[catForm.id]}` : "Type a name and press Add to create a category."}</p>
        </div>
      </Modal>
    </div>
  );
}
