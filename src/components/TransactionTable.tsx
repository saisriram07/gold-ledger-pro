import { memo, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Trash2, Search, Download, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAllJama } from "@/hooks/useJama";
import { summarizeTransaction } from "@/lib/interest";
// pdfExport pulls in jspdf + jspdf-autotable (~300KB). Lazy-load it only when
// the user actually clicks Download so it doesn't bloat the initial bundle.
const handlePdfExport = async (transactions: Transaction[], title: string) => {
  const { exportTransactionsPdf } = await import("@/lib/pdfExport");
  exportTransactionsPdf(transactions, title);
};
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type Transaction = Tables<"transactions">;

interface Props {
  transactions: Transaction[];
  isLoading: boolean;
  onDelete: (id: string) => void;
  onStatusChange?: (id: string, status: string, completed_date?: string | null) => void;
  onDuplicate?: (tx: Pick<Transaction, "serial_no" | "customer_name" | "father_name" | "phone" | "area" | "item_type" | "item_name" | "weight">) => void;
  title: string;
  totalLabel?: string;
  totalAmount?: number;
  showSummary?: boolean;
  goldAmount?: number;
  silverAmount?: number;
  combinationAmount?: number;
  totalGrams?: string;
}

function TransactionTableImpl({ transactions, isLoading, onDelete, onStatusChange, onDuplicate, title, totalLabel, totalAmount, showSummary, goldAmount, silverAmount, combinationAmount, totalGrams }: Props) {
  const [search, setSearch] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const { data: allJama = [] } = useAllJama();
  const jamaByTx = useMemo(() => {
    const map = new Map<string, number>();
    for (const j of allJama) map.set(j.transaction_id, (map.get(j.transaction_id) || 0) + Number(j.amount));
    return map;
  }, [allJama]);

  // Memoize filtering and totals so re-renders that don't touch `transactions`
  // or `search` (e.g. dialog open/close) skip the O(n) work entirely.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter(
      (t) =>
        t.serial_no.toLowerCase().includes(q) ||
        t.customer_name.toLowerCase().includes(q) ||
        t.phone.includes(q) ||
        t.area.toLowerCase().includes(q) ||
        t.item_type.includes(q),
    );
  }, [transactions, search]);

  const overallTotal = useMemo(
    () => filtered.reduce((s, t) => s + Number(t.amount), 0),
    [filtered],
  );

  const handleStatusChange = (id: string, val: string) => {
    if (val === "completed") {
      setPendingStatusId(id);
      setSelectedDate(new Date());
      setDatePickerOpen(true);
    } else {
      onStatusChange?.(id, val, null);
    }
  };

  const confirmCompletedDate = () => {
    if (pendingStatusId && selectedDate) {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      onStatusChange?.(pendingStatusId, "completed", dateStr);
    }
    setDatePickerOpen(false);
    setPendingStatusId(null);
  };

  const handleDuplicate = (t: Transaction) => {
    onDuplicate?.({
      serial_no: t.serial_no,
      customer_name: t.customer_name,
      father_name: t.father_name,
      phone: t.phone,
      area: t.area,
      item_type: t.item_type,
      item_name: t.item_name,
      weight: t.weight,
    });
  };

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">{title}</h1>
        <Button variant="outline" size="sm" className="gap-1" onClick={() => handlePdfExport(filtered, title)}>
          <Download className="h-4 w-4" /> PDF
        </Button>
      </div>

      {showSummary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card><CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Total Records</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{filtered.length}</p></CardContent></Card>
          <Card><CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Gold Amount</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-primary">₹{(goldAmount ?? 0).toLocaleString()}</p></CardContent></Card>
          <Card><CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Silver Amount</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-muted-foreground">₹{(silverAmount ?? 0).toLocaleString()}</p></CardContent></Card>
          <Card><CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Combination Amount</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-accent-foreground">₹{(combinationAmount ?? 0).toLocaleString()}</p></CardContent></Card>
          <Card><CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Overall Amount</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">₹{overallTotal.toLocaleString()}</p></CardContent></Card>
        </div>
      )}

      {totalLabel && !showSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card><CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">{totalLabel}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-primary">₹{(totalAmount ?? overallTotal).toLocaleString()}</p></CardContent></Card>
          {totalGrams && (
            <Card><CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Total Weight</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totalGrams}</p></CardContent></Card>
          )}
        </div>
      )}

      <div className="relative">
        <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input type="search" aria-label="Search transactions by serial, name, phone, area, or type" placeholder="Search by serial, name, phone, area, type..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Date picker dialog */}
      <Dialog open={datePickerOpen} onOpenChange={setDatePickerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Completion Date</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDatePickerOpen(false)}>Cancel</Button>
            <Button onClick={confirmCompletedDate} disabled={!selectedDate}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Records table — horizontally scrollable on mobile */}
      <div className="rounded-lg border overflow-auto max-h-[70vh] -mx-2 md:mx-0">

        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Date</TableHead>
              <TableHead>Serial</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Area</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead className="text-right">Principal</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Interest</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Jama</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((t) => {
              const jamaPaid = jamaByTx.get(t.id) || 0;
              const s = summarizeTransaction(t, jamaPaid);
              const isCombo = s.isCombination;
              const typeLabel = isCombo ? "Gold + Silver Combination" : (t.loan_type || t.item_type);
              const itemLabel = isCombo
                ? `Gold: ${(t as any).gold_item_name || "-"} · Silver: ${(t as any).silver_item_name || "-"}`
                : t.item_name;
              const weightLabel = isCombo
                ? `Gold ${(t as any).gold_weight || "-"} + Silver ${(t as any).silver_weight || "-"}`
                : t.weight;
              const rateLabel = isCombo
                ? `G ${(t as any).gold_rate ?? "-"}% / S ${(t as any).silver_rate ?? "-"}%`
                : (s.rate ? `${s.rate}%` : "-");
              return (
              <TableRow key={t.id}>
                <TableCell className="whitespace-nowrap">{t.date}</TableCell>
                <TableCell>{t.serial_no}</TableCell>
                <TableCell>
                  {t.customer_id ? (
                    <Link to={`/customer/${t.customer_id}`} className="text-primary hover:underline">{t.customer_name}</Link>
                  ) : t.customer_name}
                </TableCell>
                <TableCell>{t.phone}</TableCell>
                <TableCell>{t.area}</TableCell>
                <TableCell className="capitalize">{typeLabel}</TableCell>
                <TableCell>{itemLabel}</TableCell>
                <TableCell>{weightLabel}</TableCell>
                <TableCell className="text-right font-medium">₹{s.principal.toLocaleString()}</TableCell>
                <TableCell className="text-right">{rateLabel}</TableCell>
                <TableCell className="text-right">₹{s.interest.toLocaleString()}</TableCell>
                <TableCell className="text-right font-medium">₹{s.totalPayable.toLocaleString()}</TableCell>
                <TableCell className="text-right">₹{s.jamaPaid.toLocaleString()}</TableCell>
                <TableCell className="text-right font-semibold text-primary">₹{s.remaining.toLocaleString()}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Select value={t.status || "pending"} onValueChange={(val) => handleStatusChange(t.id, val)}>
                      <SelectTrigger className="h-8 w-[120px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    {t.status === "completed" && t.completed_date && (
                      <span className="text-xs text-muted-foreground">{t.completed_date}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {onDuplicate && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary" onClick={() => handleDuplicate(t)} aria-label="Duplicate transaction">
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" aria-label="Delete transaction">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                          <AlertDialogDescription>This will permanently delete this transaction. Are you sure?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(t.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={16} className="text-center py-8 text-muted-foreground">No transactions found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.map((t) => (
          <Card key={t.id} className="border-primary/10">
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{t.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{t.father_name ? `S/O ${t.father_name}` : ""}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">₹{Number(t.amount).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground capitalize">{t.item_type}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select value={t.status || "pending"} onValueChange={(val) => handleStatusChange(t.id, val)}>
                  <SelectTrigger className="h-8 w-[120px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                {t.status === "completed" && t.completed_date && (
                  <span className="text-xs text-muted-foreground">{t.completed_date}</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1 text-sm text-muted-foreground">
                <span>📅 {t.date}</span>
                <span>🔢 {t.serial_no}</span>
                <span>📞 {t.phone}</span>
                <span>📍 {t.area}</span>
                <span>💎 {t.item_name}</span>
                <span>⚖️ {t.weight}</span>
              </div>
              <div className="flex gap-2">
                {onDuplicate && (
                  <Button variant="outline" size="sm" className="flex-1 text-primary border-primary/30" onClick={() => handleDuplicate(t)}>
                    <Plus className="h-4 w-4 mr-1" /> Add Similar
                  </Button>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex-1 text-destructive border-destructive/30">
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                      <AlertDialogDescription>This will permanently delete this transaction.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDelete(t.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-center py-8 text-muted-foreground">No transactions found</p>}
      </div>
    </div>
  );
}

// React.memo prevents parent re-renders (route changes, query refetches with
// identical data) from re-rendering this heavy table when props are shallow-equal.
export const TransactionTable = memo(TransactionTableImpl);
