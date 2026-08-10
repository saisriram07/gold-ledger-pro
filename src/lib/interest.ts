// ONE common interest-calculation engine used everywhere in the app
// (Total / Gold / Silver / Combination Records, Customer Profile, Dashboard,
// PDF export and Jama).
//
// Business method (owner's handwritten rules):
// - The selected rate is a MONTHLY rate (e.g. 2% => principal * 2% per month).
// - Duration is split into complete YEARS, remaining MONTHS and remaining DAYS
//   using real calendar arithmetic (never totalDays / 365).
// - Less than one complete year  -> SIMPLE interest:
//       base * rate * months + base * rate / 30 * days
// - One or more complete years  -> ANNUAL COMPOUND interest: each complete
//   12-month block earns base * rate * 12 and is added to the balance; the
//   REMAINING months and days then earn SIMPLE interest on that latest balance.
// - Never monthly compounding. Never (1 + r)^n.
// - Jama: interest accrues up to the payment date, the payment is subtracted
//   from the total payable, and the remaining balance becomes the new base for
//   future interest. Multiple Jama payments are supported and history is kept.

export interface JamaEntry {
  amount: number | string;
  paid_date?: string | null;
}

export type InterestMethod = "simple" | "compound";

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
  /** Outstanding balance right after the payment — base for future interest. */
  remainingBalance: number;
  /** Day after the payment date — when the next interest period begins. */
  nextInterestStart: string;
  method: InterestMethod;
}

