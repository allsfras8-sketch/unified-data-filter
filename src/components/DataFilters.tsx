import { useMemo, useState } from "react";
import { addDays, format, startOfYear, subDays, subYears } from "date-fns";
import type { DateRange } from "react-day-picker";
import { CalendarIcon, Check, Filter, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/* ------------------------------------------------------------------ types */

export type FacetOption = { value: string; label: string };
export type FacetConfig = { key: string; label: string; options: FacetOption[] };

export type DatePreset = "all" | "last30" | "last90" | "fiscal" | "lastYear" | "custom";

export type FilterState = {
  q: string;
  preset: DatePreset;
  from: string | null;
  to: string | null;
  facets: Record<string, string[]>;
};

export const emptyFilters: FilterState = { q: "", preset: "all", from: null, to: null, facets: {} };

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: "all", label: "كل الفترات" },
  { value: "last30", label: "آخر 30 يوماً" },
  { value: "last90", label: "آخر 90 يوماً" },
  { value: "fiscal", label: "السنة المالية الحالية" },
  { value: "lastYear", label: "السنة الماضية" },
  { value: "custom", label: "فترة مخصصة" },
];

const iso = (d: Date) => format(d, "yyyy-MM-dd");

/** Resolve the active filter state into concrete from/to dates (inclusive). */
export function resolveRange(f: FilterState): { from: string | null; to: string | null } {
  const now = new Date();
  switch (f.preset) {
    case "last30":
      return { from: iso(subDays(now, 30)), to: iso(now) };
    case "last90":
      return { from: iso(subDays(now, 90)), to: iso(now) };
    case "fiscal":
      return { from: iso(startOfYear(now)), to: iso(now) };
    case "lastYear": {
      const ly = subYears(now, 1);
      return { from: iso(startOfYear(ly)), to: iso(addDays(startOfYear(now), -1)) };
    }
    case "custom":
      return { from: f.from, to: f.to };
    default:
      return { from: null, to: null };
  }
}

export function useDataFilters(initial?: Partial<FilterState>) {
  return useState<FilterState>({ ...emptyFilters, ...initial });
}

/** Number of active filter criteria (used for the "clear" badge). */
export function activeFilterCount(f: FilterState) {
  let n = 0;
  if (f.q.trim()) n += 1;
  if (f.preset !== "all") n += 1;
  n += Object.values(f.facets).filter((v) => v.length > 0).length;
  return n;
}

/* ------------------------------------------------------- client-side apply */

type ApplyOptions<T> = {
  /** Row property holding the date used by the date-range engine. */
  dateKey?: string | undefined;
  /** Extra searchable text (e.g. resolved reference names). */
  searchText?: ((row: T) => string) | undefined;
};

export function applyFilters<T extends Record<string, unknown>>(
  rows: T[],
  filters: FilterState,
  opts: ApplyOptions<T> = {},
) {
  const { from, to } = resolveRange(filters);
  const q = filters.q.trim().toLowerCase();

  return rows.filter((row) => {
    // Universal search: every text/numeric property plus provided extra text.
    if (q) {
      const base = Object.values(row)
        .filter((v) => typeof v === "string" || typeof v === "number")
        .join(" ");
      const extra = opts.searchText?.(row) ?? "";
      if (!`${base} ${extra}`.toLowerCase().includes(q)) return false;
    }

    // Date range.
    if (opts.dateKey && (from || to)) {
      const raw = row[opts.dateKey];
      if (!raw) return false;
      const day = String(raw).slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
    }

    // Faceted multi-select.
    for (const [key, selected] of Object.entries(filters.facets)) {
      if (!selected.length) continue;
      if (!selected.includes(String(row[key] ?? ""))) return false;
    }
    return true;
  });
}

/* --------------------------------------------------------------- component */

type Props = {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  facets?: FacetConfig[];
  /** Hide the date engine on views without a meaningful date column. */
  showDate?: boolean;
  searchPlaceholder?: string;
};

