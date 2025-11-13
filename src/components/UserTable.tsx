import React, { useState, useMemo, useEffect } from "react";
import {
  safeDate,
  formatDate,
  INVALID_DATE_SORT_VALUE,
} from "../utils/dateUtils";

type SortDirection = "asc" | "desc";

export interface ColumnDef {
  field: string;
  headerName: string;
  width?: number;
  flex?: number;
  sortable?: boolean;
  renderCell?: (params: {
    value: any;
    row: any;
    index: number;
  }) => React.ReactNode;
  valueGetter?: (params: { value: any; row: any; index: number }) => any;
  type?: "string" | "number" | "date";
}

interface TableProps {
  data: any[];
  columns: ColumnDef[];
  selectedItem: any | null;
  onSelectItem: (user: any) => void;
  loading?: boolean;
  emptyState?: {
    icon?: React.ReactNode;
    title?: string;
    subtitle?: string;
  };
}

const UserTable: React.FC<TableProps> = ({
  data,
  columns,
  selectedItem,
  onSelectItem,
  loading = false,
  emptyState,
}) => {
  const [sortField, setSortField] = useState<string>(columns[0]?.field || "");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedUsers = useMemo(() => {
    // Ensure data is always an array
    const safeData = Array.isArray(data) ? data : [];
    if (!sortField) return safeData;

    return [...safeData].sort((a, b) => {
      const column = columns.find((col) => col.field === sortField);
      if (!column) return 0;

      let aValue: any = column.valueGetter
        ? column.valueGetter({ value: a[sortField], row: a, index: 0 })
        : a[sortField];
      let bValue: any = column.valueGetter
        ? column.valueGetter({ value: b[sortField], row: b, index: 0 })
        : b[sortField];

      // Handle different types
      if (column.type === "date") {
        const aDate = safeDate(aValue);
        const bDate = safeDate(bValue);
        // Place invalid dates at the end
        aValue = aDate ? aDate.getTime() : INVALID_DATE_SORT_VALUE;
        bValue = bDate ? bDate.getTime() : INVALID_DATE_SORT_VALUE;
      } else if (column.type === "number") {
        aValue = Number(aValue);
        bValue = Number(bValue);
      } else if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sortField, sortDirection, columns]);

  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = sortedUsers.slice(startIndex, endIndex);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Calculate grid template columns based on column definitions
  const gridTemplateColumns = useMemo(() => {
    return columns
      .map((col) => {
        if (col.flex) return `${col.flex}fr`;
        if (col.width) return `${col.width}px`;
        return "1fr";
      })
      .join(" ");
  }, [columns]);

  const SortIcon: React.FC<{ field: string }> = ({ field }) => {
    if (sortField !== field) {
      return (
        <svg
          className="w-3 h-3 text-gray-400 ml-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
          />
        </svg>
      );
    }

    return sortDirection === "asc" ? (
      <svg
        className="w-3 h-3 text-gray-700 ml-1"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 15l7-7 7 7"
        />
      </svg>
    ) : (
      <svg
        className="w-3 h-3 text-gray-700 ml-1"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden min-w-[800px]">
      {/* Table Header */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="grid gap-2 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4" style={{ gridTemplateColumns }}>
          {columns.map((column) => (
            <div
              key={column.field}
              className={`flex items-center min-w-0 ${
                column.sortable !== false
                  ? "cursor-pointer hover:text-gray-900"
                  : ""
              }`}
              onClick={() =>
                column.sortable !== false && handleSort(column.field)
              }
            >
              <span className="font-semibold text-[12px] sm:text-[14px] text-gray-600 uppercase tracking-wide">
                {column.headerName}
              </span>
              {column.sortable !== false && <SortIcon field={column.field} />}
            </div>
          ))}
        </div>
      </div>

      {/* Table Body */}
      <div className="max-h-[600px] overflow-y-auto">
        {loading ? (
          <div className="text-center py-12">
            <div className="flex flex-col items-center justify-center">
              <div className="w-10 h-10 border-3 border-gray-300 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
              <p className="text-sm text-gray-500">Loading...</p>
            </div>
          </div>
        ) : paginatedUsers.length === 0 ? (
          <div className="text-center py-12">
            <div className="flex flex-col items-center justify-center">
              {emptyState?.icon || (
                <svg
                  className="w-12 h-12 text-gray-300 mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              )}
              <p className="text-sm text-gray-600 mb-1">
                {emptyState?.title || "No users found"}
              </p>
              <p className="text-xs text-gray-400">
                {emptyState?.subtitle || "Try adjusting your search criteria"}
              </p>
            </div>
          </div>
        ) : (
          paginatedUsers.map((row, paginatedIndex) => {
            const absoluteIndex = startIndex + paginatedIndex;
            return (
              <div
                key={row.id || paginatedIndex}
                className={`grid gap-2 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 cursor-pointer transition-colors ${
                  selectedItem?.id === row.id
                    ? "bg-indigo-50 border-l-4 border-l-indigo-600"
                    : "hover:bg-gray-50"
                } ${paginatedIndex === paginatedUsers.length - 1 ? "border-b-0" : ""}`}
                style={{ gridTemplateColumns }}
                onClick={() => onSelectItem(row)}
              >
                {columns.map((column) => {
                  const value = column.valueGetter
                    ? column.valueGetter({
                        value: row[column.field],
                        row,
                        index: absoluteIndex,
                      })
                    : row[column.field];

                  let cellContent;
                  if (column.renderCell) {
                    cellContent = column.renderCell({
                      value,
                      row,
                      index: absoluteIndex,
                    });
                  } else if (column.type === "date" && value) {
                    // Safely handle date formatting
                    const dateObj = safeDate(value);
                    cellContent = dateObj
                      ? formatDate(dateObj.toISOString())
                      : "Invalid Date";
                  } else {
                    cellContent = value;
                  }

                  return (
                    <div
                      key={column.field}
                      className="flex items-center text-[13px] sm:text-[15px] text-gray-700 min-w-0"
                    >
                      {column.renderCell ? (
                        cellContent
                      ) : (
                        <span className="truncate">{cellContent}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      {/* Table Footer with Pagination */}
      {sortedUsers.length > 0 && (
        <div className="bg-white border-t border-gray-200 px-4 sm:px-6 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-500 text-center sm:text-left">
              Showing {startIndex + 1}-{Math.min(endIndex, sortedUsers.length)}{" "}
              of {sortedUsers.length}
            </p>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-2 sm:px-3 py-1 text-xs text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-2 sm:px-3 py-1 text-xs text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
                className="px-2 sm:px-3 py-1 text-xs text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserTable;
