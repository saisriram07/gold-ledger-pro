import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTransactions } from "@/hooks/useTransactions";
import { useCustomers, type Customer } from "@/hooks/useCustomers";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Seo } from "@/components/Seo";
import { CustomerCombobox } from "@/components/CustomerCombobox";
import { PhotoCapture } from "@/components/PhotoCapture";

const GOLD_RATES = ["2", "2.5", "3"] as const;
const SILVER_RATES = ["2", "3", "4", "5", "6"] as const;

type LoanType = "gold" | "silver";

const NewTransaction = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { addTransaction } = useTransactions();
  const { data: customers = [], addCustomer } = useCustomers();
  const prefill = (location.state as any)?.prefill;

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [serialNo, setSerialNo] = useState<string>("");
  const [loanType, setLoanType] = useState<LoanType>("gold");

  // Customer state (either selected existing or new)
  const [selected, setSelected] = useState<Customer | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [cust, setCust] = useState({
    name: "", father_name: "", phone: "", area: "", address: "", age: "",
  });
  const [photoPath, setPhotoPath] = useState<string | null>(null);

  // Loan fields
  const [item, setItem] = useState({ name: "", weight: "", amount: "", rate: "" });

  const availableRates = useMemo(() => (loanType === "gold" ? GOLD_RATES : SILVER_RATES), [loanType]);

  // Fetch next serial number from server on mount
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase.rpc("next_serial_no", { _uid: user.id });
      if (!error && typeof data === "number") setSerialNo(String(data));
    })();
  }, [user]);

  // Reset rate when loan type changes
  useEffect(() => { setItem((f) => ({ ...f, rate: "" })); }, [loanType]);

  // Handle "Add Similar" prefill
  useEffect(() => {
    if (!prefill) return;
    const type: LoanType = prefill.item_type === "silver" ? "silver" : "gold";
    setLoanType(type);
    setIsNew(true);
    setCust({
      name: prefill.customer_name || "",
      father_name: prefill.father_name || "",
      phone: prefill.phone || "",
      area: prefill.area || "",
      address: "",
      age: "",
    });
    setItem((f) => ({ ...f, name: prefill.item_name || "", weight: prefill.weight || "" }));
    window.history.replaceState({}, document.title);
  }, [prefill]);

  const handleSelect = (c: Customer | null) => {
    setSelected(c);
    setIsNew(false);
    if (c) {
      setCust({
        name: c.name, father_name: c.father_name || "", phone: c.phone,
        area: c.area || "", address: c.address || "", age: c.age ? String(c.age) : "",
      });
      setPhotoPath(c.photo_url || null);
    }
  };

  const handleNew = () => {
    setSelected(null);
    setIsNew(true);
    setCust({ name: "", father_name: "", phone: "", area: "", address: "", age: "" });
    setPhotoPath(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return toast.error("Pick a date");
    if (!serialNo) return toast.error("Serial number not generated yet");
    if (!cust.name.trim() || !cust.phone.trim()) return toast.error("Customer name and phone are required");
    if (!item.name.trim() || !item.weight.trim() || !item.amount || !item.rate) {
      return toast.error("Fill all loan fields including interest rate");
    }

    // Ensure a customer record exists
    let customerId = selected?.id ?? null;
    if (!customerId) {
      const created = await addCustomer.mutateAsync({
        name: cust.name.trim(),
        father_name: cust.father_name.trim() || null,
        phone: cust.phone.trim(),
        area: cust.area.trim() || null,
        address: cust.address.trim() || null,
        age: cust.age ? parseInt(cust.age, 10) : null,
        photo_url: photoPath,
      });
      customerId = created.id;
    } else if (selected && photoPath && photoPath !== selected.photo_url) {
      // Update customer photo if changed
      await supabase.from("customers").update({ photo_url: photoPath }).eq("id", selected.id);
    }

    addTransaction.mutate({
      date: format(date, "yyyy-MM-dd"),
      serial_no: serialNo,
      customer_id: customerId,
      customer_name: cust.name.trim(),
      father_name: cust.father_name.trim() || null,
      phone: cust.phone.trim(),
      area: cust.area.trim() || "-",
      item_type: loanType,
      loan_type: loanType,
      item_name: item.name.trim(),
      weight: item.weight.trim(),
      amount: parseFloat(item.amount),
      principal_amount: parseFloat(item.amount),
      interest_rate: parseFloat(item.rate),
      photo_url: photoPath,
    }, {
      onSuccess: () => navigate("/records"),
    });
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Seo title="New Transaction — Gold Finance Management" description="Record a new gold or silver loan with customer and interest details." path="/new-transaction" noindex />
      <Card className="border-primary/20">
        <CardHeader>
          <h1 className="text-xl font-semibold text-primary">New Transaction</h1>
          <p className="text-sm text-muted-foreground">Serial Number is auto-generated per shop.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-popover z-50" align="start">
                    <Calendar mode="single" selected={date} onSelect={setDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label>Serial No.</Label>
                <Input value={serialNo} readOnly className="bg-muted font-mono" />
              </div>
              <div className="space-y-1">
                <Label>Loan Type *</Label>
                <RadioGroup value={loanType} onValueChange={(v) => setLoanType(v as LoanType)} className="flex gap-4 mt-2">
                  <div className="flex items-center gap-2"><RadioGroupItem value="gold" id="lt-g" /><Label htmlFor="lt-g">Gold</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="silver" id="lt-s" /><Label htmlFor="lt-s">Silver</Label></div>
                </RadioGroup>
              </div>
            </div>

            {/* Customer selection */}
            <div className="space-y-3 border rounded-md p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-medium">Customer</h2>
                {(selected || isNew) && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setSelected(null); setIsNew(false); setCust({ name: "", father_name: "", phone: "", area: "", address: "", age: "" }); setPhotoPath(null); }}>
                    Clear
                  </Button>
                )}
              </div>
              <CustomerCombobox customers={customers} value={selected} onSelect={handleSelect} onNew={handleNew} />

              {(selected || isNew) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1"><Label>Customer Name *</Label><Input value={cust.name} onChange={(e) => setCust({ ...cust, name: e.target.value })} required /></div>
                  <div className="space-y-1"><Label>Father Name</Label><Input value={cust.father_name} onChange={(e) => setCust({ ...cust, father_name: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Phone *</Label><Input value={cust.phone} onChange={(e) => setCust({ ...cust, phone: e.target.value })} required /></div>
                  <div className="space-y-1"><Label>Area</Label><Input value={cust.area} onChange={(e) => setCust({ ...cust, area: e.target.value })} /></div>
                  <div className="space-y-1 sm:col-span-2"><Label>Address</Label><Input value={cust.address} onChange={(e) => setCust({ ...cust, address: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Age</Label><Input type="number" min="0" value={cust.age} onChange={(e) => setCust({ ...cust, age: e.target.value })} /></div>
                  <div className="sm:col-span-2"><PhotoCapture value={photoPath} onChange={setPhotoPath} /></div>
                </div>
              )}
            </div>

            {/* Loan details */}
            <div className="space-y-3 border rounded-md p-4">
              <h2 className="font-medium capitalize">{loanType} Loan Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1"><Label>{loanType === "gold" ? "Gold" : "Silver"} Name *</Label><Input value={item.name} onChange={(e) => setItem({ ...item, name: e.target.value })} placeholder="e.g. Chain, Ring" required /></div>
                <div className="space-y-1"><Label>Weight *</Label><Input value={item.weight} onChange={(e) => setItem({ ...item, weight: e.target.value })} placeholder="e.g. 10g" required /></div>
                <div className="space-y-1"><Label>Amount (₹) *</Label><Input type="number" min="0" step="0.01" value={item.amount} onChange={(e) => setItem({ ...item, amount: e.target.value })} required /></div>
                <div className="space-y-1">
                  <Label>Interest Rate *</Label>
                  <Select value={item.rate} onValueChange={(v) => setItem({ ...item, rate: v })}>
                    <SelectTrigger><SelectValue placeholder="Select rate" /></SelectTrigger>
                    <SelectContent>
                      {availableRates.map((r) => <SelectItem key={r} value={r}>{r}%</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={addTransaction.isPending || addCustomer.isPending}>
              {addTransaction.isPending ? "Saving..." : "Save Transaction"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewTransaction;
