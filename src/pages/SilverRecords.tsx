import { useTransactions } from "@/hooks/useTransactions";
import { TransactionTable } from "@/components/TransactionTable";

const SilverRecords = () => {
  const { data: transactions = [], isLoading, deleteTransaction } = useTransactions("silver");
  const total = transactions.reduce((s, t) => s + Number(t.amount), 0);

  return (
    <TransactionTable
      transactions={transactions}
      isLoading={isLoading}
      onDelete={(id) => deleteTransaction.mutate(id)}
      title="Silver Records"
      totalLabel="Total Silver Amount"
      totalAmount={total}
    />
  );
};

export default SilverRecords;
