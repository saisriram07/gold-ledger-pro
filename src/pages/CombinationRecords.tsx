import { useTransactions } from "@/hooks/useTransactions";
import { TransactionTable } from "@/components/TransactionTable";

const CombinationRecords = () => {
  const { data: allTransactions = [], isLoading, deleteTransaction, updateStatus } = useTransactions();
  const transactions = allTransactions.filter((t) => t.item_type === "combination");
  const total = transactions.reduce((s, t) => s + Number(t.amount), 0);

  return (
    <TransactionTable
      transactions={transactions}
      isLoading={isLoading}
      onDelete={(id) => deleteTransaction.mutate(id)}
      onStatusChange={(id, status, date) => updateStatus.mutate({ id, status, completed_date: date })}
      title="Combination Records"
      totalLabel="Total Combination Amount"
      totalAmount={total}
    />
  );
};

export default CombinationRecords;
