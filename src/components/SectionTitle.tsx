import React from 'react';

interface SectionTitleProps {
  title: string;
  description?: string;
  search?: boolean;
  inputPlaceholder: string;
  value: string;
  onSearch: (value: string) => void;
  onBackClick?: () => void;
}

const SectionTitle: React.FC<SectionTitleProps> = ({
  title,
  description,
  search = false,
  inputPlaceholder,
  value,
  onSearch,
  onBackClick,
}) => {
  return (
    <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
      <div >
        <div className="flex items-center gap-3">
        {onBackClick && (
          <button onClick={onBackClick} className="text-gray-400 bg-gray-100 p-2 rounded-full hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
        )}
        <h1 className="text-[25px] font-bold text-slate-800 m-0">{title}</h1>
        </div>
        {description && (
          <p className="text-[15px] text-gray-600 mt-2 m-0">{description}</p>
        )}
      </div>
      {search && (
        <div className="flex-1 min-w-[250px] max-w-md relative">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
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
          <input
            type="text"
            placeholder={inputPlaceholder}
            value={value}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg text-sm bg-white shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 placeholder:text-gray-400"
          />
          {value && (
            <button
              onClick={() => onSearch('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Clear search"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SectionTitle;

