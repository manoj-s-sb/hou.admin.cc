import { DEFAULT_FILTERS, TailgateFilters } from '../constants';

interface LogFiltersProps {
  filters: TailgateFilters;
  activeFilterCount: number;
  onFilterChange: (updater: (f: TailgateFilters) => TailgateFilters) => void;
  onReset: () => void;
}

const inputCls =
  'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white focus:ring-2 focus:ring-[#21295A]/10';
const labelCls = 'mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400';

const LogFilters = ({ filters, activeFilterCount, onFilterChange, onReset }: LogFiltersProps) => (
  <div className="mb-4 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
    <div className="px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
            />
          </svg>
          <span className="text-[12px] font-semibold text-gray-500">Filters</span>
          {activeFilterCount > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#21295A] px-1.5 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </div>
        <button
          className="rounded-lg border border-gray-200 px-3 py-1 text-[11px] font-semibold text-gray-500 transition hover:bg-gray-50 hover:text-[#21295A]"
          type="button"
          onClick={onReset}
        >
          Reset
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div>
          <label className={labelCls} htmlFor="tg-from">
            From Date
          </label>
          <input
            className={inputCls}
            id="tg-from"
            max={filters.to || undefined}
            type="date"
            value={filters.from}
            onChange={e => {
              const from = e.target.value;
              onFilterChange(f => ({
                ...f,
                from,
                to: f.to && f.to < from ? from : f.to,
              }));
            }}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="tg-to">
            To Date
          </label>
          <input
            className={inputCls}
            id="tg-to"
            min={filters.from || undefined}
            type="date"
            value={filters.to}
            onChange={e => onFilterChange(f => ({ ...f, to: e.target.value }))}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="tg-name">
            Member / Name
          </label>
          <input
            className={inputCls}
            id="tg-name"
            placeholder="Search…"
            type="text"
            value={filters.name}
            onChange={e => onFilterChange(f => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="tg-type">
            Event Type
          </label>
          <select
            className={inputCls}
            id="tg-type"
            value={filters.type}
            onChange={e => onFilterChange(f => ({ ...f, type: e.target.value }))}
          >
            <option value="">All</option>
            <option value="Entry">Entry</option>
            <option value="Exit">Exit</option>
            <option value="Tailgate">Tailgate</option>
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="tg-status">
            Review Status
          </label>
          <select
            className={inputCls}
            id="tg-status"
            value={filters.status}
            onChange={e => onFilterChange(f => ({ ...f, status: e.target.value }))}
          >
            <option value="">All</option>
            <option value="pending">Pending Review</option>
            <option value="reviewed">Cleared (No Violation)</option>
            <option value="violation">Flagged as Violation</option>
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="tg-door">
            Lane Door
          </label>
          <select
            className={inputCls}
            id="tg-door"
            value={filters.door}
            onChange={e => onFilterChange(f => ({ ...f, door: e.target.value }))}
          >
            <option value="">All</option>
            <option value="Door Lane">Door Lane</option>
          </select>
        </div>
      </div>
    </div>
  </div>
);

export { DEFAULT_FILTERS };
export default LogFilters;
