import FilterBar, { FilterBarField } from '../../../components/FilterBar';
import { DEFAULT_FILTERS, TailgateFilters } from '../constants';

interface LogFiltersProps {
  /** The fields as currently typed/selected — not yet committed to a fetch
   * (see `onApply`). Member/Name is the exception: the parent debounces it
   * straight into the applied filters itself, same as every other page's
   * live search, so typing there never needs a separate Apply click. */
  filters: TailgateFilters;
  activeFilterCount: number;
  onFilterChange: (updater: (f: TailgateFilters) => TailgateFilters) => void;
  onApply: () => void;
  onReset: () => void;
}

const LogFilters = ({ filters, activeFilterCount, onFilterChange, onApply, onReset }: LogFiltersProps) => (
  <FilterBar
    fields={
      [
        {
          kind: 'search',
          key: 'tg-name',
          label: 'Member / Name',
          placeholder: 'Search…',
          value: filters.name,
          onChange: v => onFilterChange(f => ({ ...f, name: v })),
        },
        {
          kind: 'date',
          key: 'tg-from',
          label: 'From Date',
          max: filters.to || undefined,
          value: filters.from,
          onChange: v => onFilterChange(f => ({ ...f, from: v, to: f.to && f.to < v ? v : f.to })),
        },
        {
          kind: 'date',
          key: 'tg-to',
          label: 'To Date',
          min: filters.from || undefined,
          value: filters.to,
          onChange: v => onFilterChange(f => ({ ...f, to: v })),
        },
        {
          kind: 'select',
          key: 'tg-type',
          label: 'Event Type',
          value: filters.type,
          onChange: v => onFilterChange(f => ({ ...f, type: v })),
          options: [
            { value: '', label: 'All' },
            { value: 'Entry', label: 'Entry' },
            { value: 'Exit', label: 'Exit' },
            { value: 'Tailgate', label: 'Tailgate' },
          ],
        },
        {
          kind: 'select',
          key: 'tg-status',
          label: 'Review Status',
          value: filters.status,
          onChange: v => onFilterChange(f => ({ ...f, status: v })),
          options: [
            { value: '', label: 'All' },
            { value: 'pending', label: 'Pending Review' },
            { value: 'reviewed', label: 'Cleared (No Violation)' },
            { value: 'violation', label: 'Flagged as Violation' },
          ],
        },
        {
          kind: 'select',
          key: 'tg-door',
          label: 'Lane Door',
          value: filters.door,
          onChange: v => onFilterChange(f => ({ ...f, door: v })),
          options: [
            { value: '', label: 'All' },
            { value: 'Door Lane', label: 'Door Lane' },
          ],
        },
      ] as FilterBarField[]
    }
    onApply={onApply}
    onReset={onReset}
  >
    {activeFilterCount > 0 && (
      <div className="mb-3 flex items-center gap-2">
        <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
          />
        </svg>
        <span className="text-[12px] font-semibold text-gray-500">Filters</span>
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#21295A] px-1.5 text-[10px] font-bold text-white">
          {activeFilterCount}
        </span>
      </div>
    )}
  </FilterBar>
);

export { DEFAULT_FILTERS };
export default LogFilters;
