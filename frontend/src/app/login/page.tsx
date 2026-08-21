"use client";

import { useState } from "react";
import { Building2, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getErrorMessage } from "@/lib/api";
import { Button, Input, Field } from "@/lib/ui";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/25">
            <Building2 className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              Al Hamd Estate
            </h1>
            <p className="mt-1 text-sm text-zinc-500">Inventory Management System</p>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Email" required>
              <Input
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field label="Password" required>
              <Input
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>

            {error && (
              <div className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20 dark:bg-red-500/10 dark:text-red-400">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" loading={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-400">
          Demo: admin@alhamd.com / Admin@123
        </p>
      </div>
    </div>
  );
}
