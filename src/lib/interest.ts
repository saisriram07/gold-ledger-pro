// Interest calculation utilities.
//
// Rules (per spec):
// - Interest is always calculated on the PRINCIPAL only.
// - First completed month: full monthly interest = principal * rate% .
// - After the first month: day-wise on any additional days beyond 30
//   at (principal * rate% / 30) per day.
// - Principal never mutates automatically. Jama reduces the remaining balance
//   (Total Payable - jama), but never the principal.

export interface JamaEntry {
  amount: number | string;
}

export interface InterestBreakdown {
  months: number;
  days: number;
  interest: number;
  totalPayable: number;
  jamaPaid: number;
  remaining: number;
}

export function daysBetween(startISO: string, endISO?: string): number {
  const start = new Date(startISO);
  const end = endISO ? new Date(endISO) : new Date();
  const ms = end.getTime() - start.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export function calculateInterest(
  principal: number,
  ratePercent: number,
  startDate: string,
  endDate?: string,
): { months: number; days: number; interest: number } {
  if (!principal || !ratePercent || !startDate) {
    return { months: 0, days: 0, interest: 0 };
  }
  const totalDays = daysBetween(startDate, endDate);
  if (totalDays <= 0) return { months: 0, days: 0, interest: 0 };

  const monthlyRate = ratePercent / 100;
  // First completed month = full monthly interest even at day 1.
  // After 30 days, add per-day interest on the extras.
  if (totalDays <= 30) {
    return { months: 1, days: 0, interest: +(principal * monthlyRate).toFixed(2) };
  }
  const extraDays = totalDays - 30;
  const interest = principal * monthlyRate + (principal * monthlyRate * extraDays) / 30;
  return { months: 1, days: extraDays, interest: +interest.toFixed(2) };
}

export function summarize(
  principal: number,
  ratePercent: number,
  startDate: string,
  jama: JamaEntry[] = [],
  endDate?: string,
): InterestBreakdown {
  const { months, days, interest } = calculateInterest(principal, ratePercent, startDate, endDate);
  const totalPayable = +(principal + interest).toFixed(2);
  const jamaPaid = jama.reduce((s, j) => s + Number(j.amount || 0), 0);
  const remaining = +(totalPayable - jamaPaid).toFixed(2);
  return { months, days, interest, totalPayable, jamaPaid, remaining };
}

// Unified summary for a transaction row. Handles Gold + Silver Combination
// by summing per-metal interest calculated on each metal's own rate.
export interface TransactionSummary {
  principal: number;
  rate: number | null;
  interest: number;
  totalPayable: number;
  jamaPaid: number;
  remaining: number;
  isCombination: boolean;
  gold?: { amount: number; rate: number; interest: number; weight?: string | null; itemName?: string | null };
  silver?: { amount: number; rate: number; interest: number; weight?: string | null; itemName?: string | null };
}

export function summarizeTransaction(tx: any, jamaPaid = 0): TransactionSummary {
  if (tx?.item_type === "combination") {
    const goldAmount = Number(tx.gold_amount) || 0;
    const goldRate = Number(tx.gold_rate) || 0;
    const silverAmount = Number(tx.silver_amount) || 0;
    const silverRate = Number(tx.silver_rate) || 0;
    const gi = calculateInterest(goldAmount, goldRate, tx.date, tx.completed_date || undefined).interest;
    const si = calculateInterest(silverAmount, silverRate, tx.date, tx.completed_date || undefined).interest;
    const principal = goldAmount + silverAmount;
    const interest = +(gi + si).toFixed(2);
    const totalPayable = +(principal + interest).toFixed(2);
    return {
      principal,
      rate: null,
      interest,
      totalPayable,
      jamaPaid,
      remaining: +(totalPayable - jamaPaid).toFixed(2),
      isCombination: true,
      gold: { amount: goldAmount, rate: goldRate, interest: gi, weight: tx.gold_weight, itemName: tx.gold_item_name },
      silver: { amount: silverAmount, rate: silverRate, interest: si, weight: tx.silver_weight, itemName: tx.silver_item_name },
    };
  }
  const principal = Number(tx?.principal_amount ?? tx?.amount) || 0;
  const rate = Number(tx?.interest_rate) || 0;
  const s = summarize(principal, rate, tx?.date, [{ amount: jamaPaid }], tx?.completed_date || undefined);
  return { principal, rate, interest: s.interest, totalPayable: s.totalPayable, jamaPaid, remaining: s.remaining, isCombination: false };
}