export interface Ledger {
  principal: number;
  /** Interest accrued across all periods, including the still-open one. */
  totalInterest: number;
  jamaPaid: number;
  /** Base amount still outstanding (principal side) after all payments. */
  remainingPrincipal: number;
  /** Interest accrued in the current open period (not yet paid). */
  remainingInterest: number;
  /** remainingPrincipal + remainingInterest. */
  outstanding: number;
  periods: JamaPeriod[];
  lastPaymentDate: string | null;
  /** Date from which interest is currently being calculated. */
  nextInterestDate: string;
  /** Duration of the current open period. */
  years: number;
  months: number;
  days: number;
  /** Method applied to the current open period. */
  method: InterestMethod;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function toDate(iso: string): Date {
  const d = new Date(iso);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function todayISO(): string {
  return toISO(toDate(new Date().toISOString()));
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

function daysInMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** Real calendar duration: complete years, remaining months, remaining days. */
export function durationParts(startISO: string, endISO?: string) {
  const start = toDate(startISO);
  const end = endISO ? toDate(endISO) : toDate(new Date().toISOString());
  if (end.getTime() <= start.getTime()) return { years: 0, months: 0, days: 0, totalMonths: 0 };

  let years = end.getUTCFullYear() - start.getUTCFullYear();
  let months = end.getUTCMonth() - start.getUTCMonth();
  let days = end.getUTCDate() - start.getUTCDate();

  if (days < 0) {
    months -= 1;
    // Borrow the length of the month preceding the end date.
    const borrowMonth = end.getUTCMonth() - 1;
    const y = borrowMonth < 0 ? end.getUTCFullYear() - 1 : end.getUTCFullYear();
    const m = (borrowMonth + 12) % 12;
    days += daysInMonth(y, m);
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days, totalMonths: years * 12 + months };
}

function round(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export interface PeriodInterest {
  years: number;
  months: number;
  days: number;
  interest: number;
  /** Balance after applying the calculation (base + interest). */
  balance: number;
  method: InterestMethod;
}

/**
 * Core rule: complete years compound annually, remaining months/days are simple
 * interest on the latest balance. Under one year it is pure simple interest.
 */
export function computeInterest(
  base: number,
  monthlyRatePercent: number,
  startDate: string,
  endDate?: string,
): PeriodInterest {
  const amount = Number(base) || 0;
  const rate = (Number(monthlyRatePercent) || 0) / 100;
  const { years, months, days } = durationParts(startDate, endDate);

  if (amount <= 0 || rate <= 0 || (years === 0 && months === 0 && days === 0)) {
    return { years, months, days, interest: 0, balance: round(amount), method: years >= 1 ? "compound" : "simple" };
  }

  let balance = amount;
  // Each completed 12-month block: annual compound (12 monthly simple installments).
  for (let i = 0; i < years; i++) {
    balance = balance + balance * rate * 12;
  }
  // Remaining months + days: simple interest on the latest balance.
  const remainderInterest = balance * rate * months + (balance * rate * days) / 30;
  const total = balance + remainderInterest - amount;

  return {
    years,
    months,
    days,
    interest: round(total),
    balance: round(amount + total),
    method: years >= 1 ? "compound" : "simple",
  };
}

/** Backwards-compatible helper (kept for existing callers). */
export function calculateInterest(
  principal: number,
  ratePercent: number,
  startDate: string,
  endDate?: string,
): { months: number; days: number; interest: number } {
  const r = computeInterest(principal, ratePercent, startDate, endDate);
  return { months: r.years * 12 + r.months, days: r.days, interest: r.interest };
}

/**
 * Walks the Jama history chronologically. Each payment closes a period:
 * interest is calculated up to the payment date, the payment is deducted from
 * the total payable and the remainder becomes the base for the next period,
 * which starts the day after the payment.
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
  const asOf = endDate || todayISO();
  const start = startDate || asOf;

  const payments = jama
    .map((j) => ({ amount: Number(j.amount) || 0, paidDate: j.paid_date || start }))
    .filter((p) => p.amount > 0)
    .sort((a, b) => a.paidDate.localeCompare(b.paidDate));

  let base = safePrincipal;
  let totalInterest = 0;
  let jamaPaid = 0;
  let periodStart = start;
  const periods: JamaPeriod[] = [];

  for (const p of payments) {
    const effectiveEnd = p.paidDate < periodStart ? periodStart : p.paidDate;
    const r = computeInterest(base, rate, periodStart, effectiveEnd);
    totalInterest = round(totalInterest + r.interest);
    jamaPaid = round(jamaPaid + p.amount);

    // Total payable at the payment date, less the payment = new outstanding base.
    base = Math.max(0, round(base + r.interest - p.amount));
    periodStart = nextDayISO(effectiveEnd);

    periods.push({
      paidDate: p.paidDate,
      interestTillDate: r.interest,
      jamaAmount: round(p.amount),
      remainingBalance: base,
      nextInterestStart: periodStart,
      method: r.method,
    });
  }

  const open = periodStart > asOf
    ? { years: 0, months: 0, days: 0, interest: 0, balance: base, method: "simple" as InterestMethod }
    : computeInterest(base, rate, periodStart, asOf);
  totalInterest = round(totalInterest + open.interest);

  return {
    principal: safePrincipal,
    totalInterest,
    jamaPaid,
    remainingPrincipal: base,
    remainingInterest: open.interest,
    outstanding: round(base + open.interest),
    periods,
    lastPaymentDate: payments.length ? payments[payments.length - 1].paidDate : null,
    nextInterestDate: periodStart,
    years: open.years,
    months: open.months,
    days: open.days,
    method: open.method,
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
    months: l.years * 12 + l.months,
    days: l.days,
    interest: l.totalInterest,
    totalPayable: round(l.principal + l.totalInterest),
    jamaPaid: l.jamaPaid,
    remaining: l.outstanding,
  };
}

// Unified summary for a transaction row. Handles Gold + Silver Combination by
// calculating each metal separately on its own rate and combining the results.
export interface MetalSummary {
  amount: number;
  rate: number;
  interest: number;
  remainingPrincipal: number;
  outstanding: number;
  weight?: string | null;
  itemName?: string | null;
  method: InterestMethod;
}

export interface TransactionSummary {
  principal: number;
  rate: number | null;
  interest: number;
  totalPayable: number;
  jamaPaid: number;
  /** Latest outstanding balance. */
  remaining: number;
  remainingPrincipal: number;
  remainingInterest: number;
  outstanding: number;
  lastPaymentDate: string | null;
  nextInterestDate: string;
  periods: JamaPeriod[];
  isCombination: boolean;
  method: InterestMethod;
  methodLabel: string;
  gold?: MetalSummary;
  silver?: MetalSummary;
}

const label = (m: InterestMethod) => (m === "compound" ? "Compound" : "Simple");

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
    // Split each payment pro-rata so each metal keeps its own rate.
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
    const periods = gl.periods.map((p, i) => ({
      paidDate: p.paidDate,
      interestTillDate: round(p.interestTillDate + (sl.periods[i]?.interestTillDate ?? 0)),
      jamaAmount: round(p.jamaAmount + (sl.periods[i]?.jamaAmount ?? 0)),
      remainingBalance: round(p.remainingBalance + (sl.periods[i]?.remainingBalance ?? 0)),
      nextInterestStart: p.nextInterestStart,
      method: p.method,
    }));
    const method: InterestMethod = gl.method === "compound" || sl.method === "compound" ? "compound" : "simple";

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
      method,
      methodLabel: label(method),
      gold: {
        amount: goldAmount, rate: goldRate, interest: gl.totalInterest,
        remainingPrincipal: gl.remainingPrincipal, outstanding: gl.outstanding,
        weight: tx.gold_weight, itemName: tx.gold_item_name, method: gl.method,
      },
      silver: {
        amount: silverAmount, rate: silverRate, interest: sl.totalInterest,
        remainingPrincipal: sl.remainingPrincipal, outstanding: sl.outstanding,
        weight: tx.silver_weight, itemName: tx.silver_item_name, method: sl.method,
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
    method: l.method,
    methodLabel: label(l.method),
  };
}
