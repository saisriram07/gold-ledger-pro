import { Seo } from "@/components/Seo";
import { useTransactions } from "@/hooks/useTransactions";
import { TransactionTable } from "@/components/TransactionTable";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

const GoldRecords = () => {
  const { data: transactions = [], allData = [], isLoading, deleteTransaction, updateStatus } = useTransactions("gold", { excludeProfileOnly: true });
  const navigate = useNavigate();
  // Totals include every gold transaction, listing excludes profile-only rows.
  const goldRows = useMemo(() => allData.filter((t) => t.item_type === "gold"), [allData]);
  const total = useMemo(() => goldRows.reduce((s, t) => s + Number(t.amount), 0), [goldRows]);

  const totalGrams = useMemo(() => {
    const grams = goldRows.reduce((sum, t) => sum + (parseFloat(t.weight) || 0), 0);
    return `${grams.toFixed(2)} grams`;
  }, [goldRows]);

  return (
    <>
      <Seo title="Gold Records — Gold Finance Management" description="All gold jewellery transactions with weight, amount and customer details." path="/gold-records" noindex />
      <TransactionTable
        transactions={transactions}
        isLoading={isLoading}
        onDelete={(id) => deleteTransaction.mutate(id)}
        onStatusChange={(id, status, date) => updateStatus.mutate({ id, status, completed_date: date })}
        onDuplicate={(tx) => navigate("/new-transaction", { state: { prefill: tx } })}
        title="Gold Records"
        totalLabel="Total Gold Amount"
        totalAmount={total}
        totalGrams={totalGrams}
      />
    </>
  );
};

export default GoldRecords;
