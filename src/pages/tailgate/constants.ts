export type TailgateFilters = {
  from: string;
  to: string;
  name: string;
  type: string;
  status: string;
  door: string;
};

export const DEFAULT_FILTERS: TailgateFilters = {
  from: '',
  to: '',
  name: '',
  type: '',
  status: '',
  door: '',
};

export const TABLE_HEADERS = ['S.No', 'Time', 'Video', 'Event Type', 'Identity', 'Member ID', 'Lane Door', 'Status'];

export const statusConfig: Record<string, { label: string; badgeCls: string; btnCls: string; btnLabel: string }> = {
  reviewed: {
    label: '✓ Reviewed',
    badgeCls: 'bg-green-100 text-green-700',
    btnCls: 'border border-green-300 text-green-700 hover:bg-green-50',
    btnLabel: 'Edit Review',
  },
  pending: {
    label: '⏳ Pending',
    badgeCls: 'bg-yellow-100 text-yellow-700',
    btnCls: 'bg-[#21295A] text-white hover:bg-[#1a2147]',
    btnLabel: 'Review',
  },
  violation: {
    label: '⚠ Violation',
    badgeCls: 'bg-red-100 text-red-700',
    btnCls: 'border border-red-300 text-red-700 hover:bg-red-50',
    btnLabel: 'Edit Review',
  },
};

export const eventMap: Record<string, { label: string; className: string; gradient: string }> = {
  Entry: {
    label: 'Entry',
    className: 'bg-green-100 text-green-700',
    gradient: 'linear-gradient(135deg,#1e3a5f,#2563eb)',
  },
  Exit: { label: 'Exit', className: 'bg-gray-100 text-gray-600', gradient: 'linear-gradient(135deg,#1f2937,#4b5563)' },
  Tailgate: {
    label: 'Tailgate',
    className: 'bg-red-100 text-red-700',
    gradient: 'linear-gradient(135deg,#7f1d1d,#dc2626)',
  },
};

export function getPageNumbers(currentPage: number, totalPages: number): (number | '...')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i);
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
