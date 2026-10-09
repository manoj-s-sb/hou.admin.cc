/* eslint-disable @typescript-eslint/no-explicit-any -- generic table boundary: row shapes are intentionally dynamic */
import { useState, useMemo, CSSProperties } from 'react';

import { LoaderSpinner } from '../Loader';

import { TableColumn, TableProps, SortDirection } from './types';

function getPageNumbers(currentPage: number, totalPages: number): (number | '...')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i);
  }
  const pages: (number | '...')[] = [];
  if (currentPage <= 3) {
    pages.push(0, 1, 2, 3, '...', totalPages - 2, totalPages - 1);
  } else if (currentPage >= totalPages - 4) {
    pages.push(0, 1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1);
  } else {
    pages.push(0, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages - 1);
  }
  return pages;
}

function DataTable<T = any>({
  columns,
  data,
  loading = false,
  emptyState,
  onRowClick,
  selectedRowId,
  getRowId = (row: T) => (row as any).id,
  sortable = true,
  defaultSortField,
  defaultSortDirection = 'asc',
  onSortChange,
  pagination = true,
  page: externalPage,
  rowsPerPage: externalRowsPerPage = 10,
  totalRows: externalTotalRows,
  onPageChange,
  onRowsPerPageChange,
  serverSide = false,
  stickyHeader = false,
  maxHeight,
  size = 'medium',
  rowClassName,
  hideHeader = false,
}: TableProps<T>) {
  const [internalPage, setInternalPage] = useState(0);
  const [internalRowsPerPage, setInternalRowsPerPage] = useState(externalRowsPerPage ?? 10);
  const [sortField, setSortField] = useState<string>(defaultSortField || columns[0]?.id || '');
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSortDirection);

  const page = externalPage !== undefined ? externalPage : internalPage;
  const rowsPerPage = externalRowsPerPage !== undefined ? externalRowsPerPage : internalRowsPerPage;
  const totalRows = serverSide && externalTotalRows !== undefined ? externalTotalRows : data.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);

  const handleSort = (field: string, columnSortable?: boolean) => {
    if (!sortable || columnSortable === false) return;
    const isAsc = sortField === field && sortDirection === 'asc';
    const newDirection: SortDirection = isAsc ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDirection);
    if (onSortChange) onSortChange(field, newDirection);
  };

  const sortedData = useMemo(() => {
    if (serverSide && !onSortChange) return data;
    if (!sortField) return data;
    return [...data].sort((a, b) => {
      const column = columns.find(col => col.id === sortField);
      if (!column) return 0;
      const aValue = column.sortValue ? column.sortValue(a) : (a as any)[sortField];
      const bValue = column.sortValue ? column.sortValue(b) : (b as any)[sortField];
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortField, sortDirection, columns, serverSide, onSortChange]);

  const paginatedData = useMemo(() => {
    if (!pagination || serverSide) return sortedData;
    return sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [sortedData, page, rowsPerPage, pagination, serverSide]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 0 || newPage >= totalPages) return;
    if (onPageChange) {
      onPageChange(newPage);
    } else {
      setInternalPage(newPage);
    }
  };

  const getCellValue = (row: T, column: TableColumn<T>, index: number) => {
    const value = (row as any)[column.id];
    if (column.renderCell) return column.renderCell(value, row, index);
    if (column.format) return column.format(value, row);
    return value ?? '';
  };

  // Cell padding mirrors the previous MUI `size` prop (small = denser).
  const cellPadding = size === 'small' ? '8px 12px' : '14px 16px';

  const headCellStyle = (column: TableColumn<T>): CSSProperties => ({
    textAlign: column.align || 'left',
    backgroundColor: '#ffffff',
    color: '#111827',
    fontWeight: 600,
    fontSize: '0.8125rem',
    padding: cellPadding,
    whiteSpace: 'nowrap',
    borderBottom: '1px solid #e5e7eb',
    minWidth: column.minWidth,
    width: column.width,
    ...(stickyHeader ? { position: 'sticky', top: 0, zIndex: 1 } : {}),
  });

  const bodyCellStyle = (column: TableColumn<T>, isSelected: boolean): CSSProperties => ({
    textAlign: column.align || 'left',
    fontSize: '0.875rem',
    padding: cellPadding,
    color: '#374151',
    borderBottom: '1px solid #f3f4f6',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    ...(isSelected ? { backgroundColor: '#f0f4ff' } : {}),
  });

  const renderEmptyState = () => (
    <tr>
      <td colSpan={columns.length} style={{ textAlign: 'center', padding: '64px 16px', border: 'none' }}>
        <div className="flex flex-col items-center gap-2">
          {emptyState?.icon || (
            <svg
              className="h-16 w-16 text-gray-300"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )}
          <p className="text-sm text-gray-500">{emptyState?.title || 'No data available'}</p>
          {emptyState?.subtitle && <p className="text-xs text-gray-500">{emptyState.subtitle}</p>}
        </div>
      </td>
    </tr>
  );

  const renderLoadingState = () => (
    <tr>
      <td colSpan={columns.length} style={{ textAlign: 'center', padding: '64px 16px', border: 'none' }}>
        <div className="flex flex-col items-center gap-2">
          <LoaderSpinner className="text-blue-600" size="lg" />
          <p className="text-xs text-gray-500">Loading...</p>
        </div>
      </td>
    </tr>
  );

  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="overflow-x-auto" style={{ maxHeight: maxHeight || undefined }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          {!hideHeader && (
            <thead>
              <tr>
                {columns.map(column => (
                  <th key={column.id} style={headCellStyle(column)}>
                    {column.sortable !== false && sortable ? (
                      <button
                        className="inline-flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-[0.8125rem] font-semibold text-[#111827]"
                        type="button"
                        onClick={() => handleSort(column.id, column.sortable)}
                      >
                        {column.label}
                        {sortField === column.id && (
                          <span aria-hidden="true">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </button>
                    ) : (
                      <span>{column.label}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {loading
              ? renderLoadingState()
              : paginatedData.length === 0
                ? renderEmptyState()
                : paginatedData.map((row, index) => {
                    const rowId = getRowId(row);
                    const isSelected = selectedRowId !== undefined && selectedRowId === rowId;
                    const extraClass = rowClassName ? rowClassName(row, index) : '';
                    return (
                      <tr
                        key={rowId}
                        className={`${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''} ${extraClass}`}
                        style={isSelected ? { backgroundColor: '#f0f4ff' } : { backgroundColor: '#ffffff' }}
                        onClick={() => onRowClick?.(row, index)}
                      >
                        {columns.map(column => (
                          <td key={column.id} style={bodyCellStyle(column, isSelected)}>
                            {getCellValue(row, column, index)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
          </tbody>
        </table>
      </div>

      {pagination && totalPages > 0 && (
        <div className="flex items-center justify-between border-t border-gray-100 bg-white px-4 py-3">
          {/* Rows per page */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Rows per page:</span>
            <select
              className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:border-indigo-400 focus:outline-none"
              value={rowsPerPage}
              onChange={e => {
                const val = parseInt(e.target.value, 10);
                if (onRowsPerPageChange) {
                  onRowsPerPageChange(val);
                } else {
                  setInternalRowsPerPage(val);
                  setInternalPage(0);
                }
              }}
            >
              {[10, 20, 30, 50, 100].map(opt => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <span className="text-xs text-gray-400">
              {page * rowsPerPage + 1}–{Math.min((page + 1) * rowsPerPage, totalRows)} of {totalRows}
            </span>
          </div>

          {/* Pagination buttons */}
          <div className="flex items-center gap-1">
            <button
              className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={page === 0}
              type="button"
              onClick={() => handlePageChange(page - 1)}
            >
              ← Previous
            </button>

            <div className="flex items-center gap-1 px-1">
              {pageNumbers.map((p, i) =>
                p === '...' ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-xs text-gray-400">
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                      p === page ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    type="button"
                    onClick={() => handlePageChange(p as number)}
                  >
                    {(p as number) + 1}
                  </button>
                )
              )}
            </div>

            <button
              className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={page >= totalPages - 1}
              type="button"
              onClick={() => handlePageChange(page + 1)}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
