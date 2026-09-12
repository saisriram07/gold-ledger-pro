import { Seo } from "@/components/Seo";
import { useTransactions } from "@/hooks/useTransactions";
import { TransactionTable } from "@/components/TransactionTable";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

const SilverRecords = () => {
  const { data: transactions = [], allData = [], isLoading, deleteTransaction, updateStatus } = useTransactions("silver", { excludeProfileOnly: true });
  const navigate = useNavigate();
  // Totals include every silver transaction, listing excludes profile-only rows.
  const silverRows = useMemo(() => allData.filter((t) => t.item_type === "silver"), [allData]);
  const total = useMemo(() => silverRows.reduce((s, t) => s + Number(t.amount), 0), [silverRows]);

  const totalGrams = useMemo(() => {
    const grams = silverRows.reduce((sum, t) => sum + (parseFloat(t.weight) || 0), 0);
    return `${grams.toFixed(2)} grams`;
  }, [silverRows]);

  return (
    <>
      <Seo title="Silver Records — Gold Finance Management" description="All silver jewellery transactions with weight, amount and customer details." path="/silver-records" noindex />
      <TransactionTable
        transactions={transactions}
        isLoading={isLoading}
        onDelete={(id) => deleteTransaction.mutate(id)}
        onStatusChange={(id, status, date) => updateStatus.mutate({ id, status, completed_date: date })}
        onDuplicate={(tx) => navigate("/new-transaction", { state: { prefill: tx } })}
        title="Silver Records"
        totalLabel="Total Silver Amount"
        totalAmount={total}
        totalGrams={totalGrams}
      />
    </>
  );
};

export default SilverRecords;
