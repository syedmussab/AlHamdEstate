import { randomBytes } from "crypto";

/**
 * Generates a human-friendly unique reference number, e.g. PUR-20260816-A1B2C3
 */
export function generateRef(prefix: string): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${date}-${suffix}`;
}
