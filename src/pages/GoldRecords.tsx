import { useTransactions } from "@/hooks/useTransactions";
import { TransactionTable } from "@/components/TransactionTable";

const GoldRecords = () => {
  const { data: transactions = [], isLoading, deleteTransaction } = useTransactions("gold");
  const total = transactions.reduce((s, t) => s + Number(t.amount), 0);

  return (
    <TransactionTable
      transactions={transactions}
      isLoading={isLoading}
      onDelete={(id) => deleteTransaction.mutate(id)}
      title="Gold Records"
      totalLabel="Total Gold Amount"
      totalAmount={total}
    />
  );
};

export default GoldRecords;
