import { useEffect, useState } from 'react';

import endpoints from '../constants/endpoints';
import api from '../services';

import DataTable from './Table/DataTable';
import { TableColumn } from './Table/types';

interface EmailLogRow {
  id: string;
  emailType?: string;
  recipientEmail?: string;
  recipientUserId?: string;
  facilityCode?: string;
  channel?: string;
  status?: string;
  sentAt?: string;
}

interface NotificationsLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_LIMIT = 20;

const STATUS_STYLES: Record<string, string> = {
  sent: 'bg-green-50 text-green-700',
  failed: 'bg-red-50 text-red-700',
  skipped: 'bg-amber-50 text-amber-700',
};

/**
 * NE-1: central notifications log — every outbound email across the whole
 * portal (automatic + 1:1/bulk member email), one row per send attempt,
 * newest first. Opened from the bell icon in the top bar (Layout.tsx) rather
 * than its own sidebar entry, per request. Distinct from the per-member
 * history on a member's own page (SendEmailSection.tsx), which only ever
 * shows that one member's custom emails.
 *
 * "Delivered/bounced" is intentionally not a status this shows — nothing in
 * the backend tracks real mail-provider delivery outcomes today (see
 * admin/email-logs' backing service); status here is "sent" (handed to the
 * queue/provider), "failed", or "skipped" (service not configured).
 */
const NotificationsLogModal = ({ isOpen, onClose }: NotificationsLogModalProps) => {
  const [rows, setRows] = useState<EmailLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [isLoading, setIsLoading] = useState(false);

  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailType, setEmailType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchPage = (nextPage: number, nextLimit: number) => {
    setIsLoading(true);
    api
      .get(endpoints.emailLogs, {
        params: {
          recipient_email: recipientEmail.trim() || undefined,
          email_type: emailType.trim() || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          skip: (nextPage - 1) * nextLimit,
          limit: nextLimit,
        },
      })
      .then(res => {
        setRows(res.data?.data?.items || []);
        setTotal(res.data?.data?.total || 0);
        setPage(nextPage);
        setLimit(nextLimit);
      })
      .catch(() => {
        setRows([]);
        setTotal(0);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (isOpen) fetchPage(1, DEFAULT_LIMIT);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Debounced — same pattern as every other live-search filter in this portal.
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => fetchPage(1, limit), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipientEmail, emailType, startDate, endDate]);

  if (!isOpen) return null;

  const columns: TableColumn<EmailLogRow>[] = [
    {
      id: 'recipient',
      label: 'Recipient',
      renderCell: (_value, row) => (
        <span className="text-[13px] text-[#21295A]">{row.recipientEmail || row.recipientUserId || '—'}</span>
      ),
      sortable: false,
    },
    {
      id: 'emailType',
      label: 'Type',
      renderCell: value => <span className="capitalize text-gray-600">{String(value || '—').replace(/_/g, ' ')}</span>,
      sortable: false,
    },
    {
      id: 'channel',
      label: 'Channel',
      renderCell: value => <span className="capitalize text-gray-600">{(value as string) || 'email'}</span>,
      sortable: false,
    },
    {
      id: 'facilityCode',
      label: 'Facility',
      renderCell: value => <span className="text-gray-600">{(value as string) || '—'}</span>,
      sortable: false,
    },
    {
      id: 'sentAt',
      label: 'Time',
      renderCell: value => (
        <span className="text-gray-600">{value ? new Date(value as string).toLocaleString() : '—'}</span>
      ),
      sortable: false,
    },
    {
      id: 'status',
      label: 'Status',
      renderCell: value => {
        const status = (value as string) || 'unknown';
        return (
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${
              STATUS_STYLES[status] || 'bg-gray-100 text-gray-600'
            }`}
          >
            {status}
          </span>
        );
      },
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
        className="flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-[#B3DADA] bg-gradient-to-r from-[#F8FAFA] to-[#EDF5F5] px-6 py-5">
          <div>
            <h2 className="text-[18px] font-semibold text-[#21295A]">Notifications Log</h2>
            <p className="mt-1 text-[12px] font-medium text-gray-500">
              Every message sent from the portal — recipient, type, channel, time and status
            </p>
          </div>
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
          {/* ── Filters ─────────────────────────────────────────── */}
          <div className="mb-4 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label
                  className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400"
                  htmlFor="log-recipient"
                >
                  Recipient
                </label>
                <input
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white focus:ring-2 focus:ring-[#21295A]/10"
                  id="log-recipient"
                  placeholder="Search by email…"
                  type="text"
                  value={recipientEmail}
                  onChange={e => setRecipientEmail(e.target.value)}
                />
              </div>
              <div>
                <label
                  className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400"
                  htmlFor="log-type"
                >
                  Type
                </label>
                <input
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white focus:ring-2 focus:ring-[#21295A]/10"
                  id="log-type"
                  placeholder="e.g. tour_complete"
                  type="text"
                  value={emailType}
                  onChange={e => setEmailType(e.target.value)}
                />
              </div>
              <div>
                <label
                  className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400"
                  htmlFor="log-start"
                >
                  From
                </label>
                <input
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white focus:ring-2 focus:ring-[#21295A]/10"
                  id="log-start"
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label
                  className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400"
                  htmlFor="log-end"
                >
                  To
                </label>
                <input
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white focus:ring-2 focus:ring-[#21295A]/10"
                  id="log-end"
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ── Log ─────────────────────────────────────────────── */}
          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            <DataTable
              columns={columns}
              data={rows}
              emptyState={{
                subtitle: 'Try adjusting your filters',
                title: 'No messages found',
              }}
              getRowId={row => row.id}
              loading={isLoading}
              page={page ? page - 1 : 0}
              rowsPerPage={limit}
              serverSide={true}
              totalRows={total}
              onPageChange={nextPage => fetchPage(nextPage + 1, limit)}
              onRowsPerPageChange={rowsPerPage => fetchPage(1, rowsPerPage)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsLogModal;
