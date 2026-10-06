import { useEffect, useState } from 'react';

import DataTable from '../../components/Table/DataTable';
import { TableColumn } from '../../components/Table/types';
import CreditWalletModal from '../../components/wallet/CreditWalletModal';
import MemberTransactionsModal from '../../components/wallet/MemberTransactionsModal';
import endpoints from '../../constants/endpoints';
import { useScopedFacilityCode } from '../../hooks/useScopedFacilityCode';
import { isSuperAdmin } from '../../rbac';
import api from '../../services';

interface WalletRosterRow {
  userId: string;
  name: string;
  email: string;
  subscriptionCode: string;
  balance: number;
}

const DEFAULT_LIMIT = 20;

/**
 * One row per MEMBER (not per transaction) — name, subscription, and their
 * real current wallet balance (see admin/wallets/balances). The actual
 * transaction history lives inside the "View" drill-down (MemberTransactionsModal).
 * Composed from two existing, independently-scoped endpoints rather than one
 * combined one: the Members list already owns search/pagination/facility-scoping,
 * and admin/wallets/balances only ever answers "what's in these wallets" for
 * whatever page of members is already showing.
 */
const WalletTransactions = () => {
  const facilityCode = useScopedFacilityCode();

  const [rows, setRows] = useState<WalletRosterRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [viewingMember, setViewingMember] = useState<{ userId: string; name: string } | null>(null);

  const canCredit = isSuperAdmin();

  const fetchPage = (nextPage: number, nextLimit: number, nextSearch: string) => {
    setIsLoading(true);
    api
      .post(endpoints.members.list, {
        skip: (nextPage - 1) * nextLimit,
        limit: nextLimit,
        facilityCode,
        search: nextSearch.trim() || undefined,
      })
      .then(async res => {
        const members: {
          userId: string;
          firstName: string;
          lastName: string;
          email: string;
          subscriptionCode?: string;
        }[] = res.data?.data?.members || [];
        setTotal(res.data?.data?.total || 0);
        setPage(nextPage);
        setLimit(nextLimit);

        if (members.length === 0) {
          setRows([]);
          return;
        }

        const balancesRes = await api.post(endpoints.wallets.balances, {
          userIds: members.map(m => m.userId),
        });
        const balanceByUserId: Record<string, number> = {};
        (balancesRes.data?.data?.balances || []).forEach((b: { userId: string; balance: number }) => {
          balanceByUserId[b.userId] = b.balance;
        });

        setRows(
          members.map(m => ({
            userId: m.userId,
            name: `${m.firstName} ${m.lastName}`.trim(),
            email: m.email,
            subscriptionCode: m.subscriptionCode || '',
            balance: balanceByUserId[m.userId] ?? 0,
          }))
        );
      })
      .catch(() => {
        setRows([]);
        setTotal(0);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchPage(1, DEFAULT_LIMIT, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilityCode]);

  // Live search, debounced — same pattern as the member picker this page's
  // Credit Wallet modal already uses.
  useEffect(() => {
    const t = setTimeout(() => fetchPage(1, limit, search), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const columns: TableColumn[] = [
    {
      id: 'name',
      label: 'Member',
      renderCell: (_value, row) => (
        <div>
          <p className="font-medium text-[#21295A]">{row.name || '—'}</p>
          <p className="text-[12px] text-gray-500">{row.email}</p>
        </div>
      ),
      sortable: false,
    },
    {
      id: 'subscriptionCode',
      label: 'Subscription Type',
      renderCell: value => <span className="capitalize text-gray-600">{(value as string) || '—'}</span>,
      sortable: false,
    },
    {
      id: 'balance',
      label: 'Current Balance',
      renderCell: value => <span className="font-semibold text-green-600">${Number(value).toFixed(2)}</span>,
      sortable: false,
    },
    {
      id: 'view',
      label: 'Actions',
      renderCell: (_value, row) => (
        <button
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] font-semibold text-[#21295A] transition hover:bg-gray-50"
          type="button"
          onClick={() => setViewingMember({ userId: row.userId, name: row.name || row.email })}
        >
          View
        </button>
      ),
      sortable: false,
    },
  ];

  return (
    <div className="w-full">
      <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-[18px] font-bold tracking-tight text-[#21295A]">Wallet Transactions</h1>
          <p className="mt-1 text-[12px] font-medium text-gray-400">
            Every member&apos;s wallet balance at this centre — View opens their full transaction history
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

      {/* ── Search ──────────────────────────────────────────── */}
      <div className="mb-4 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="px-4 py-4">
          <label
            className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400"
            htmlFor="wallet-roster-search"
          >
            Member
          </label>
          <input
            className="w-full max-w-md rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white focus:ring-2 focus:ring-[#21295A]/10"
            id="wallet-roster-search"
            placeholder="Search by name or email…"
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Member Roster ───────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <DataTable
          columns={columns}
          data={rows}
          emptyState={{
            subtitle: 'Try adjusting your search',
            title: 'No members found',
          }}
          getRowId={row => row.userId}
          loading={isLoading}
          page={page ? page - 1 : 0}
          rowsPerPage={limit}
          serverSide={true}
          totalRows={total}
          onPageChange={nextPage => fetchPage(nextPage + 1, limit, search)}
          onRowsPerPageChange={rowsPerPage => fetchPage(1, rowsPerPage, search)}
        />
      </div>

      <CreditWalletModal
        facilityCode={facilityCode}
        isOpen={isCreditModalOpen}
        onClose={() => setIsCreditModalOpen(false)}
        onCredited={() => fetchPage(page, limit, search)}
      />

      <MemberTransactionsModal
        isOpen={!!viewingMember}
        memberName={viewingMember?.name || ''}
        userId={viewingMember?.userId || ''}
        onClose={() => setViewingMember(null)}
      />
    </div>
  );
};

export default WalletTransactions;
