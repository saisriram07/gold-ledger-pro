import { useParams, Link } from "react-router-dom";
import { useState, useMemo } from "react";
import { useCustomer } from "@/hooks/useCustomers";
import { useTransactions } from "@/hooks/useTransactions";
import { useJama, useAllJama } from "@/hooks/useJama";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { WheelDatePicker } from "@/components/WheelDatePicker";
import { CalendarIcon, ArrowLeft, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { summarizeTransaction } from "@/lib/interest";
import { Seo } from "@/components/Seo";
import { useEffect } from "react";

const CustomerProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { data: customer, isLoading } = useCustomer(id);
  const { data: allTx = [] } = useTransactions();
  const { data: allJama = [] } = useAllJama();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!customer?.photo_url) return;
    supabase.storage.from("customer-photos").createSignedUrl(customer.photo_url, 3600).then(({ data }) => {
      if (data?.signedUrl) setPhotoUrl(data.signedUrl);
    });
  }, [customer?.photo_url]);

  const customerTx = useMemo(
    () => allTx.filter((t) => t.customer_id === id).sort((a, b) => a.date.localeCompare(b.date)),
    [allTx, id],
  );


  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  if (!customer) return <div className="text-center py-8">Customer not found. <Link to="/records" className="text-primary underline">Back</Link></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <Seo title={`${customer.name} — Customer Profile`} description="Customer profile with loan, interest, jama history, and remaining balance." path={`/customer/${id}`} noindex />
      <Link to="/records" className="inline-flex items-center gap-1 text-sm text-primary"><ArrowLeft className="h-4 w-4" /> Back to Records</Link>

      <Card>
        <CardHeader>
          <CardTitle>{customer.name}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-[auto,1fr] gap-6">
          <div>
            {photoUrl ? (
              <img src={photoUrl} alt={customer.name} className="h-40 w-40 object-cover rounded-lg border" />
            ) : (
              <div className="h-40 w-40 rounded-lg border border-dashed flex items-center justify-center text-muted-foreground text-sm">No photo</div>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-muted-foreground">Father</dt><dd className="font-medium">{customer.father_name || "-"}</dd></div>
            <div><dt className="text-muted-foreground">Phone</dt><dd className="font-medium">{customer.phone}</dd></div>
            <div><dt className="text-muted-foreground">Area</dt><dd className="font-medium">{customer.area || "-"}</dd></div>
            <div><dt className="text-muted-foreground">Address</dt><dd className="font-medium">{customer.address || "-"}</dd></div>
            <div><dt className="text-muted-foreground">Age</dt><dd className="font-medium">{customer.age ?? "-"}</dd></div>
            <div><dt className="text-muted-foreground">Status</dt><dd><Badge variant={customer.status === "active" ? "default" : "secondary"} className="capitalize">{customer.status}</Badge></dd></div>
          </dl>
        </CardContent>
      </Card>

      <h2 className="text-lg font-semibold pt-2">Loans & Jama History</h2>
      {customerTx.length === 0 && <p className="text-muted-foreground text-sm">No transactions yet for this customer.</p>}
      {customerTx.map((t) => (
        <div key={t.id} className="grid gap-4">
          <LoanCard tx={t} jama={allJama.filter((j) => j.transaction_id === t.id)} />
        </div>
      ))}
    </div>
  );
};

/** Deletes exactly one transaction (by its database id) plus its own jama rows. */
function DeleteTransactionButton({ txId }: { txId: string }) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);

  const handleDelete = async () => {
    setPending(true);
    const { error: jamaError } = await supabase.from("jama_payments").delete().eq("transaction_id", txId);
    if (jamaError) {
      setPending(false);
      toast.error(jamaError.message);
      return;
    }
    const { error } = await supabase.from("transactions").delete().eq("id", txId);
    setPending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["jama"] });
    toast.success("Transaction deleted");
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" aria-label="Delete transaction" disabled={pending}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to delete this transaction?</AlertDialogTitle>
          <AlertDialogDescription>
            Only this transaction and its own payments will be removed. The customer and other transactions stay.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}


