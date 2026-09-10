import { Seo } from "@/components/Seo";
import { useTransactions } from "@/hooks/useTransactions";
import { TransactionTable } from "@/components/TransactionTable";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

const SilverRecords = () => {
  const { data: transactions = [], isLoading, deleteTransaction, updateStatus } = useTransactions("silver");
  const navigate = useNavigate();
  const total = transactions.reduce((s, t) => s + Number(t.amount), 0);

  const totalGrams = useMemo(() => {
    const grams = transactions
      .filter((t) => t.item_type === "silver")
      .reduce((sum, t) => sum + (parseFloat(t.weight) || 0), 0);
    return `${grams.toFixed(2)} grams`;
  }, [transactions]);

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
