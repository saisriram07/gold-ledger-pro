import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const GOLD_COLOR = "hsl(38, 70%, 45%)";
const SILVER_COLOR = "hsl(0, 0%, 65%)";

interface Props {
  monthlyData: { month: string; amount: number }[];
  distributionData: { name: string; value: number }[];
}

/**
 * Charts are split into their own chunk so recharts (~100KB gz) is loaded
 * lazily and never blocks Dashboard FCP/LCP. The stat cards above render
 * immediately while this chunk streams in.
 */
export default function DashboardCharts({ monthlyData, distributionData }: Props) {
  return (
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
  );
}
