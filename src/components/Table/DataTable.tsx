import { useState, useMemo } from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  Box,
  Typography,
} from '@mui/material';

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

  const tableContainerSx = {
    maxHeight: maxHeight || 'auto',
    overflowX: 'auto',
    '&::-webkit-scrollbar': { height: '6px' },
    '&::-webkit-scrollbar-track': { backgroundColor: 'rgba(0,0,0,0.03)' },
    '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: '4px' },
  };

  const renderEmptyState = () => (
    <TableRow>
      <TableCell align="center" colSpan={columns.length} sx={{ py: 8, border: 'none' }}>
        <Box alignItems="center" display="flex" flexDirection="column" gap={2}>
          {emptyState?.icon || (
            <Box
              component="svg"
              fill="none"
              stroke="currentColor"
              sx={{ width: 64, height: 64, color: 'grey.300' }}
              viewBox="0 0 24 24"
            >
              <path
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
              />
            </Box>
          )}
          <Typography color="text.secondary" variant="body1">
            {emptyState?.title || 'No data available'}
          </Typography>
          {emptyState?.subtitle && (
            <Typography color="text.secondary" variant="body2">
              {emptyState.subtitle}
            </Typography>
          )}
        </Box>
      </TableCell>
    </TableRow>
  );

  const renderLoadingState = () => (
    <TableRow>
      <TableCell align="center" colSpan={columns.length} sx={{ py: 8, border: 'none' }}>
        <Box alignItems="center" display="flex" flexDirection="column" gap={2}>
          <LoaderSpinner className="text-blue-600" size="lg" />
          <Typography color="text.secondary" variant="body2">
            Loading...
          </Typography>
        </Box>
      </TableCell>
    </TableRow>
  );

  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <Paper
      elevation={0}
      sx={{
        width: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
      }}
    >
      <TableContainer sx={tableContainerSx}>
        <Table size={size} stickyHeader={stickyHeader}>
          {!hideHeader && (
            <TableHead>
              <TableRow>
                {columns.map(column => (
                  <TableCell
                    key={column.id}
                    align={column.align || 'left'}
                    style={{ minWidth: column.minWidth, width: column.width }}
                    sx={{
                      backgroundColor: '#ffffff',
                      color: '#111827',
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      padding: '14px 16px',
                      whiteSpace: 'nowrap',
                      borderBottom: '1px solid #e5e7eb',
                      '&:first-of-type': { borderTopLeftRadius: '12px' },
                      '&:last-of-type': { borderTopRightRadius: '12px' },
                    }}
                  >
                    {column.sortable !== false && sortable ? (
                      <TableSortLabel
                        active={sortField === column.id}
                        direction={sortField === column.id ? sortDirection : 'asc'}
                        sx={{
                          color: '#111827 !important',
                          fontSize: '0.8125rem',
                          '&.Mui-active': { color: '#111827 !important' },
                          '& .MuiTableSortLabel-icon': { color: '#111827 !important' },
                        }}
                        onClick={() => handleSort(column.id, column.sortable)}
                      >
                        {column.label}
                      </TableSortLabel>
                    ) : (
                      <span>{column.label}</span>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
          )}
          <TableBody>
            {loading
              ? renderLoadingState()
              : paginatedData.length === 0
                ? renderEmptyState()
                : paginatedData.map((row, index) => {
                    const rowId = getRowId(row);
                    const isSelected = selectedRowId !== undefined && selectedRowId === rowId;
                    const className = rowClassName ? rowClassName(row, index) : '';
                    return (
                      <TableRow
                        key={rowId}
                        className={className}
                        selected={isSelected}
                        sx={{
                          cursor: onRowClick ? 'pointer' : 'default',
                          backgroundColor: '#ffffff',
                          '&:hover': {
                            backgroundColor: onRowClick ? '#f9fafb' : '#ffffff',
                          },
                          '&:last-child td': { borderBottom: 'none' },
                          ...(isSelected && { backgroundColor: '#f0f4ff' }),
                        }}
                        onClick={() => onRowClick?.(row, index)}
                      >
                        {columns.map(column => (
                          <TableCell
                            key={column.id}
                            align={column.align || 'left'}
                            sx={{
                              fontSize: '0.875rem',
                              padding: '14px 16px',
                              color: '#374151',
                              borderBottom: '1px solid #f3f4f6',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              ...(isSelected && { backgroundColor: '#f0f4ff' }),
                            }}
                          >
                            {getCellValue(row, column, index)}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
          </TableBody>
        </Table>
      </TableContainer>

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
              onClick={() => handlePageChange(page + 1)}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </Paper>
  );
}

export default DataTable;
