import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTransactions } from "@/hooks/useTransactions";
import { useCustomers } from "@/hooks/useCustomers";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Seo } from "@/components/Seo";

const GOLD_RATES = ["2", "2.5", "3"] as const;
const SILVER_RATES = ["2", "3", "4", "5", "6"] as const;

type FinanceType = "gold" | "silver" | "combination";

const emptyCust = { name: "", father_name: "", phone: "", area: "", address: "", age: "" };
const emptyLeg = { item_name: "", weight: "", amount: "", rate: "" };

const NewTransaction = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { addTransaction } = useTransactions();
  const { data: customers = [], addCustomer } = useCustomers();
  const prefill = (location.state as any)?.prefill;

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [serialNo, setSerialNo] = useState<string>("");
  const [financeType, setFinanceType] = useState<FinanceType>("gold");

  const [cust, setCust] = useState({ ...emptyCust });
  const [single, setSingle] = useState({ ...emptyLeg });
  const [gold, setGold] = useState({ ...emptyLeg });
  const [silver, setSilver] = useState({ ...emptyLeg });

  const availableRates = useMemo(() => (financeType === "silver" ? SILVER_RATES : GOLD_RATES), [financeType]);

  useEffect(() => { setSingle((f) => ({ ...f, rate: "" })); }, [financeType]);


  useEffect(() => {
    if (!prefill) return;
    const t: FinanceType = prefill.item_type === "silver" ? "silver" : prefill.item_type === "combination" ? "combination" : "gold";
    setFinanceType(t);
    setCust({
      name: prefill.customer_name || "", father_name: prefill.father_name || "",
      phone: prefill.phone || "", area: prefill.area || "", address: "", age: "",
    });
    if (t !== "combination") {
      setSingle((f) => ({ ...f, item_name: prefill.item_name || "", weight: prefill.weight || "" }));
    }
    window.history.replaceState({}, document.title);
  }, [prefill]);

  const resetForm = () => {
    setDate(new Date());
    setFinanceType("gold");
    setCust({ ...emptyCust });
    setSingle({ ...emptyLeg });
    setGold({ ...emptyLeg });
    setSilver({ ...emptyLeg });
    setSerialNo("");
  };

  const validateLeg = (leg: typeof emptyLeg, label: string) => {
    if (!leg.item_name.trim()) return `${label} item name is required`;
    if (!leg.weight || parseFloat(leg.weight) <= 0) return `${label} weight must be greater than 0`;
    if (!leg.amount || parseFloat(leg.amount) <= 0) return `${label} amount must be greater than 0`;
    if (!leg.rate) return `${label} interest rate is required`;
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return toast.error("Date is required");
    if (!serialNo.trim()) return toast.error("Serial number is required");
    if (!cust.name.trim()) return toast.error("Customer Name is required");
    if (!/^\d{10}$/.test(cust.phone.trim())) return toast.error("Mobile number must be exactly 10 digits");
    if (!cust.area.trim()) return toast.error("Area / Address is required");

    if (financeType === "combination") {
      const g = validateLeg(gold, "Gold"); if (g) return toast.error(g);
      const s = validateLeg(silver, "Silver"); if (s) return toast.error(s);
    } else {
      const err = validateLeg(single, financeType === "gold" ? "Gold" : "Silver");
      if (err) return toast.error(err);
    }

    // Find existing customer by phone (within this shop) or create a new one.
    const phoneClean = cust.phone.trim();
    const existing = customers.find((c) => c.phone === phoneClean);
    let customerId = existing?.id ?? null;
    if (!customerId) {
      const created = await addCustomer.mutateAsync({
        name: cust.name.trim(),
        father_name: cust.father_name.trim() || null,
        phone: phoneClean,
        area: cust.area.trim() || null,
        address: cust.address.trim() || null,
        age: cust.age ? parseInt(cust.age, 10) : null,
      });
      customerId = created.id;
    }

    const baseFields = {
      date: format(date, "yyyy-MM-dd"),
      customer_id: customerId,
      customer_name: cust.name.trim(),
      father_name: cust.father_name.trim() || null,
      phone: phoneClean,
      area: cust.area.trim(),
      serial_no: serialNo,
    };

    try {
      if (financeType === "combination") {
        const goldAmt = parseFloat(gold.amount);
        const silverAmt = parseFloat(silver.amount);
        await addTransaction.mutateAsync({
          ...baseFields,
          item_type: "combination",
          loan_type: "combination",
          item_name: `Gold: ${gold.item_name.trim()} + Silver: ${silver.item_name.trim()}`,
          weight: `Gold ${gold.weight.trim()} + Silver ${silver.weight.trim()}`,
          amount: goldAmt + silverAmt,
          principal_amount: goldAmt + silverAmt,
          interest_rate: null,
          gold_item_name: gold.item_name.trim(),
          gold_weight: gold.weight.trim(),
          gold_amount: goldAmt,
          gold_rate: parseFloat(gold.rate),
          silver_item_name: silver.item_name.trim(),
          silver_weight: silver.weight.trim(),
          silver_amount: silverAmt,
          silver_rate: parseFloat(silver.rate),
        } as any);
      } else {
        await addTransaction.mutateAsync({
          ...baseFields,
          item_type: financeType,
          loan_type: financeType,
          item_name: single.item_name.trim(),
          weight: single.weight.trim(),
          amount: parseFloat(single.amount),
          principal_amount: parseFloat(single.amount),
          interest_rate: parseFloat(single.rate),
        });
      }
      navigate("/records");
    } catch {
      // toast handled in hook
    }
  };

  const combinationTotal = useMemo(() => {
    const g = parseFloat(gold.amount) || 0;
    const s = parseFloat(silver.amount) || 0;
    return g + s;
  }, [gold.amount, silver.amount]);

  return (
    <div className="max-w-5xl mx-auto">
      <Seo title="New Transaction — Gold Finance Management" description="Record a new gold, silver, or combination loan." path="/new-transaction" noindex />
      <Card className="border-primary/20">
        <CardHeader>
          <h1 className="text-xl font-semibold text-primary">New Transaction</h1>
          <p className="text-sm text-muted-foreground">Fill in the details below. Serial number is auto-generated.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* LEFT COLUMN */}
              <div className="space-y-4">
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
                  <Label>Customer Name *</Label>
                  <Input
                    value={cust.name}
                    onChange={(e) => setCust({ ...cust, name: e.target.value })}
                    placeholder="Enter customer name"
                    autoComplete="off"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label>Area / Address *</Label>
                  <Input value={cust.area} onChange={(e) => setCust({ ...cust, area: e.target.value })} placeholder="Village / Area / Address" required />
                </div>

                <div className="space-y-1">
                  <Label>Finance Type *</Label>
                  <Select value={financeType} onValueChange={(v) => setFinanceType(v as FinanceType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gold">Gold Loan</SelectItem>
                      <SelectItem value="silver">Silver Loan</SelectItem>
                      <SelectItem value="combination">Gold + Silver Combination</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {financeType !== "combination" && (
                  <>
                    <div className="space-y-1">
                      <Label>Weight *</Label>
                      <Input value={single.weight} onChange={(e) => setSingle({ ...single, weight: e.target.value })} placeholder="e.g. 10g" required />
                    </div>
                    <div className="space-y-1">
                      <Label>Interest Rate *</Label>
                      <Select value={single.rate} onValueChange={(v) => setSingle({ ...single, rate: v })}>
                        <SelectTrigger><SelectValue placeholder="Select rate" /></SelectTrigger>
                        <SelectContent>
                          {availableRates.map((r) => <SelectItem key={r} value={r}>{r}%</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>

              {/* RIGHT COLUMN */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label>Serial Number</Label>
                  <Input value={serialNo} readOnly className="bg-muted font-mono" />
                </div>

                <div className="space-y-1">
                  <Label>Father / Husband Name</Label>
                  <Input value={cust.father_name} onChange={(e) => setCust({ ...cust, father_name: e.target.value })} />
                </div>

                <div className="space-y-1">
                  <Label>Mobile Number *</Label>
                  <Input
                    inputMode="numeric"
                    maxLength={10}
                    value={cust.phone}
                    onChange={(e) => setCust({ ...cust, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                    placeholder="10-digit mobile"
                    required
                  />
                </div>

                {financeType !== "combination" && (
                  <>
                    <div className="space-y-1">
                      <Label>Item Name *</Label>
                      <Input value={single.item_name} onChange={(e) => setSingle({ ...single, item_name: e.target.value })} placeholder="e.g. Chain, Ring" required />
                    </div>
                    <div className="space-y-1">
                      <Label>Amount (₹) *</Label>
                      <Input type="number" min="0" step="0.01" value={single.amount} onChange={(e) => setSingle({ ...single, amount: e.target.value })} required />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* COMBINATION SECTIONS */}
            {financeType === "combination" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3 border rounded-md p-4">
                  <h2 className="font-medium text-primary">Gold Details</h2>
                  <div className="space-y-1"><Label>Gold Item Name *</Label><Input value={gold.item_name} onChange={(e) => setGold({ ...gold, item_name: e.target.value })} required /></div>
                  <div className="space-y-1"><Label>Gold Weight *</Label><Input value={gold.weight} onChange={(e) => setGold({ ...gold, weight: e.target.value })} placeholder="e.g. 10g" required /></div>
                  <div className="space-y-1"><Label>Gold Amount (₹) *</Label><Input type="number" min="0" step="0.01" value={gold.amount} onChange={(e) => setGold({ ...gold, amount: e.target.value })} required /></div>
                  <div className="space-y-1">
                    <Label>Gold Interest Rate *</Label>
                    <Select value={gold.rate} onValueChange={(v) => setGold({ ...gold, rate: v })}>
                      <SelectTrigger><SelectValue placeholder="Select rate" /></SelectTrigger>
                      <SelectContent>{GOLD_RATES.map((r) => <SelectItem key={r} value={r}>{r}%</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-3 border rounded-md p-4">
                  <h2 className="font-medium text-primary">Silver Details</h2>
                  <div className="space-y-1"><Label>Silver Item Name *</Label><Input value={silver.item_name} onChange={(e) => setSilver({ ...silver, item_name: e.target.value })} required /></div>
                  <div className="space-y-1"><Label>Silver Weight *</Label><Input value={silver.weight} onChange={(e) => setSilver({ ...silver, weight: e.target.value })} placeholder="e.g. 20g" required /></div>
                  <div className="space-y-1"><Label>Silver Amount (₹) *</Label><Input type="number" min="0" step="0.01" value={silver.amount} onChange={(e) => setSilver({ ...silver, amount: e.target.value })} required /></div>
                  <div className="space-y-1">
                    <Label>Silver Interest Rate *</Label>
                    <Select value={silver.rate} onValueChange={(v) => setSilver({ ...silver, rate: v })}>
                      <SelectTrigger><SelectValue placeholder="Select rate" /></SelectTrigger>
                      <SelectContent>{SILVER_RATES.map((r) => <SelectItem key={r} value={r}>{r}%</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="md:col-span-2 flex justify-end text-sm">
                  <span className="text-muted-foreground mr-2">Total Loan Amount:</span>
                  <span className="font-semibold">₹ {combinationTotal.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* BOTTOM BUTTONS */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button type="submit" className="flex-1" disabled={addTransaction.isPending || addCustomer.isPending}>
                {addTransaction.isPending ? "Saving..." : "Save Transaction"}
              </Button>
              <Button type="button" variant="outline" className="flex-1" onClick={resetForm}>Reset</Button>
              <Button type="button" variant="ghost" className="flex-1" onClick={() => navigate(-1)}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewTransaction;
