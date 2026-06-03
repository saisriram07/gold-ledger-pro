import { useState, useEffect } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const NewTransaction = () => {
  const { addTransaction } = useTransactions();
  const location = useLocation();
  const prefill = (location.state as any)?.prefill;

  const [date, setDate] = useState<Date>();
  const [form, setForm] = useState({
    serial_no: "", customer_name: "", father_name: "", phone: "", area: "",
    item_type: "" as "" | "gold" | "silver" | "combination",
    item_name: "", weight: "", amount: "",
  });

  useEffect(() => {
    if (prefill) {
      setForm({
        serial_no: prefill.serial_no || "",
        customer_name: prefill.customer_name || "",
        father_name: prefill.father_name || "",
        phone: prefill.phone || "",
        area: prefill.area || "",
        item_type: prefill.item_type || "",
        item_name: prefill.item_name || "",
        weight: prefill.weight || "",
        amount: "",
      });
      // Clear the state so refresh doesn't re-prefill
      window.history.replaceState({}, document.title);
    }
  }, [prefill]);

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !form.serial_no.trim() || !form.customer_name.trim() || !form.phone.trim() || !form.area.trim() || !form.item_type || !form.item_name.trim() || !form.weight.trim() || !form.amount) {
      toast.error("Please fill in all required fields");
      return;
    }
    addTransaction.mutate({
      date: format(date, "yyyy-MM-dd"),
      serial_no: form.serial_no.trim(),
      customer_name: form.customer_name.trim(),
      father_name: form.father_name.trim() || null,
      phone: form.phone.trim(),
      area: form.area.trim(),
      item_type: form.item_type as "gold" | "silver" | "combination",
      item_name: form.item_name.trim(),
      weight: form.weight.trim(),
      amount: parseFloat(form.amount),
    }, {
      onSuccess: () => {
        setDate(undefined);
        setForm({ serial_no: "", customer_name: "", father_name: "", phone: "", area: "", item_type: "", item_name: "", weight: "", amount: "" });
      },
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border-primary/20">
        <CardHeader>
          <h1 className="text-xl font-semibold text-primary">New Transaction</h1>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={date} onSelect={setDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label>Serial Number *</Label>
                <Input value={form.serial_no} onChange={update("serial_no")} placeholder="Serial number" required />
              </div>
              <div className="space-y-1">
                <Label>Customer Name *</Label>
                <Input value={form.customer_name} onChange={update("customer_name")} placeholder="Customer name" required />
              </div>
              <div className="space-y-1">
                <Label>Father Name</Label>
                <Input value={form.father_name} onChange={update("father_name")} placeholder="Father name" />
              </div>
              <div className="space-y-1">
                <Label>Phone Number *</Label>
                <Input value={form.phone} onChange={update("phone")} placeholder="Phone number" required />
              </div>
              <div className="space-y-1">
                <Label>Area *</Label>
                <Input value={form.area} onChange={update("area")} placeholder="Area/Village" required />
              </div>
              <div className="space-y-1">
                <Label>Item Type *</Label>
                <Select value={form.item_type} onValueChange={(v) => setForm((f) => ({ ...f, item_type: v as "gold" | "silver" | "combination" }))}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="silver">Silver</SelectItem>
                    <SelectItem value="combination">Combination</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Item Name *</Label>
                <Input value={form.item_name} onChange={update("item_name")} placeholder="Item name" required />
              </div>
              <div className="space-y-1">
                <Label>Weight *</Label>
                <Input value={form.weight} onChange={update("weight")} placeholder="e.g. 10g" required />
              </div>
              <div className="space-y-1">
                <Label>Amount (₹) *</Label>
                <Input type="number" value={form.amount} onChange={update("amount")} placeholder="Amount" required min="0" step="0.01" />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={addTransaction.isPending}>
              {addTransaction.isPending ? "Adding..." : "Add Transaction"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewTransaction;
