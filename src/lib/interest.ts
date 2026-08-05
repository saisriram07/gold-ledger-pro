// Interest calculation utilities.
//
// Rules (per spec):
// - Interest is always calculated on the OUTSTANDING PRINCIPAL only.
// - First completed month of every calculation period: full monthly interest
//   = principal * rate%.
// - After 30 days: day-wise on any additional days at (principal * rate% / 30)
//   per day.
// - Every Jama (payment) closes a calculation period:
//     1. interest accrues up to the payment date,
//     2. the payment settles the accrued interest first, the surplus reduces
//        the outstanding principal,
//     3. the next period starts the DAY AFTER the payment date, and future
//        interest is calculated only on the reduced outstanding principal.
// - Interest is never recalculated on an amount that has already been paid.

export interface JamaEntry {
  amount: number | string;
  paid_date?: string | null;
}

export interface InterestBreakdown {
  months: number;
  days: number;
  interest: number;
  totalPayable: number;
  jamaPaid: number;
  remaining: number;
}

/** One closed calculation period created by a Jama payment. */
export interface JamaPeriod {
  paidDate: string;
  /** Interest accrued from the period start up to (and including) the payment date. */
  interestTillDate: number;
  jamaAmount: number;
  /** Outstanding balance (principal + unpaid interest) right after the payment. */
  remainingBalance: number;
  /** Day after the payment date — when the next interest period begins. */
  nextInterestStart: string;
}

export interface Ledger {
  principal: number;
  /** Interest accrued across all periods, including the still-open one. */
  totalInterest: number;
  jamaPaid: number;
  /** Principal still outstanding after all payments. */
  remainingPrincipal: number;
  /** Interest still unpaid (carried from closed periods + current open period). */
  remainingInterest: number;
  /** remainingPrincipal + remainingInterest. */
  outstanding: number;
  periods: JamaPeriod[];
  lastPaymentDate: string | null;
  /** Date from which interest is currently being calculated. */
  nextInterestDate: string;
  months: number;
  days: number;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function toDate(iso: string): Date {
  // Normalize to UTC midnight so day counts are calendar-stable.
  const d = new Date(iso);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function nextDayISO(iso: string): string {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + 1);
  return toISO(d);
}

export function daysBetween(startISO: string, endISO?: string): number {
  const start = toDate(startISO);
  const end = endISO ? toDate(endISO) : toDate(new Date().toISOString());
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY));
}

