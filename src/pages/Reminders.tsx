import { useTransactions } from "@/hooks/useTransactions";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare } from "lucide-react";
import { useMemo, useState } from "react";
import { differenceInMonths, differenceInYears } from "date-fns";
import { toast } from "sonner";

type TimeFilter = "1y" | "2y" | "3y" | "4y" | "5y+";

const typeMap: Record<string, string> = {
  gold: "బంగారం",
  silver: "వెండి",
  combination: "కాంబినేషన్",
};

const formatReminderAge = (monthsCompleted: number) => {
  const years = Math.floor(monthsCompleted / 12);
  const months = monthsCompleted % 12;
  const ageParts: string[] = [];

  if (years > 0) ageParts.push(`${years} Year${years > 1 ? "s" : ""}`);
  if (months > 0) ageParts.push(`${months} Month${months > 1 ? "s" : ""}`);

  return ageParts.join(" ") || "Less than a month";
};

const normalizePhoneForWhatsApp = (rawPhone: string) => {
  const trimmedPhone = rawPhone.trim();

  if (!trimmedPhone) {
    return { error: "Missing phone number. Please add the customer's phone number." };
  }

  const digits = trimmedPhone.replace(/\D/g, "").replace(/^0+/, "");
  const normalizedPhone = digits.length === 10 ? `91${digits}` : digits;

  if (!/^\d{10,15}$/.test(normalizedPhone)) {
    return { error: "Invalid phone number. Please check the customer phone number." };
  }

  return { normalizedPhone };
};

const filterLabels: Record<TimeFilter, string> = {
  "1y": "1+ Year",
  "2y": "2+ Years",
  "3y": "3+ Years",
  "4y": "4+ Years",
  "5y+": "5+ Years",
};

const Reminders = () => {
  const { data: transactions = [], isLoading } = useTransactions();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("1y");
  const { profile } = useAuth();

  const eligibleTransactions = useMemo(() => {
    const now = new Date();
    return transactions
      .filter((t) => {
        const months = differenceInMonths(now, new Date(t.date));
        switch (timeFilter) {
          case "1y": return months >= 12;
          case "2y": return months >= 24;
          case "3y": return months >= 36;
          case "4y": return months >= 48;
          case "5y+": return months >= 60;
        }
      })
      .map((t) => {
        const months = differenceInMonths(now, new Date(t.date));
        const years = differenceInYears(now, new Date(t.date));
        return {
          ...t,
          monthsCompleted: months,
          displayTime: years >= 1 ? `${years}y ${months % 12}m` : `${months}m`,
        };
      })
      .sort((a, b) => b.monthsCompleted - a.monthsCompleted);
  }, [transactions, timeFilter]);

  const handleWhatsAppClick = (t: typeof eligibleTransactions[number]) => {
    try {
      const shopName = profile?.shop_name?.trim() || "Our Shop";
      const phoneResult = normalizePhoneForWhatsApp(t.phone || "");

      if (phoneResult.error) {
        console.error("[WhatsApp Reminder] Phone validation failed:", phoneResult.error, {
          customerName: t.customer_name,
          rawPhone: t.phone,
        });
        toast.error(phoneResult.error);
        return;
      }

      const ageStr = formatReminderAge(t.monthsCompleted);
      const message = `నమస్కారం ${t.customer_name} గారు,\n\n${shopName} నుండి మీకు గుర్తు చేస్తున్నాము.\n\nమీ ${typeMap[t.item_type] || t.item_type} వస్తువు వివరాలు:\n\n🔸 వస్తువు: ${t.item_name}\n🔸 బరువు: ${t.weight} గ్రాములు\n🔸 మొత్తం: ₹${Number(t.amount).toLocaleString("en-IN")}\n🔸 నమోదు చేసిన కాలం: ${ageStr}\n\nఈ లావాదేవీకి ${ageStr} పూర్తయింది.\n\nదయచేసి వీలైనంత త్వరగా చెల్లింపు పూర్తి చేయండి.\n\nధన్యవాదాలు,\n${shopName}`;
      const url = `https://wa.me/${phoneResult.normalizedPhone}?text=${encodeURIComponent(message)}`;

      console.log("[WhatsApp Reminder] Customer Name:", t.customer_name);
      console.log("[WhatsApp Reminder] Phone Number:", phoneResult.normalizedPhone);
      console.log("[WhatsApp Reminder] Generated Message:", message);
      console.log("[WhatsApp Reminder] Final WhatsApp URL:", url);

      const popup = window.open("", "_blank");
      console.log("[WhatsApp Reminder] window.open() result:", popup ? "opened" : "blocked");

      if (!popup) {
        const popupError = "Popup blocked. Please allow popups and try again.";
        console.error("[WhatsApp Reminder]", popupError);
        toast.error(popupError);
        return;
      }

      popup.opener = null;
      popup.location.href = url;
      popup.focus?.();

      console.log("[WhatsApp Reminder] WhatsApp launch initiated successfully.");
    } catch (error) {
      console.error("[WhatsApp Reminder] Failed to open WhatsApp:", error);
      toast.error("Unable to open WhatsApp. Please try again.");
    }
  };

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-primary">Reminders</h1>
        <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(filterLabels) as TimeFilter[]).map((k) => (
              <SelectItem key={k} value={k}>{filterLabels[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <p className="text-sm text-muted-foreground">
        Showing {eligibleTransactions.length} transactions older than {filterLabels[timeFilter].toLowerCase()}.
      </p>

      {/* Desktop */}
      <div className="hidden md:block rounded-lg border overflow-auto max-h-[65vh]">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Age</TableHead>
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
                <TableCell>{t.displayTime}</TableCell>
                <TableCell>
                  <Badge variant={t.reminder_sent ? "secondary" : "destructive"}>
                    {t.reminder_sent ? "Sent" : "Pending"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => handleWhatsAppClick(t)}>
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
                <span>{t.displayTime} ago</span>
              </div>
              <Button type="button" size="sm" variant="outline" className="w-full gap-1" onClick={() => handleWhatsAppClick(t)}>
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
