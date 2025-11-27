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
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 max-[560px]:mb-4 max-[560px]:gap-2">
      <div className="max-[560px]:flex-1 max-[560px]:min-w-0">
        <div className="flex items-center gap-3 max-[560px]:gap-2">
          {onBackClick && (
            <button
              className="rounded-full bg-gray-100 p-2 text-gray-400 transition-colors hover:text-gray-600 max-[560px]:p-1.5"
              onClick={onBackClick}
            >
              <svg
                className="h-5 w-5 max-[560px]:h-4 max-[560px]:w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
              </svg>
            </button>
          )}
          <h1 className="m-0 text-[25px] font-bold text-slate-800 max-[560px]:text-lg max-[560px]:truncate">{title}</h1>
        </div>
        {description && <p className="m-0 mt-2 text-[15px] text-gray-600 max-[560px]:mt-1 max-[560px]:text-xs max-[560px]:line-clamp-2">{description}</p>}
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
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </span>
            <input
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-12 pr-32 text-sm text-gray-700 shadow-inner outline-none transition-all placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200"
              placeholder={inputPlaceholder}
              type="text"
              value={value}
              onChange={e => onSearch?.(e.target.value)}
            />
            {value && (
              <button
                aria-label="Clear search"
                className="absolute right-24 text-gray-400 transition-colors hover:text-gray-600"
                type="button"
                onClick={onClear}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                </svg>
              </button>
            )}
            <button
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow transition-all hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              type="button"
              onClick={onSearchClick}
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
