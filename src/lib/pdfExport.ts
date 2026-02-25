import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Tables } from "@/integrations/supabase/types";

type Transaction = Tables<"transactions">;

export function exportTransactionsPdf(transactions: Transaction[], title: string) {
  const doc = new jsPDF({ orientation: "landscape" });

  doc.setFontSize(18);
  doc.text(title, 14, 20);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);

  const rows = transactions.map((t) => [
    t.date,
    t.serial_no,
    t.customer_name,
    t.father_name || "-",
    t.phone,
    t.area,
    t.item_type,
    t.item_name,
    t.weight,
    `₹${Number(t.amount).toLocaleString()}`,
    (t.status || "pending").charAt(0).toUpperCase() + (t.status || "pending").slice(1),
    t.completed_date || "-",
  ]);

  autoTable(doc, {
    startY: 34,
    head: [["Date", "Serial", "Customer", "Father", "Phone", "Area", "Type", "Item", "Weight", "Amount", "Status", "Completed"]],
    body: rows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [183, 142, 58] },
  });

  doc.save(`${title.replace(/\s+/g, "_")}.pdf`);
}
