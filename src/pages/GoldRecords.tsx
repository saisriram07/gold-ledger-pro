import { useTransactions } from "@/hooks/useTransactions";
import { TransactionTable } from "@/components/TransactionTable";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

const GoldRecords = () => {
  const { data: transactions = [], isLoading, deleteTransaction, updateStatus } = useTransactions("gold");
  const navigate = useNavigate();
  const total = transactions.reduce((s, t) => s + Number(t.amount), 0);

  const totalGrams = useMemo(() => {
    const grams = transactions.reduce((sum, t) => {
      const w = parseFloat(t.weight) || 0;
      return sum + w;
    }, 0);
    return `${grams.toFixed(2)} grams`;
  }, [transactions]);

  return (
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
  );
};

export default GoldRecords;
