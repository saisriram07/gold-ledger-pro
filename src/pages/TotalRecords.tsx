import { useTransactions } from "@/hooks/useTransactions";
import { TransactionTable } from "@/components/TransactionTable";
import { useMemo } from "react";

const TotalRecords = () => {
  const { data: transactions = [], isLoading, deleteTransaction } = useTransactions();

  const goldAmount = useMemo(() =>
    transactions.filter((t) => t.item_type === "gold" || t.item_type === "combination").reduce((s, t) => s + Number(t.amount), 0),
    [transactions]
  );

  const silverAmount = useMemo(() =>
    transactions.filter((t) => t.item_type === "silver" || t.item_type === "combination").reduce((s, t) => s + Number(t.amount), 0),
    [transactions]
  );

  return (
    <TransactionTable
      transactions={transactions}
      isLoading={isLoading}
      onDelete={(id) => deleteTransaction.mutate(id)}
      title="Total Records"
      showSummary
      goldAmount={goldAmount}
      silverAmount={silverAmount}
    />
  );
};

export default TotalRecords;
