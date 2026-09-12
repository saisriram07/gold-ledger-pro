import { Seo } from "@/components/Seo";
import { useTransactions } from "@/hooks/useTransactions";
import { TransactionTable } from "@/components/TransactionTable";
import { useNavigate } from "react-router-dom";

const CombinationRecords = () => {
  const { data: allTransactions = [], allData = [], isLoading, deleteTransaction, updateStatus } = useTransactions(undefined, { excludeProfileOnly: true });
  const navigate = useNavigate();
  const transactions = allTransactions.filter((t) => t.item_type === "combination");
  // Total counts every combination transaction, including profile entries.
  const total = allData
    .filter((t) => t.item_type === "combination")
    .reduce((s, t) => s + Number(t.amount), 0);

  return (
    <>
      <Seo title="Combination Records — Gold Finance Management" description="Combined gold and silver jewellery transactions with amounts and customer details." path="/combination-records" noindex />
      <TransactionTable
        transactions={transactions}
        isLoading={isLoading}
        onDelete={(id) => deleteTransaction.mutate(id)}
        onStatusChange={(id, status, date) => updateStatus.mutate({ id, status, completed_date: date })}
        onDuplicate={(tx) => navigate("/new-transaction", { state: { prefill: tx } })}
        title="Combination Records"
        totalLabel="Total Combination Amount"
        totalAmount={total}
      />
    </>
  );
};

export default CombinationRecords;
