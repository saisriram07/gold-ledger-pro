import { useEffect, useMemo, useRef } from "react";

const ITEM_H = 40;
const VISIBLE = 5;
const PAD = ((VISIBLE - 1) / 2) * ITEM_H;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

interface ColumnProps {
  items: { value: number; label: string }[];
  value: number;
  onChange: (v: number) => void;
  ariaLabel: string;
}

function WheelColumn({ items, value, onChange, ariaLabel }: ColumnProps) {
  const ref = useRef<HTMLDivElement>(null);
  const settle = useRef<number | null>(null);

  // Keep the scroll position aligned with the selected value.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const idx = items.findIndex((i) => i.value === value);
    if (idx < 0) return;
    const target = idx * ITEM_H;
    if (Math.abs(el.scrollTop - target) > 1) el.scrollTop = target;
  }, [value, items]);

  const handleScroll = () => {
    const el = ref.current;
    if (!el) return;
    if (settle.current) window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      const idx = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / ITEM_H)));
      const next = items[idx];
      if (next && next.value !== value) onChange(next.value);
      // snap precisely to centre
      el.scrollTo({ top: idx * ITEM_H, behavior: "smooth" });
    }, 90);
  };

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label={ariaLabel}
      onScroll={handleScroll}
      className="relative flex-1 overflow-y-auto snap-y snap-mandatory no-scrollbar touch-pan-y overscroll-contain"
      style={{ height: VISIBLE * ITEM_H, scrollbarWidth: "none" }}
    >
      <div style={{ paddingTop: PAD, paddingBottom: PAD }}>
        {items.map((i) => {
          const selected = i.value === value;
          return (
            <div
              key={i.value}
              role="option"
              aria-selected={selected}
              onClick={() => onChange(i.value)}
              className={
                "flex snap-center cursor-pointer items-center justify-center text-sm transition-colors " +
                (selected ? "font-semibold text-foreground" : "text-muted-foreground/60")
              }
              style={{ height: ITEM_H }}
            >
              {i.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface Props {
  value?: Date;
  onChange: (d: Date) => void;
  fromYear?: number;
  toYear?: number;
  className?: string;
}

export function WheelDatePicker({ value, onChange, fromYear, toYear, className }: Props) {
  const current = value ?? new Date();
  const nowYear = new Date().getFullYear();
  const y0 = fromYear ?? nowYear - 50;
  const y1 = toYear ?? nowYear + 10;

  const year = current.getFullYear();
  const month = current.getMonth();
  const day = current.getDate();

  const dayItems = useMemo(
    () => Array.from({ length: daysInMonth(year, month) }, (_, i) => ({ value: i + 1, label: String(i + 1).padStart(2, "0") })),
    [year, month],
  );
  const monthItems = useMemo(() => MONTHS.map((m, i) => ({ value: i, label: m })), []);
  const yearItems = useMemo(
    () => Array.from({ length: y1 - y0 + 1 }, (_, i) => ({ value: y0 + i, label: String(y0 + i) })),
    [y0, y1],
  );

  const emit = (d: number, m: number, y: number) => {
    const clamped = Math.min(d, daysInMonth(y, m));
    onChange(new Date(y, m, clamped));
  };

  return (
    <div className={"relative w-full max-w-xs select-none rounded-lg border bg-background px-2 " + (className ?? "")}>
      {/* centre highlight between two horizontal lines */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-2 border-y border-primary/40 bg-primary/5"
        style={{ top: PAD, height: ITEM_H }}
      />
      <div className="flex gap-1">
        <WheelColumn items={dayItems} value={day} onChange={(v) => emit(v, month, year)} ariaLabel="Date" />
        <WheelColumn items={monthItems} value={month} onChange={(v) => emit(day, v, year)} ariaLabel="Month" />
        <WheelColumn items={yearItems} value={year} onChange={(v) => emit(day, month, v)} ariaLabel="Year" />
      </div>
    </div>
  );
}
