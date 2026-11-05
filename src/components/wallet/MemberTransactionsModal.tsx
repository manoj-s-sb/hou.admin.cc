import { useEffect, useState } from 'react';

import endpoints from '../../constants/endpoints';
import api from '../../services';
import { WalletTransactionListResponse } from '../../store/wallet/types';
import { formatDateTimeAsAuthored } from '../../utils/dateUtils';
import DataTable from '../Table/DataTable';
import { TableColumn } from '../Table/types';

interface MemberTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  memberName: string;
}

const DEFAULT_LIMIT = 10;

/**
 * A single member's full wallet history — opened via "View" on a Wallet
 * Transactions row. Fetched directly (not via the `wallet` Redux slice's
 * listWalletTransactions thunk) so this modal's own pagination can never
 * collide with the underlying list page's (see the balance-lookup fix on
 * Member Details for the same reasoning).
 */
const MemberTransactionsModal = ({ isOpen, onClose, userId, memberName }: MemberTransactionsModalProps) => {
  const [data, setData] = useState<WalletTransactionListResponse>({
    transactions: [],
    total: 0,
    page: 1,
    limit: DEFAULT_LIMIT,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchPage = (page: number, limit: number) => {
    setIsLoading(true);
    api
      .post(endpoints.wallets.transactionsList, { userId, page, limit })
      .then(res => setData(res.data?.data))
      .catch(() => setData(prev => ({ ...prev, transactions: [], total: 0 })))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (isOpen) fetchPage(1, DEFAULT_LIMIT);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const columns: TableColumn[] = [
    {
      id: 'date',
      label: 'Date',
      renderCell: value => formatDateTimeAsAuthored(value as string),
      sortable: false,
    },
    {
      id: 'amount',
      label: 'Amount',
      renderCell: (_value, row) => (
        <span className={`font-semibold ${row.transactionType === 'debit' ? 'text-red-600' : 'text-green-600'}`}>
          {row.transactionType === 'debit' ? '-' : '+'}${Number(row.amount).toFixed(2)}
        </span>
      ),
      sortable: false,
    },
    {
      id: 'transactionType',
      label: 'Type',
      renderCell: value => (
        <span
          className={`rounded-full px-2.5 py-1 text-[12px] font-semibold capitalize ${
            value === 'debit' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
          }`}
        >
          {value as string}
        </span>
      ),
      sortable: false,
    },
    {
      id: 'sourceType',
      label: 'Source',
      renderCell: value => <span className="text-gray-600">{value as string}</span>,
      sortable: false,
    },
    {
      id: 'description',
      label: 'Reason',
      renderCell: value => <span className="text-gray-600">{(value as string) || '—'}</span>,
      sortable: false,
    },
    {
      id: 'creditedBy',
      label: 'Credited By',
      // Only present on an admin-issued credit (metadata.creditedByName, stamped
      // from the logged-in admin's own JWT at credit time) — blank for every
      // other movement (e.g. a booking-cancellation refund has no admin behind it).
      renderCell: (_value, row) => (
        <span className="text-gray-600">{(row.metadata?.creditedByName as string) || '—'}</span>
      ),
      sortable: false,
    },
    {
      id: 'status',
      label: 'Status',
      renderCell: value => <span className="capitalize text-gray-600">{value as string}</span>,
      sortable: false,
    },
  ];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 top-20 z-40 flex items-center justify-center bg-black bg-opacity-50 p-4 sm:p-6 lg:left-64"
      role="button"
      tabIndex={0}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={e => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        className="flex h-full w-full max-w-none flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-[#B3DADA] bg-gradient-to-r from-[#F8FAFA] to-[#EDF5F5] px-6 py-5">
          <h2 className="text-[18px] font-semibold text-[#21295A]">Transactions — {memberName}</h2>
          <button
            className="rounded-full p-1 text-[#21295A] transition-all hover:bg-white hover:shadow-md"
            onClick={onClose}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <DataTable
            columns={columns}
            data={data.transactions}
            emptyState={{
              subtitle: 'This member has no wallet activity yet',
              title: 'No transactions found',
            }}
            getRowId={row => row.transactionId}
            loading={isLoading}
            page={data.page ? data.page - 1 : 0}
            rowsPerPage={data.limit || DEFAULT_LIMIT}
            serverSide={true}
            totalRows={data.total || 0}
            onPageChange={page => fetchPage(page + 1, data.limit || DEFAULT_LIMIT)}
            onRowsPerPageChange={rowsPerPage => fetchPage(1, rowsPerPage)}
          />
        </div>
      </div>
    </div>
  );
};

export default MemberTransactionsModal;