export function DataFilters({ filters, onChange, facets = [], showDate = true, searchPlaceholder }: Props) {
  const range = resolveRange(filters);
  const count = activeFilterCount(filters);

  const dateLabel = useMemo(() => {
    if (filters.preset === "custom") {
      if (range.from && range.to) return `${range.from} ← ${range.to}`;
      if (range.from) return `من ${range.from}`;
      return "فترة مخصصة";
    }
    return PRESETS.find((p) => p.value === filters.preset)?.label ?? "كل الفترات";
  }, [filters.preset, range.from, range.to]);

  const selectedRange: DateRange | undefined = range.from
    ? { from: new Date(range.from), to: range.to ? new Date(range.to) : undefined }
    : undefined;

  return (
    <div className="no-print mb-4 flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
      <div className="relative min-w-56 flex-1">
        <Search className="pointer-events-none absolute top-1/2 start-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="ps-8"
          placeholder={searchPlaceholder ?? "بحث في كل الحقول..."}
          value={filters.q}
          onChange={(e) => onChange({ ...filters, q: e.target.value })}
        />
      </div>

      {showDate && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn(filters.preset !== "all" && "border-primary text-primary")}>
              <CalendarIcon className="size-4" />
              {dateLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="flex flex-col border-b p-1">
              {PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() =>
                    onChange({
                      ...filters,
                      preset: p.value,
                      from: p.value === "custom" ? filters.from : null,
                      to: p.value === "custom" ? filters.to : null,
                    })
                  }
                  className={cn(
                    "flex items-center justify-between rounded-md px-2 py-1.5 text-start text-sm hover:bg-accent",
                    filters.preset === p.value && "bg-accent font-semibold",
                  )}
                >
                  {p.label}
                  {filters.preset === p.value && <Check className="size-4" />}
                </button>
              ))}
            </div>
            {filters.preset === "custom" && (
              <Calendar
                mode="range"
                numberOfMonths={2}
                selected={selectedRange}
                onSelect={(r) =>
                  onChange({
                    ...filters,
                    preset: "custom",
                    from: r?.from ? iso(r.from) : null,
                    to: r?.to ? iso(r.to) : null,
                  })
                }
                className={cn("p-3 pointer-events-auto")}
              />
            )}
          </PopoverContent>
        </Popover>
      )}

      {facets.map((facet) => {
        const selected = filters.facets[facet.key] ?? [];
        return (
          <Popover key={facet.key}>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn(selected.length > 0 && "border-primary text-primary")}>
                <Filter className="size-4" />
                {facet.label}
                {selected.length > 0 && (
                  <Badge variant="secondary" className="ms-1">
                    {selected.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="max-h-72 w-60 overflow-y-auto p-1" align="start">
              {facet.options.length === 0 && (
                <p className="px-2 py-3 text-center text-sm text-muted-foreground">لا توجد خيارات</p>
              )}
              {facet.options.map((o) => {
                const on = selected.includes(o.value);
                return (
                  <button
                    key={o.value}
                    onClick={() => {
                      const next = on ? selected.filter((v) => v !== o.value) : [...selected, o.value];
                      onChange({ ...filters, facets: { ...filters.facets, [facet.key]: next } });
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-start text-sm hover:bg-accent"
                  >
                    <span className="truncate">{o.label}</span>
                    {on && <Check className="size-4 shrink-0 text-primary" />}
                  </button>
                );
              })}
              {selected.length > 0 && (
                <button
                  onClick={() => onChange({ ...filters, facets: { ...filters.facets, [facet.key]: [] } })}
                  className="mt-1 w-full rounded-md border-t px-2 py-1.5 text-center text-xs text-muted-foreground hover:bg-accent"
                >
                  إلغاء التحديد
                </button>
              )}
            </PopoverContent>
          </Popover>
        );
      })}

      {count > 0 && (
        <Button variant="ghost" onClick={() => onChange(emptyFilters)}>
          <X className="size-4" />
          مسح الفلاتر ({count})
        </Button>
      )}
    </div>
  );
}
