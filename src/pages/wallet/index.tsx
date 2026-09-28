import { useEffect, useMemo, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import DataTable from '../../components/Table/DataTable';
import { TableColumn } from '../../components/Table/types';
import CreditWalletModal, { WalletMemberOption } from '../../components/wallet/CreditWalletModal';
import endpoints from '../../constants/endpoints';
import { useScopedFacilityCode } from '../../hooks/useScopedFacilityCode';
import { isSuperAdmin } from '../../rbac';
import api from '../../services';
import { AppDispatch, RootState } from '../../store/store';
import { listWalletTransactions } from '../../store/wallet/api';
import { formatDateTimeAsAuthored } from '../../utils/dateUtils';

type FilterState = {
  member: WalletMemberOption | null;
  transactionType: '' | 'credit' | 'debit';
  sourceType: string;
  startDate: string;
  endDate: string;
};

// Fixed rather than derived from redux state on mount — this page's own
// requested limit must never depend on whatever another consumer of the
// shared `wallet` slice (e.g. a member's own balance lookup) last left there.
const DEFAULT_LIMIT = 20;

const defaultFilters: FilterState = {
  member: null,
  transactionType: '',
  sourceType: '',
  startDate: '',
  endDate: '',
};

// Known values seen in real transaction data (see WalletTransactionItem.sourceType) —
// the backend doesn't expose a list-known-values endpoint, so this is a fixed set.
const SOURCE_TYPES = [
  { value: '', label: 'All Sources' },
  { value: 'admincredit', label: 'Admin Credit' },
  { value: 'bookingcancellation', label: 'Booking Cancellation' },
];

const WalletTransactions = () => {
  const dispatch = useDispatch<AppDispatch>();
  const facilityCode = useScopedFacilityCode();
  const { transactions, isLoading } = useSelector((state: RootState) => state.wallet);

  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [memberQuery, setMemberQuery] = useState('');
  const [memberResults, setMemberResults] = useState<WalletMemberOption[]>([]);
  const [isSearchingMember, setIsSearchingMember] = useState(false);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);

  const canCredit = isSuperAdmin();

  const fetchPage = (page: number, limit: number) => {
    dispatch(
      listWalletTransactions({
        page,
        limit,
        userId: filters.member?.userId,
        transactionType: filters.transactionType || undefined,
        sourceType: filters.sourceType || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      })
    );
  };

  useEffect(() => {
    fetchPage(1, DEFAULT_LIMIT);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  useEffect(() => {
    if (filters.member || !memberQuery.trim() || memberQuery.trim().length < 2) {
      setMemberResults([]);
      return;
    }
    let cancelled = false;
    setIsSearchingMember(true);
    const t = setTimeout(() => {
      api
        .post(endpoints.members.list, { skip: 0, limit: 8, facilityCode, search: memberQuery.trim() })
        .then(res => {
          if (cancelled) return;
          const members = res.data?.data?.members || [];
          setMemberResults(
            members.map((m: { userId: string; firstName: string; lastName: string; email: string }) => ({
              userId: m.userId,
              name: `${m.firstName} ${m.lastName}`.trim(),
              email: m.email,
            }))
          );
        })
        .catch(() => {
          if (!cancelled) setMemberResults([]);
        })
        .finally(() => {
          if (!cancelled) setIsSearchingMember(false);
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [memberQuery, facilityCode, filters.member]);

  const applyFilters = () => fetchPage(1, transactions.limit || 20);

  const resetFilters = () => {
    setFilters(defaultFilters);
    setMemberQuery('');
    setMemberResults([]);
    dispatch(listWalletTransactions({ page: 1, limit: transactions.limit || 20 }));
  };

  const columns: TableColumn[] = useMemo(
    () => [
      {
        id: 'date',
        label: 'Date',
        renderCell: value => formatDateTimeAsAuthored(value as string),
        sortable: false,
      },
      {
        id: 'userName',
        label: 'Member',
        renderCell: (_value, row) => (
          <div>
            <p className="font-medium text-[#21295A]">{row.userName || '—'}</p>
            <p className="text-[12px] text-gray-500">{row.email}</p>
          </div>
        ),
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
        id: 'balanceAfter',
        label: 'Balance After',
        renderCell: value => <span className="font-medium text-[#21295A]">${Number(value).toFixed(2)}</span>,
        sortable: false,
      },
      {
        id: 'status',
        label: 'Status',
        renderCell: value => <span className="capitalize text-gray-600">{value as string}</span>,
        sortable: false,
      },
    ],
    []
  );

  return (
    <div className="w-full">
      <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-[18px] font-bold tracking-tight text-[#21295A]">Wallet Transactions</h1>
          <p className="mt-1 text-[12px] font-medium text-gray-400">
            All wallet credits and debits across this centre&apos;s members
          </p>
        </div>
        <button
          className="rounded-lg bg-[#21295A] px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#2d3570] disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!canCredit}
          title={canCredit ? undefined : 'Only a superadmin can credit a wallet'}
          type="button"
          onClick={() => canCredit && setIsCreditModalOpen(true)}
        >
          + Credit Wallet
        </button>
      </div>

      {/* ── Filter Bar ──────────────────────────────────────── */}
      <div className="mb-4 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="px-4 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label
                className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400"
                htmlFor="wallet-filter-member"
              >
                Member
              </label>
              {filters.member ? (
                <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <span className="truncate text-[13px] text-gray-700">{filters.member.name}</span>
                  <button
                    className="ml-2 text-[12px] font-medium text-gray-500 hover:text-gray-700"
                    type="button"
                    onClick={() => setFilters(prev => ({ ...prev, member: null }))}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white focus:ring-2 focus:ring-[#21295A]/10"
                    id="wallet-filter-member"
                    placeholder="Search by name or email…"
                    type="text"
                    value={memberQuery}
                    onChange={e => setMemberQuery(e.target.value)}
                  />
                  {isSearchingMember && (
                    <p className="absolute z-10 mt-1 rounded-md bg-white px-2 py-1 text-[12px] text-gray-400 shadow">
                      Searching…
                    </p>
                  )}
                  {!isSearchingMember && memberResults.length > 0 && (
                    <div className="absolute z-10 mt-1 max-h-48 w-full space-y-1 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1.5 shadow-lg">
                      {memberResults.map(member => (
                        <button
                          key={member.userId}
                          className="w-full rounded-md px-2 py-1.5 text-left text-[13px] transition hover:bg-gray-50"
                          type="button"
                          onClick={() => {
                            setFilters(prev => ({ ...prev, member }));
                            setMemberQuery('');
                            setMemberResults([]);
                          }}
                        >
                          <p className="font-medium text-[#21295A]">{member.name}</p>
                          <p className="text-[11px] text-gray-500">{member.email}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label
                className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400"
                htmlFor="wallet-filter-type"
              >
                Type
              </label>
              <select
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white focus:ring-2 focus:ring-[#21295A]/10"
                id="wallet-filter-type"
                value={filters.transactionType}
                onChange={e =>
                  setFilters(prev => ({ ...prev, transactionType: e.target.value as FilterState['transactionType'] }))
                }
              >
                <option value="">All Types</option>
                <option value="credit">Credit</option>
                <option value="debit">Debit</option>
              </select>
            </div>

            <div>
              <label
                className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400"
                htmlFor="wallet-filter-source"
              >
                Source
              </label>
              <select
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white focus:ring-2 focus:ring-[#21295A]/10"
                id="wallet-filter-source"
                value={filters.sourceType}
                onChange={e => setFilters(prev => ({ ...prev, sourceType: e.target.value }))}
              >
                {SOURCE_TYPES.map(source => (
                  <option key={source.value} value={source.value}>
                    {source.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label
                  className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400"
                  htmlFor="wallet-filter-start-date"
                >
                  From
                </label>
                <input
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white focus:ring-2 focus:ring-[#21295A]/10"
                  id="wallet-filter-start-date"
                  type="date"
                  value={filters.startDate}
                  onChange={e => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div>
                <label
                  className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400"
                  htmlFor="wallet-filter-end-date"
                >
                  To
                </label>
                <input
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white focus:ring-2 focus:ring-[#21295A]/10"
                  id="wallet-filter-end-date"
                  type="date"
                  value={filters.endDate}
                  onChange={e => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              className="rounded-lg border border-gray-200 px-4 py-2 text-[12px] font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
              disabled={isLoading}
              type="button"
              onClick={resetFilters}
            >
              Reset
            </button>
            <button
              className="rounded-lg bg-[#21295A] px-5 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#2d3570] disabled:opacity-50"
              disabled={isLoading}
              type="button"
              onClick={applyFilters}
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* ── Transactions Table ──────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <DataTable
          columns={columns}
          data={transactions.transactions}
          emptyState={{
            subtitle: 'Try adjusting your filters',
            title: 'No wallet transactions found',
          }}
          getRowId={row => row.transactionId}
          loading={isLoading}
          page={transactions.page ? transactions.page - 1 : 0}
          rowsPerPage={transactions.limit || 20}
          serverSide={true}
          totalRows={transactions.total || 0}
          onPageChange={page => fetchPage(page + 1, transactions.limit || 20)}
          onRowsPerPageChange={rowsPerPage => fetchPage(1, rowsPerPage)}
        />
      </div>

      <CreditWalletModal
        facilityCode={facilityCode}
        isOpen={isCreditModalOpen}
        onClose={() => setIsCreditModalOpen(false)}
        onCredited={() => fetchPage(1, transactions.limit || 20)}
      />
    </div>
  );
};

export default WalletTransactions;
