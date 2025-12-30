import React from 'react';

export type SortDirection = 'asc' | 'desc';

export interface TableColumn<T = any> {
  id: string;
  label: string;
  minWidth?: number;
  width?: number;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  format?: (value: any, row: T) => React.ReactNode;
  renderCell?: (value: any, row: T, index: number) => React.ReactNode;
  sortValue?: (row: T) => any; // Custom function to extract sortable value from row
}

export interface TableProps<T = any> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyState?: {
    icon?: React.ReactNode;
    title?: string;
    subtitle?: string;
  };
  // Row selection
  onRowClick?: (row: T, index: number) => void;
  selectedRowId?: string | number;
  getRowId?: (row: T) => string | number;
  // Sorting
  sortable?: boolean;
  defaultSortField?: string;
  defaultSortDirection?: SortDirection;
  onSortChange?: (field: string, direction: SortDirection) => void;
  // Pagination
  pagination?: boolean;
  page?: number;
  rowsPerPage?: number;
  totalRows?: number;
  onPageChange?: (page: number) => void;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
  // Server-side pagination
  serverSide?: boolean;
  // Styling
  stickyHeader?: boolean;
  maxHeight?: number | string;
  size?: 'small' | 'medium';
  // Additional props
  rowClassName?: (row: T, index: number) => string;
  hideHeader?: boolean;
}
