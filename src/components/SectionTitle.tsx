import React from 'react';

interface SectionTitleProps {
  title: string;
  description?: string;
  search?: boolean;
  inputPlaceholder: string;
  value: string;
  onSearch?: (value: string) => void;
  onSearchClick?: () => void;
  onBackClick?: () => void;
  onClear?: () => void;
}

const SectionTitle: React.FC<SectionTitleProps> = ({
  title,
  description,
  search = false,
  inputPlaceholder,
  value,
  onSearch,
  onSearchClick,
  onBackClick,
  onClear,
}) => {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-3">
          {onBackClick && (
            <button
              onClick={onBackClick}
              className="rounded-full bg-gray-100 p-2 text-gray-400 transition-colors hover:text-gray-600"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
          )}
          <h1 className="m-0 text-[25px] font-bold text-slate-800">{title}</h1>
        </div>
        {description && <p className="m-0 mt-2 text-[15px] text-gray-600">{description}</p>}
      </div>
      {search && (
        <div className="min-w-[250px] max-w-xl flex-1">
          <div className="relative flex items-center">
            <span className="absolute left-4 text-gray-400">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </span>
            <input
              type="text"
              placeholder={inputPlaceholder}
              value={value}
              onChange={e => onSearch?.(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-12 pr-32 text-sm text-gray-700 shadow-inner outline-none transition-all placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200"
            />
            {value && (
              <button
                type="button"
                onClick={onClear}
                aria-label="Clear search"
                className="absolute right-24 text-gray-400 transition-colors hover:text-gray-600"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={onSearchClick}
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow transition-all hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Search
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SectionTitle;
