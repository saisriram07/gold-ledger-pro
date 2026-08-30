import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { daysBetween, summarizeTransaction, todayISO } from "@/lib/interest";
import type { Tables } from "@/integrations/supabase/types";
import type { Jama } from "@/hooks/useJama";

type Transaction = Tables<"transactions">;

interface AgingBucket {
  key: string;
  label: string;
  count: number;
  totalOutstanding: number;
}

const BUCKETS: { key: string; label: string }[] = [
  { key: "0-30", label: "0–30 Days" },
  { key: "31-90", label: "31–90 Days" },
  { key: "91-180", label: "91–180 Days" },
  { key: "181-365", label: "181–365 Days" },
  { key: "365+", label: "1+ Year" },
];

/** Maps a loan age (whole days) to its bucket index. */
function bucketIndex(age: number): number {
  if (age <= 30) return 0;
  if (age <= 90) return 1;
  if (age <= 180) return 2;
  if (age <= 365) return 3;
  return 4;
}

interface Props {
  transactions: Transaction[];
  allJama: Jama[];
  loading?: boolean;
}

/**
 * Loan Aging — outstanding (pending) loans grouped by how long they have been
 * active. Age is measured from the original loan date to today; the outstanding
 * amount is the current Remaining Balance (principal + accrued interest minus
 * Jama payments), so it always reflects the latest payment history. Gold,
 * Silver and Combination loans are all included, one row each (no double count).
 */
export default function LoanAging({ transactions, allJama, loading }: Props) {
  const jamaByTx = useMemo(() => {
    const map = new Map<string, { amount: number; paid_date: string }[]>();
    for (const j of allJama) {
      const list = map.get(j.transaction_id) ?? [];
      list.push({ amount: Number(j.amount), paid_date: j.paid_date });
      map.set(j.transaction_id, list);
    }
    return map;
  }, [allJama]);

  const buckets = useMemo<AgingBucket[]>(() => {
    const result: AgingBucket[] = BUCKETS.map((b) => ({ ...b, count: 0, totalOutstanding: 0 }));
    const asOf = todayISO();

    for (const tx of transactions) {
      // Only outstanding loans — completed ones are excluded entirely.
      if (tx.status === "completed") continue;

      const s = summarizeTransaction(tx, jamaByTx.get(tx.id) ?? []);
      if (s.remaining <= 0) continue;

      const age = daysBetween(tx.date, asOf);
      result[bucketIndex(age)].count += 1;
      result[bucketIndex(age)].totalOutstanding += s.remaining;
    }
    return result;
  }, [transactions, jamaByTx]);

  const totalLoans = buckets.reduce((sum, b) => sum + b.count, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">Loan Aging</CardTitle>
        <CardDescription className="text-xs">
          Outstanding loans grouped by how long they have been active
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : totalLoans === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No outstanding loans</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {buckets.map((b) => (
              <div key={b.key} className="rounded-lg border bg-muted/30 p-4">
                <p className="text-xs font-medium text-muted-foreground">{b.label}</p>
                <p className="mt-2 text-2xl font-bold text-primary">
                  {b.count}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    {b.count === 1 ? "Loan" : "Loans"}
                  </span>
                </p>
                <p className="mt-1 text-sm font-semibold">
                  ₹{Math.round(b.totalOutstanding).toLocaleString("en-IN")}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}