function LoanCard({ tx, jama }: { tx: any; jama: any[] }) {
  // Jama rows already come from the single useAllJama() query on the parent —
  // disable the per-loan query so N loan cards don't fire N requests.
  const { addJama, deleteJama } = useJama(tx.id, { enabled: false });

  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [paidDate, setPaidDate] = useState<Date | undefined>(new Date());

  const summary = useMemo(() => summarizeTransaction(tx, jama), [tx, jama]);
  const isCombo = summary.isCombination;

  const submitJama = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !paidDate) return;
    addJama.mutate(
      { transaction_id: tx.id, amount: parseFloat(amount), notes: notes || null, paid_date: format(paidDate, "yyyy-MM-dd") },
      { onSuccess: () => { setAmount(""); setNotes(""); setPaidDate(new Date()); } },
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">
            {isCombo ? (
              <>Gold + Silver Combination</>
            ) : (
              <><span className="capitalize">{tx.loan_type || tx.item_type}</span> · {tx.item_name} · {tx.weight}</>
            )}
          </CardTitle>
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="outline">Serial {tx.serial_no}</Badge>
            <Badge variant="outline">{tx.date}</Badge>
            <Badge variant={tx.status === "completed" ? "secondary" : "default"} className="capitalize">{tx.status}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isCombo && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-md border p-3 space-y-1 text-sm">
              <p className="font-semibold text-primary">Gold Details</p>
              <p><span className="text-muted-foreground">Item:</span> {summary.gold?.itemName || "-"}</p>
              <p><span className="text-muted-foreground">Weight:</span> {summary.gold?.weight || "-"}</p>
              <p><span className="text-muted-foreground">Amount:</span> ₹{(summary.gold?.amount || 0).toLocaleString()}</p>
              <p><span className="text-muted-foreground">Rate:</span> {summary.gold?.rate}%</p>
              <p><span className="text-muted-foreground">Interest:</span> ₹{(summary.gold?.interest || 0).toLocaleString()}</p>
            </div>
            <div className="rounded-md border p-3 space-y-1 text-sm">
              <p className="font-semibold text-primary">Silver Details</p>
              <p><span className="text-muted-foreground">Item:</span> {summary.silver?.itemName || "-"}</p>
              <p><span className="text-muted-foreground">Weight:</span> {summary.silver?.weight || "-"}</p>
              <p><span className="text-muted-foreground">Amount:</span> ₹{(summary.silver?.amount || 0).toLocaleString()}</p>
              <p><span className="text-muted-foreground">Rate:</span> {summary.silver?.rate}%</p>
              <p><span className="text-muted-foreground">Interest:</span> ₹{(summary.silver?.interest || 0).toLocaleString()}</p>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
          <Stat label={isCombo ? "Combined Principal" : "Principal"} value={`₹${summary.principal.toLocaleString()}`} />
          <Stat label="Rate" value={isCombo ? `G ${summary.gold?.rate}% / S ${summary.silver?.rate}%` : `${summary.rate}%`} />
          <Stat label={isCombo ? "Combined Interest" : "Interest"} value={`₹${summary.interest.toLocaleString()}`} />
          <Stat label="Total Payable" value={`₹${summary.totalPayable.toLocaleString()}`} />
          <Stat label="Jama Paid" value={`₹${summary.jamaPaid.toLocaleString()}`} />
          <Stat label="Remaining" value={`₹${summary.remaining.toLocaleString()}`} highlight />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
          
          <Stat label="Remaining Principal" value={`₹${summary.remainingPrincipal.toLocaleString()}`} />
          <Stat label="Remaining Interest" value={`₹${summary.remainingInterest.toLocaleString()}`} />
          <Stat label="Outstanding Balance" value={`₹${summary.outstanding.toLocaleString()}`} highlight />
          <Stat label="Last Payment Date" value={summary.lastPaymentDate || "-"} />
          <Stat label="Next Interest From" value={summary.nextInterestDate} />
        </div>


        <div>
          <h3 className="text-sm font-semibold mb-2">Jama History</h3>
          {jama.length === 0 ? (
            <p className="text-xs text-muted-foreground">No payments recorded.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Payment Date</TableHead><TableHead>Interest till Date</TableHead><TableHead>Amount Paid (Jama)</TableHead><TableHead>Remaining Balance</TableHead><TableHead>Next Interest From</TableHead><TableHead>Notes</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {jama.map((j) => {
                  const p = summary.periods.find((x) => x.paidDate === j.paid_date);
                  return (
                  <TableRow key={j.id}>
                    <TableCell>{j.paid_date}</TableCell>
                    <TableCell>₹{(p?.interestTillDate ?? 0).toLocaleString()}</TableCell>
                    <TableCell>₹{Number(j.amount).toLocaleString()}</TableCell>
                    <TableCell>₹{(p?.remainingBalance ?? 0).toLocaleString()}</TableCell>
                    <TableCell>{p?.nextInterestStart || "-"}</TableCell>
                    <TableCell>{j.notes || "-"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteJama.mutate(j.id)} aria-label="Delete jama">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <form onSubmit={submitJama} className="border-t pt-3 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="space-y-1">
            <Label>Payment Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" className={cn("w-full justify-start text-left font-normal", !paidDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />{paidDate ? format(paidDate, "PP") : "Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3 bg-popover z-50"><WheelDatePicker value={paidDate} onChange={setPaidDate} /></PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1"><Label>Amount</Label><Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required /></div>
          <div className="space-y-1 md:col-span-1"><Label>Notes</Label><Textarea rows={1} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" /></div>
          <Button type="submit" disabled={addJama.isPending}>Add Jama</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-md border p-2", highlight && "bg-primary/10 border-primary/30")}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

export default CustomerProfile;
