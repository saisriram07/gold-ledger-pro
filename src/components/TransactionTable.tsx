import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, Search, Download } from "lucide-react";
import { exportTransactionsPdf } from "@/lib/pdfExport";
import type { Tables } from "@/integrations/supabase/types";

type Transaction = Tables<"transactions">;

interface Props {
  transactions: Transaction[];
  isLoading: boolean;
  onDelete: (id: string) => void;
  title: string;
  totalLabel?: string;
  totalAmount?: number;
  showSummary?: boolean;
  goldAmount?: number;
  silverAmount?: number;
  combinationAmount?: number;
}

export function TransactionTable({ transactions, isLoading, onDelete, title, totalLabel, totalAmount, showSummary, goldAmount, silverAmount, combinationAmount }: Props) {
  const [search, setSearch] = useState("");

  const filtered = transactions.filter((t) => {
    const q = search.toLowerCase();
    return !q || t.serial_no.toLowerCase().includes(q) || t.customer_name.toLowerCase().includes(q) || t.phone.includes(q) || t.area.toLowerCase().includes(q) || t.item_type.includes(q);
  });

  const overallTotal = filtered.reduce((s, t) => s + Number(t.amount), 0);

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">{title}</h1>
        <Button variant="outline" size="sm" className="gap-1" onClick={() => exportTransactionsPdf(filtered, title)}>
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
        <Card><CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">{totalLabel}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-primary">₹{(totalAmount ?? overallTotal).toLocaleString()}</p></CardContent></Card>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by serial, name, phone, area, type..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-lg border overflow-auto max-h-[60vh]">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Date</TableHead>
              <TableHead>Serial</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Father</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Area</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Weight</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="whitespace-nowrap">{t.date}</TableCell>
                <TableCell>{t.serial_no}</TableCell>
                <TableCell>{t.customer_name}</TableCell>
                <TableCell>{t.father_name || "-"}</TableCell>
                <TableCell>{t.phone}</TableCell>
                <TableCell>{t.area}</TableCell>
                <TableCell className="capitalize">{t.item_type}</TableCell>
                <TableCell>{t.item_name}</TableCell>
                <TableCell>{t.weight}</TableCell>
                <TableCell className="text-right font-medium">₹{Number(t.amount).toLocaleString()}</TableCell>
                <TableCell>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
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
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">No transactions found</TableCell></TableRow>
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
              <div className="grid grid-cols-2 gap-1 text-sm text-muted-foreground">
                <span>📅 {t.date}</span>
                <span>🔢 {t.serial_no}</span>
                <span>📞 {t.phone}</span>
                <span>📍 {t.area}</span>
                <span>💎 {t.item_name}</span>
                <span>⚖️ {t.weight}</span>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full text-destructive border-destructive/30">
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
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-center py-8 text-muted-foreground">No transactions found</p>}
      </div>
    </div>
  );
}
