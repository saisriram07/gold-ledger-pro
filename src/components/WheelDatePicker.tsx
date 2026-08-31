import { useEffect, useMemo, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

interface ColumnProps {
  items: { value: number; label: string }[];
  value: number;
  onChange: (v: number) => void;
  ariaLabel: string;
  itemH: number;
  visible: number;
}

function WheelColumn({ items, value, onChange, ariaLabel, itemH, visible }: ColumnProps) {
  const ref = useRef<HTMLDivElement>(null);
  const settle = useRef<number | null>(null);
  const pad = ((visible - 1) / 2) * itemH;

  // Keep the scroll position aligned with the selected value.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const idx = items.findIndex((i) => i.value === value);
    if (idx < 0) return;
    const target = idx * itemH;
    if (Math.abs(el.scrollTop - target) > 1) el.scrollTop = target;
  }, [value, items, itemH]);

  useEffect(() => () => { if (settle.current) window.clearTimeout(settle.current); }, []);

  const handleScroll = () => {
    const el = ref.current;
    if (!el) return;
    if (settle.current) window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      const idx = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / itemH)));
      const next = items[idx];
      if (next && next.value !== value) onChange(next.value);
      el.scrollTo({ top: idx * itemH, behavior: "smooth" });
    }, 110);
  };

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label={ariaLabel}
      onScroll={handleScroll}
      className="no-scrollbar relative flex-1 min-w-0 snap-y snap-mandatory overflow-y-auto overscroll-contain touch-pan-y scroll-smooth"
      style={{ height: visible * itemH, scrollbarWidth: "none" }}
    >
      <div style={{ paddingTop: pad, paddingBottom: pad }}>
        {items.map((i) => {
          const selected = i.value === value;
          return (
            <button
              key={i.value}
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => onChange(i.value)}
              className={
                "flex w-full snap-center items-center justify-center whitespace-nowrap tabular-nums leading-none transition-all duration-150 " +
                (selected
                  ? "scale-105 font-semibold text-foreground"
                  : "text-muted-foreground/60 hover:text-muted-foreground")
              }
              style={{ height: itemH, fontSize: selected ? itemH * 0.42 : itemH * 0.36 }}
            >
              {i.label}
            </button>
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
  const isMobile = useIsMobile();
  const itemH = isMobile ? 44 : 40;
  const visible = 7;
  const pad = ((visible - 1) / 2) * itemH;

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
    <div
      className={
        "relative w-full min-w-[16rem] max-w-sm select-none overflow-hidden rounded-xl border bg-background px-1 py-1 shadow-sm sm:px-2 " +
        (className ?? "")
      }
    >
      {/* centre highlight between two horizontal lines */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-1 z-10 rounded-md border-y border-primary/40 bg-primary/5 sm:inset-x-2"
        style={{ top: pad + 4, height: itemH }}
      />
      {/* top / bottom fade so values never look clipped */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-background to-transparent"
        style={{ height: pad }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-background to-transparent"
        style={{ height: pad }}
      />
      <div className="grid grid-cols-3 gap-1 sm:gap-2">
        <WheelColumn items={dayItems} value={day} onChange={(v) => emit(v, month, year)} ariaLabel="Date" itemH={itemH} visible={visible} />
        <WheelColumn items={monthItems} value={month} onChange={(v) => emit(day, v, year)} ariaLabel="Month" itemH={itemH} visible={visible} />
        <WheelColumn items={yearItems} value={year} onChange={(v) => emit(day, month, v)} ariaLabel="Year" itemH={itemH} visible={visible} />
      </div>
    </div>
  );
}