export function calculateInterest(
  principal: number,
  ratePercent: number,
  startDate: string,
  endDate?: string,
): { months: number; days: number; interest: number } {
  if (!principal || principal <= 0 || !ratePercent || !startDate) {
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

function round(n: number) {
  return +n.toFixed(2);
}

/**
 * Walks the Jama history chronologically, closing an interest period at every
 * payment date and restarting interest the next day on the reduced principal.
 */
export function buildLedger(
  principal: number,
  ratePercent: number,
  startDate: string,
  jama: JamaEntry[] = [],
  endDate?: string,
): Ledger {
  const safePrincipal = Number(principal) || 0;
  const rate = Number(ratePercent) || 0;
  const asOf = endDate || toISO(toDate(new Date().toISOString()));

  const payments = jama
    .map((j) => ({ amount: Number(j.amount) || 0, paidDate: j.paid_date || startDate }))
    .filter((p) => p.amount > 0)
    .sort((a, b) => a.paidDate.localeCompare(b.paidDate));

  let outstandingPrincipal = safePrincipal;
  let carriedInterest = 0; // accrued but unpaid interest from closed periods
  let totalInterest = 0;
  let jamaPaid = 0;
  let periodStart = startDate;
  const periods: JamaPeriod[] = [];

  for (const p of payments) {
    // Payments dated before the loan start (or same day) accrue no interest.
    const effectiveEnd = p.paidDate < periodStart ? periodStart : p.paidDate;
    const accrued = calculateInterest(outstandingPrincipal, rate, periodStart, effectiveEnd).interest;
    totalInterest = round(totalInterest + accrued);

    const interestDue = round(carriedInterest + accrued);
    let payment = p.amount;
    jamaPaid = round(jamaPaid + payment);

    if (payment >= interestDue) {
      payment = round(payment - interestDue);
      carriedInterest = 0;
      outstandingPrincipal = Math.max(0, round(outstandingPrincipal - payment));
    } else {
      carriedInterest = round(interestDue - payment);
    }

    periodStart = nextDayISO(effectiveEnd);
    periods.push({
      paidDate: p.paidDate,
      interestTillDate: accrued,
      jamaAmount: p.amount,
      remainingBalance: round(outstandingPrincipal + carriedInterest),
      nextInterestStart: periodStart,
    });
  }

  // Open period: from the day after the last payment (or the loan date) to now.
  const open = periodStart > asOf
    ? { months: 0, days: 0, interest: 0 }
    : calculateInterest(outstandingPrincipal, rate, periodStart, asOf);
  totalInterest = round(totalInterest + open.interest);
  const remainingInterest = round(carriedInterest + open.interest);

  return {
    principal: safePrincipal,
    totalInterest,
    jamaPaid,
    remainingPrincipal: outstandingPrincipal,
    remainingInterest,
    outstanding: round(outstandingPrincipal + remainingInterest),
    periods,
    lastPaymentDate: payments.length ? payments[payments.length - 1].paidDate : null,
    nextInterestDate: periodStart,
    months: open.months,
    days: open.days,
  };
}

export function summarize(
  principal: number,
  ratePercent: number,
  startDate: string,
  jama: JamaEntry[] = [],
  endDate?: string,
): InterestBreakdown {
  const l = buildLedger(principal, ratePercent, startDate, jama, endDate);
  return {
    months: l.months,
    days: l.days,
    interest: l.totalInterest,
    totalPayable: round(l.principal + l.totalInterest),
    jamaPaid: l.jamaPaid,
    remaining: l.outstanding,
  };
}

// Unified summary for a transaction row. Handles Gold + Silver Combination
// by summing per-metal interest calculated on each metal's own rate.
export interface MetalSummary {
  amount: number;
  rate: number;
  interest: number;
  remainingPrincipal: number;
  outstanding: number;
  weight?: string | null;
  itemName?: string | null;
}

export interface TransactionSummary {
  principal: number;
  rate: number | null;
  interest: number;
  totalPayable: number;
  jamaPaid: number;
  /** Latest outstanding balance (remaining principal + unpaid interest). */
  remaining: number;
  remainingPrincipal: number;
  remainingInterest: number;
  outstanding: number;
  lastPaymentDate: string | null;
  nextInterestDate: string;
  periods: JamaPeriod[];
  isCombination: boolean;
  gold?: MetalSummary;
  silver?: MetalSummary;
}

/** Accepts either the full Jama rows (preferred) or a pre-summed total. */
export function summarizeTransaction(tx: any, jama: number | JamaEntry[] = 0): TransactionSummary {
  const entries: JamaEntry[] = Array.isArray(jama)
    ? jama
    : jama > 0
      ? [{ amount: jama, paid_date: tx?.date }]
      : [];
  const endDate = tx?.completed_date || undefined;

  if (tx?.item_type === "combination") {
    const goldAmount = Number(tx.gold_amount) || 0;
    const goldRate = Number(tx.gold_rate) || 0;
    const silverAmount = Number(tx.silver_amount) || 0;
    const silverRate = Number(tx.silver_rate) || 0;
    const total = goldAmount + silverAmount;
    // Split each payment pro-rata across the two metals so each keeps its own rate.
    const goldShare = total > 0 ? goldAmount / total : 0;
    const goldJama = entries.map((e) => ({ ...e, amount: Number(e.amount || 0) * goldShare }));
    const silverJama = entries.map((e) => ({ ...e, amount: Number(e.amount || 0) * (1 - goldShare) }));

    const gl = buildLedger(goldAmount, goldRate, tx.date, goldJama, endDate);
    const sl = buildLedger(silverAmount, silverRate, tx.date, silverJama, endDate);

    const principal = total;
    const interest = round(gl.totalInterest + sl.totalInterest);
    const jamaPaid = round(gl.jamaPaid + sl.jamaPaid);
    const remainingPrincipal = round(gl.remainingPrincipal + sl.remainingPrincipal);
    const remainingInterest = round(gl.remainingInterest + sl.remainingInterest);
    const outstanding = round(remainingPrincipal + remainingInterest);
    // Combined period view (dates match across metals).
    const periods = gl.periods.map((p, i) => ({
      paidDate: p.paidDate,
      interestTillDate: round(p.interestTillDate + (sl.periods[i]?.interestTillDate ?? 0)),
      jamaAmount: round(p.jamaAmount + (sl.periods[i]?.jamaAmount ?? 0)),
      remainingBalance: round(p.remainingBalance + (sl.periods[i]?.remainingBalance ?? 0)),
      nextInterestStart: p.nextInterestStart,
    }));

    return {
      principal,
      rate: null,
      interest,
      totalPayable: round(principal + interest),
      jamaPaid,
      remaining: outstanding,
      remainingPrincipal,
      remainingInterest,
      outstanding,
      lastPaymentDate: gl.lastPaymentDate,
      nextInterestDate: gl.nextInterestDate,
      periods,
      isCombination: true,
      gold: {
        amount: goldAmount, rate: goldRate, interest: gl.totalInterest,
        remainingPrincipal: gl.remainingPrincipal, outstanding: gl.outstanding,
        weight: tx.gold_weight, itemName: tx.gold_item_name,
      },
      silver: {
        amount: silverAmount, rate: silverRate, interest: sl.totalInterest,
        remainingPrincipal: sl.remainingPrincipal, outstanding: sl.outstanding,
        weight: tx.silver_weight, itemName: tx.silver_item_name,
      },
    };
  }

  const principal = Number(tx?.principal_amount ?? tx?.amount) || 0;
  const rate = Number(tx?.interest_rate) || 0;
  const l = buildLedger(principal, rate, tx?.date, entries, endDate);
  return {
    principal,
    rate,
    interest: l.totalInterest,
    totalPayable: round(principal + l.totalInterest),
    jamaPaid: l.jamaPaid,
    remaining: l.outstanding,
    remainingPrincipal: l.remainingPrincipal,
    remainingInterest: l.remainingInterest,
    outstanding: l.outstanding,
    lastPaymentDate: l.lastPaymentDate,
    nextInterestDate: l.nextInterestDate,
    periods: l.periods,
    isCombination: false,
  };
}
