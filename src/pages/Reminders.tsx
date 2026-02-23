import { useTransactions } from "@/hooks/useTransactions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageSquare } from "lucide-react";
import { useMemo } from "react";
import { differenceInMonths } from "date-fns";
import { toast } from "sonner";

const Reminders = () => {
  const { data: transactions = [], isLoading } = useTransactions();

  const eligibleTransactions = useMemo(() => {
    const now = new Date();
    return transactions
      .filter((t) => differenceInMonths(now, new Date(t.date)) >= 3)
      .map((t) => ({
        ...t,
        monthsCompleted: differenceInMonths(now, new Date(t.date)),
      }))
      .sort((a, b) => b.monthsCompleted - a.monthsCompleted);
  }, [transactions]);

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-primary">3-Month Reminders</h1>
      <p className="text-sm text-muted-foreground">Transactions older than 3 months that may need follow-up.</p>

      {/* Desktop */}
      <div className="hidden md:block rounded-lg border overflow-auto max-h-[65vh]">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Months</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {eligibleTransactions.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.customer_name}</TableCell>
                <TableCell>{t.phone}</TableCell>
                <TableCell className="text-right">₹{Number(t.amount).toLocaleString()}</TableCell>
                <TableCell>{t.date}</TableCell>
                <TableCell>{t.monthsCompleted}</TableCell>
                <TableCell>
                  <Badge variant={t.reminder_sent ? "secondary" : "destructive"}>
                    {t.reminder_sent ? "Sent" : "Pending"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => toast.info("WhatsApp integration coming in Phase 2")}>
                    <MessageSquare className="h-4 w-4" /> WhatsApp
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {eligibleTransactions.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No reminders due</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-3">
        {eligibleTransactions.map((t) => (
          <Card key={t.id} className="border-primary/10">
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between">
                <div>
                  <p className="font-semibold">{t.customer_name}</p>
                  <p className="text-sm text-muted-foreground">📞 {t.phone}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">₹{Number(t.amount).toLocaleString()}</p>
                  <Badge variant={t.reminder_sent ? "secondary" : "destructive"} className="text-xs">
                    {t.reminder_sent ? "Sent" : "Pending"}
                  </Badge>
                </div>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>📅 {t.date}</span>
                <span>{t.monthsCompleted} months ago</span>
              </div>
              <Button size="sm" variant="outline" className="w-full gap-1" onClick={() => toast.info("WhatsApp integration coming in Phase 2")}>
                <MessageSquare className="h-4 w-4" /> Send WhatsApp
              </Button>
            </CardContent>
          </Card>
        ))}
        {eligibleTransactions.length === 0 && <p className="text-center py-8 text-muted-foreground">No reminders due</p>}
      </div>
    </div>
  );
};

export default Reminders;
