import React from 'react';

export type FilterBarSelectOption = { value: string; label: string };

export type FilterBarField =
  | {
      kind: 'search';
      key: string;
      label?: string;
      placeholder?: string;
      value: string;
      onChange: (value: string) => void;
    }
  | {
      kind: 'select';
      key: string;
      label: string;
      value: string;
      onChange: (value: string) => void;
      options: FilterBarSelectOption[];
    }
  | {
      kind: 'date';
      key: string;
      label: string;
      value: string;
      onChange: (value: string) => void;
      min?: string;
      max?: string;
    };

interface FilterBarProps {
  fields: FilterBarField[];
  onReset: () => void;
  /** Omitted only for a page whose filtering is fully client-side (no network
   * round-trip to gate, e.g. Waitlist/Leads) — every filter there is already
   * live, so there's nothing for an Apply click to commit. */
  onApply?: () => void;
  isLoading?: boolean;
  applyLabel?: string;
  resetLabel?: string;
  /** Extra content rendered above the field grid (e.g. Tickets' quick-filter
   * summary chips) — kept outside this bar's own grid/Apply/Reset contract. */
  children?: React.ReactNode;
}

const fieldClass =
  'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white focus:ring-2 focus:ring-[#21295A]/10';
const labelClass = 'mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400';

// Tailwind's class scanner needs every class spelled out literally somewhere
// in the source (it can't resolve a template-built `lg:grid-cols-${n}`), so
// the column count per field-count is a static lookup rather than computed.
const GRID_COLS: Record<number, string> = {
  1: '',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
  5: 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
  6: 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
};

const gridColsFor = (count: number): string => GRID_COLS[count] ?? GRID_COLS[4];

const SearchIcon: React.FC = () => (
  <svg
    className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    />
  </svg>
);

/**
 * One filter-bar layout shared by every list page: a labelled field grid
 * (search + selects/dates, wrapping onto one row at desktop width) with
 * Reset + Apply pinned to the bottom-right — the same card Members/Induction
 * already used, now reused everywhere instead of each page inventing its own
 * arrangement (inline dropdowns, pills, a Reset buried inside the card
 * header, etc).
 */
const FilterBar: React.FC<FilterBarProps> = ({
  fields,
  onReset,
  onApply,
  isLoading = false,
  applyLabel = 'Apply Filters',
  resetLabel = 'Reset',
  children,
}) => {
  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="px-4 py-4">
        {children}
        <div className={`grid grid-cols-1 gap-3 ${gridColsFor(fields.length)}`}>
          {fields.map(field => {
            if (field.kind === 'search') {
              return (
                <div key={field.key}>
                  {field.label && (
                    <label className={labelClass} htmlFor={field.key}>
                      {field.label}
                    </label>
                  )}
                  <div className="relative">
                    <SearchIcon />
                    <input
                      className={`${fieldClass} pl-8`}
                      id={field.key}
                      placeholder={field.placeholder}
                      type="text"
                      value={field.value}
                      onChange={e => field.onChange(e.target.value)}
                    />
                  </div>
                </div>
              );
            }
            if (field.kind === 'date') {
              return (
                <div key={field.key}>
                  <label className={labelClass} htmlFor={field.key}>
                    {field.label}
                  </label>
                  <input
                    className={fieldClass}
                    id={field.key}
                    max={field.max}
                    min={field.min}
                    type="date"
                    value={field.value}
                    onChange={e => field.onChange(e.target.value)}
                  />
                </div>
              );
            }
            return (
              <div key={field.key}>
                <label className={labelClass} htmlFor={field.key}>
                  {field.label}
                </label>
                <select
                  className={fieldClass}
                  id={field.key}
                  value={field.value}
                  onChange={e => field.onChange(e.target.value)}
                >
                  {field.options.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            className="rounded-lg border border-gray-200 px-4 py-2 text-[12px] font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
            disabled={isLoading}
            type="button"
            onClick={onReset}
          >
            {resetLabel}
          </button>
          {onApply && (
            <button
              className="rounded-lg bg-[#21295A] px-5 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#2d3570] disabled:opacity-50"
              disabled={isLoading}
              type="button"
              onClick={onApply}
            >
              {applyLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
