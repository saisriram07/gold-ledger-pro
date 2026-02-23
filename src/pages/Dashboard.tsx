import { useTransactions } from "@/hooks/useTransactions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { useMemo } from "react";

const GOLD_COLOR = "hsl(38, 70%, 45%)";
const SILVER_COLOR = "hsl(0, 0%, 65%)";

const Dashboard = () => {
  const { data: transactions = [], isLoading } = useTransactions();

  const monthlyData = useMemo(() => {
    const now = new Date();
    const months: { month: string; amount: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
      const total = transactions
        .filter((t) => t.date.startsWith(key))
        .reduce((s, t) => s + Number(t.amount), 0);
      months.push({ month: label, amount: total });
    }
    return months;
  }, [transactions]);

  const distributionData = useMemo(() => {
    const gold = transactions.filter((t) => t.item_type === "gold" || t.item_type === "combination").reduce((s, t) => s + Number(t.amount), 0);
    const silver = transactions.filter((t) => t.item_type === "silver" || t.item_type === "combination").reduce((s, t) => s + Number(t.amount), 0);
    return [
      { name: "Gold", value: gold },
      { name: "Silver", value: silver },
    ];
  }, [transactions]);

  const yearlyTotal = useMemo(() => {
    const year = new Date().getFullYear().toString();
    return transactions.filter((t) => t.date.startsWith(year)).reduce((s, t) => s + Number(t.amount), 0);
  }, [transactions]);

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary">Dashboard Overview</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Transactions</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{transactions.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">This Year Total</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">₹{yearlyTotal.toLocaleString()}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Overall Total</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">₹{transactions.reduce((s, t) => s + Number(t.amount), 0).toLocaleString()}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Monthly Transactions (Last 12 Months)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
                <Bar dataKey="amount" fill={GOLD_COLOR} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Gold vs Silver Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={distributionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  <Cell fill={GOLD_COLOR} />
                  <Cell fill={SILVER_COLOR} />
                </Pie>
                <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
