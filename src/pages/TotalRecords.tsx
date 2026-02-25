import { useTransactions } from "@/hooks/useTransactions";
import { TransactionTable } from "@/components/TransactionTable";
import { useMemo } from "react";

const TotalRecords = () => {
  const { data: transactions = [], isLoading, deleteTransaction, updateStatus } = useTransactions();

  const goldAmount = useMemo(() =>
    transactions.filter((t) => t.item_type === "gold").reduce((s, t) => s + Number(t.amount), 0),
    [transactions]
  );

  const silverAmount = useMemo(() =>
    transactions.filter((t) => t.item_type === "silver").reduce((s, t) => s + Number(t.amount), 0),
    [transactions]
  );

  const combinationAmount = useMemo(() =>
    transactions.filter((t) => t.item_type === "combination").reduce((s, t) => s + Number(t.amount), 0),
    [transactions]
  );

  return (
    <TransactionTable
      transactions={transactions}
      isLoading={isLoading}
      onDelete={(id) => deleteTransaction.mutate(id)}
      onStatusChange={(id, status, date) => updateStatus.mutate({ id, status, completed_date: date })}
      title="Total Records"
      showSummary
      goldAmount={goldAmount}
      silverAmount={silverAmount}
      combinationAmount={combinationAmount}
    />
  );
};

export default TotalRecords;
