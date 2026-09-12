import { Seo } from "@/components/Seo";
import { useTransactions } from "@/hooks/useTransactions";
import { TransactionTable } from "@/components/TransactionTable";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

const TotalRecords = () => {
  const { data: transactions = [], allData = [], isLoading, deleteTransaction, updateStatus } = useTransactions(undefined, { excludeProfileOnly: true });
  const navigate = useNavigate();

  // Totals count every transaction (profile entries included) so the amounts
  // match the Dashboard, while the listing avoids duplicate profile rows.
  const goldAmount = useMemo(() =>
    allData.filter((t) => t.item_type === "gold").reduce((s, t) => s + Number(t.amount), 0),
    [allData]
  );

  const silverAmount = useMemo(() =>
    allData.filter((t) => t.item_type === "silver").reduce((s, t) => s + Number(t.amount), 0),
    [allData]
  );

  const combinationAmount = useMemo(() =>
    allData.filter((t) => t.item_type === "combination").reduce((s, t) => s + Number(t.amount), 0),
    [allData]
  );

  return (
    <>
      <Seo title="Total Records — Gold Finance Management" description="All jewellery transactions across gold, silver and combination items in a single ledger view." path="/records" noindex />
      <TransactionTable
        transactions={transactions}
        isLoading={isLoading}
        onDelete={(id) => deleteTransaction.mutate(id)}
        onStatusChange={(id, status, date) => updateStatus.mutate({ id, status, completed_date: date })}
        onDuplicate={(tx) => navigate("/new-transaction", { state: { prefill: tx } })}
        title="Total Records"
        showSummary
        goldAmount={goldAmount}
        silverAmount={silverAmount}
        combinationAmount={combinationAmount}
      />
    </>
  );
};

export default TotalRecords;
