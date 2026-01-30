import React, { useState, useMemo } from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  CircularProgress,
  Box,
  Typography,
  TablePagination,
  SxProps,
  Theme,
} from '@mui/material';

import { TableColumn, TableProps, SortDirection } from './types';

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
  rowsPerPage: externalRowsPerPage = 20,
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
  const [internalRowsPerPage, setInternalRowsPerPage] = useState(externalRowsPerPage ?? 20);
  const [sortField, setSortField] = useState<string>(defaultSortField || columns[0]?.id || '');
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultSortDirection);

  // Use external or internal state for pagination
  const page = externalPage !== undefined ? externalPage : internalPage;
  const rowsPerPage = externalRowsPerPage !== undefined ? externalRowsPerPage : internalRowsPerPage;
  const totalRows = serverSide && externalTotalRows !== undefined ? externalTotalRows : data.length;

  const handleSort = (field: string, columnSortable?: boolean) => {
    // Check if sorting is disabled at table level or column level
    if (!sortable || columnSortable === false) return;

    const isAsc = sortField === field && sortDirection === 'asc';
    const newDirection: SortDirection = isAsc ? 'desc' : 'asc';

    setSortField(field);
    setSortDirection(newDirection);

    if (onSortChange) {
      onSortChange(field, newDirection);
    }
  };

  const sortedData = useMemo(() => {
    // If serverSide is true and no onSortChange handler, skip client-side sorting (server handles it)
    if (serverSide && !onSortChange) {
      return data;
    }
    // If no sort field selected, return data as-is
    if (!sortField) {
      return data;
    }

    return [...data].sort((a, b) => {
      const column = columns.find(col => col.id === sortField);
      if (!column) return 0;

      // Use custom sortValue function if provided, otherwise fall back to direct property access
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
    if (!pagination || serverSide) {
      return sortedData;
    }
    return sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [sortedData, page, rowsPerPage, pagination, serverSide]);

  const handleChangePage = (_event: unknown, newPage: number) => {
    if (onPageChange) {
      onPageChange(newPage);
    } else {
      setInternalPage(newPage);
    }
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    if (onRowsPerPageChange) {
      onRowsPerPageChange(newRowsPerPage);
    } else {
      setInternalRowsPerPage(newRowsPerPage);
    }
    if (onPageChange) {
      onPageChange(0);
    } else {
      setInternalPage(0);
    }
  };

  const getCellValue = (row: T, column: TableColumn<T>, index: number) => {
    const value = (row as any)[column.id];
    if (column.renderCell) {
      return column.renderCell(value, row, index);
    }
    if (column.format) {
      return column.format(value, row);
    }
    return value ?? '';
  };

  const tableContainerSx: SxProps<Theme> = {
    maxHeight: maxHeight || 'auto',
    overflowX: 'auto',
    '&::-webkit-scrollbar': {
      height: '8px',
    },
    '&::-webkit-scrollbar-track': {
      backgroundColor: 'rgba(0,0,0,0.05)',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: 'rgba(0,0,0,0.2)',
      borderRadius: '4px',
    },
  };

  const renderEmptyState = () => (
    <TableRow>
      <TableCell align="center" colSpan={columns.length} sx={{ py: 8 }}>
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
      <TableCell align="center" colSpan={columns.length} sx={{ py: 8 }}>
        <Box alignItems="center" display="flex" flexDirection="column" gap={2}>
          <CircularProgress />
          <Typography color="text.secondary" variant="body2">
            Loading...
          </Typography>
        </Box>
      </TableCell>
    </TableRow>
  );

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <TableContainer sx={tableContainerSx}>
        <Table size={size} stickyHeader={stickyHeader}>
          {!hideHeader && (
            <TableHead>
              <TableRow>
                {columns.map(column => (
                  <TableCell
                    key={column.id}
                    align={column.align || 'left'}
                    style={{
                      minWidth: column.minWidth,
                      width: column.width,
                    }}
                    sx={{
                      backgroundColor: 'grey.50',
                      fontWeight: 600,
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      padding: { xs: '8px 4px', sm: '16px' },
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {column.sortable !== false && sortable ? (
                      <TableSortLabel
                        active={sortField === column.id}
                        direction={sortField === column.id ? sortDirection : 'asc'}
                        sx={{
                          fontSize: { xs: '0.75rem', sm: '0.875rem' },
                          '& .MuiTableSortLabel-icon': {
                            fontSize: { xs: '1rem', sm: '1.25rem' },
                          },
                        }}
                        onClick={() => handleSort(column.id, column.sortable)}
                      >
                        {column.label}
                      </TableSortLabel>
                    ) : (
                      <span style={{ fontSize: 'inherit' }}>{column.label}</span>
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
                        hover
                        className={className}
                        selected={isSelected}
                        sx={{
                          cursor: onRowClick ? 'pointer' : 'default',
                          '&:hover': {
                            backgroundColor: onRowClick ? 'action.hover' : 'transparent',
                          },
                          ...(isSelected && {
                            backgroundColor: 'action.selected',
                          }),
                        }}
                        onClick={() => onRowClick?.(row, index)}
                      >
                        {columns.map(column => (
                          <TableCell
                            key={column.id}
                            align={column.align || 'left'}
                            sx={{
                              fontSize: { xs: '0.75rem', sm: '0.875rem' },
                              padding: { xs: '8px 4px', sm: '16px' },
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              ...(isSelected && {
                                backgroundColor: 'action.selected',
                              }),
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
      {pagination && (
        <TablePagination
          component="div"
          count={totalRows}
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`}
          labelRowsPerPage="Rows per page:"
          page={page}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[20, 30, 50, 100]}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      )}
    </Paper>
  );
}

export default DataTable;
