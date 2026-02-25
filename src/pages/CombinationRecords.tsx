import { useTransactions } from "@/hooks/useTransactions";

const CombinationRecords = () => {
  const { data: allTransactions = [], isLoading, deleteTransaction, updateStatus } = useTransactions();
  const transactions = allTransactions.filter((t) => t.item_type === "combination");
  const total = transactions.reduce((s, t) => s + Number(t.amount), 0);

  // Lazy import to avoid circular
  const { TransactionTable } = require("@/components/TransactionTable");

  return (
    <TransactionTable
      transactions={transactions}
      isLoading={isLoading}
      onDelete={(id: string) => deleteTransaction.mutate(id)}
      onStatusChange={(id: string, status: string, date?: string | null) => updateStatus.mutate({ id, status, completed_date: date })}
      title="Combination Records"
      totalLabel="Total Combination Amount"
      totalAmount={total}
    />
  );
};

export default CombinationRecords;
