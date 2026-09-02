import { Seo } from "@/components/Seo";
import { useTransactions } from "@/hooks/useTransactions";
import { useAllJama } from "@/hooks/useJama";
import LoanAging from "@/components/LoanAging";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { lazy, Suspense, useMemo } from "react";

// Recharts (~100KB gz) is heavy and non-critical for FCP/LCP. Split it out so
// the stat cards paint immediately and the chart chunk streams in behind a
// fixed-height skeleton (no CLS).
const DashboardCharts = lazy(() => import("@/components/DashboardCharts"));

const Dashboard = () => {
  const { data: transactions = [], isLoading } = useTransactions();
  const { data: allJama = [], isLoading: jamaLoading } = useAllJama();

  // One pass over the transactions instead of 12 monthly filters + 4 more
  // full scans. Same values, O(n) instead of O(n·16).
  const { monthlyData, distributionData, yearlyTotal, overallTotal } = useMemo(() => {
    const now = new Date();
    const keys: string[] = [];
    const labels: string[] = [];
    const totals = new Map<string, number>();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      keys.push(key);
      labels.push(d.toLocaleString("default", { month: "short", year: "2-digit" }));
      totals.set(key, 0);
    }

    const yearPrefix = String(now.getFullYear());
    let gold = 0;
    let silver = 0;
    let year = 0;
    let overall = 0;

    for (const t of transactions) {
      const amount = Number(t.amount);
      overall += amount;
      if (t.date.startsWith(yearPrefix)) year += amount;
      const monthKey = t.date.slice(0, 7);
      if (totals.has(monthKey)) totals.set(monthKey, (totals.get(monthKey) ?? 0) + amount);
      if (t.item_type === "gold" || t.item_type === "combination") gold += amount;
      if (t.item_type === "silver" || t.item_type === "combination") silver += amount;
    }

    return {
      monthlyData: keys.map((k, i) => ({ month: labels[i], amount: totals.get(k) ?? 0 })),
      distributionData: [
        { name: "Gold", value: gold },
        { name: "Silver", value: silver },
      ],
      yearlyTotal: year,
      overallTotal: overall,
    };
  }, [transactions]);


  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <Seo title="Dashboard — Gold Finance Management" description="Overview of jewellery transactions, monthly totals and gold vs silver distribution." path="/" noindex />
      <h1 className="text-2xl font-bold text-primary">Dashboard Overview</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Transactions</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{transactions.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">This Year Total</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">₹{yearlyTotal.toLocaleString()}</p></CardContent></Card>
<Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Overall Total</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">₹{overallTotal.toLocaleString()}</p></CardContent></Card>
      </div>

      <LoanAging transactions={transactions} allJama={allJama} loading={jamaLoading} />

      <Suspense fallback={
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[380px] w-full" />
          <Skeleton className="h-[380px] w-full" />
        </div>
      }>
        <DashboardCharts monthlyData={monthlyData} distributionData={distributionData} />
      </Suspense>
    </div>
  );
};

export default Dashboard;
