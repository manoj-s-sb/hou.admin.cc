import { useEffect, useMemo, useState } from 'react';

import { toast } from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';

import SectionTitle from '../../components/SectionTitle';
import DataTable from '../../components/Table/DataTable';
import { ColumnDef } from '../../components/Table/types';
import { decodeToken } from '../../helpers';
import { AppDispatch, RootState } from '../../store/store';
import {
  getWaitlist,
  addWaitlistNote,
  bulkImportWaitlist,
  getLeads,
  addLeadNote,
  createLead,
} from '../../store/waitlist/api';
import { LeadEntry, WaitlistEntry, WaitlistImportRow } from '../../store/waitlist/types';
import { formatDate } from '../../utils/dateUtils';

import AddLeadModal, { AddLeadFormValues } from './components/AddLeadModal';
import ExportPreviewModal from './components/ExportPreviewModal';
import ImportWaitlistModal from './components/ImportWaitlistModal';
import MemberDetailDrawer, { DetailField } from './components/MemberDetailDrawer';
import { ALL_CENTRES_VALUE, FACILITY_FILTER_OPTIONS, facilityLabel, resolveTypeBucket, titleCase } from './constants';

type Tab = 'waitlist' | 'leads';
type DetailState = { kind: 'waitlist'; entry: WaitlistEntry } | { kind: 'leads'; entry: LeadEntry } | null;

const getInitials = (name: string) => {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  return trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('');
};

const getCurrentUserName = (): string => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const name = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
    return name || 'Admin';
  } catch {
    return 'Admin';
  }
};

const ViewActionButton = ({ onClick }: { onClick: (e: React.MouseEvent) => void }) => (
  <button
    className="rounded-full p-2 transition-colors hover:bg-gray-100"
    title="View Details"
    onClick={onClick}
  >
    <svg className="h-5 w-5 text-gray-600 hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
      <path
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </svg>
  </button>
);

const adaptColumns = (columns: ColumnDef[]) =>
  columns.map(col => ({
    id: col.field,
    label: col.headerName,
    minWidth: col.minWidth,
    width: col.width,
    sortable: col.sortable !== false,
    renderCell: col.renderCell
      ? (value: any, row: any, index: number) => col.renderCell?.({ value, row, index })
      : col.valueGetter
        ? (value: any, row: any) => col.valueGetter?.({ value, row, index: 0 }) || ''
        : undefined,
  }));

const WaitlistLeads = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    waitlist,
    waitlistLoading,
    leads,
    leadsLoading,
    leadsTotal,
    leadsPage,
    leadsLimit,
    noteSaving,
    importLoading,
    createLeadLoading,
  } = useSelector((state: RootState) => state.waitlist);

  // Default to the admin's own centre if it's a known one, otherwise "All Centres".
  const ownFacilityCode = decodeToken()?.facilityCode;
  const [selectedFacility, setSelectedFacility] = useState<string>(
    ownFacilityCode && FACILITY_FILTER_OPTIONS.some(option => option.value === ownFacilityCode)
      ? ownFacilityCode
      : ALL_CENTRES_VALUE
  );

  const [activeTab, setActiveTab] = useState<Tab>('waitlist');
  const [waitlistSearch, setWaitlistSearch] = useState('');
  const [selectedTypeKey, setSelectedTypeKey] = useState<string | null>(null);
  const [waitlistPage, setWaitlistPage] = useState(0);
  const [waitlistRowsPerPage, setWaitlistRowsPerPage] = useState(20);

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [exportTab, setExportTab] = useState<Tab | null>(null);
  const [detail, setDetail] = useState<DetailState>(null);

  useEffect(() => {
    dispatch(getWaitlist({ facilityCode: selectedFacility || undefined, all: true }));
  }, [dispatch, selectedFacility]);

  useEffect(() => {
    if (activeTab !== 'leads') return;
    dispatch(getLeads({ facilityCode: selectedFacility || undefined, page: 1, limit: leadsLimit }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, selectedFacility, activeTab]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setWaitlistSearch('');
    setSelectedTypeKey(null);
    setWaitlistPage(0);
  };

  const typeFilterOptions = useMemo(() => {
    const map = new Map<string, { key: string; label: string; className: string }>();
    waitlist.forEach(entry => {
      const bucket = resolveTypeBucket(entry.subscriptionSrc);
      if (!map.has(bucket.key)) map.set(bucket.key, bucket);
    });
    return Array.from(map.values());
  }, [waitlist]);

  const filteredWaitlist = useMemo(() => {
    const term = waitlistSearch.trim().toLowerCase();
    return waitlist.filter(entry => {
      if (selectedTypeKey && resolveTypeBucket(entry.subscriptionSrc).key !== selectedTypeKey) return false;
      if (term) {
        const haystack = `${entry.name || ''} ${entry.email || ''}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [waitlist, selectedTypeKey, waitlistSearch]);

  useEffect(() => {
    setWaitlistPage(0);
  }, [waitlistSearch, selectedTypeKey]);

  const handleAddNote = (text: string) => {
    if (!detail) return;
    // Use the entry's own facility (authoritative), not the page-level filter —
    // matters in "All Centres" mode where the filter doesn't name one centre.
    const entryFacilityCode = detail.entry.facilityCode || selectedFacility;
    if (!entryFacilityCode) {
      toast.error('This entry has no known centre — cannot add a note.');
      return;
    }
    const createdByName = getCurrentUserName();
    if (detail.kind === 'waitlist') {
      if (!detail.entry.id) return;
      dispatch(addWaitlistNote({ facilityCode: entryFacilityCode, waitlistId: detail.entry.id, text, createdByName }))
        .unwrap()
        .then(updated => setDetail({ kind: 'waitlist', entry: { ...detail.entry, ...updated } }))
        .catch((error: string) => toast.error(error));
    } else {
      if (!detail.entry.id) return;
      dispatch(addLeadNote({ facilityCode: entryFacilityCode, leadId: detail.entry.id, text, createdByName }))
        .unwrap()
        .then(updated => setDetail({ kind: 'leads', entry: { ...detail.entry, ...updated } }))
        .catch((error: string) => toast.error(error));
    }
  };

  const handleImport = (subscriptionSrc: string, entries: WaitlistImportRow[]) => {
    if (!selectedFacility) {
      toast.error('Pick a specific centre before importing — not available in "All Centres" view.');
      return;
    }
    dispatch(bulkImportWaitlist({ facilityCode: selectedFacility, subscriptionSrc, entries }))
      .unwrap()
      .then(result => {
        const { createdCount = 0, skippedCount = 0 } = result || {};
        toast.success(
          `Imported ${createdCount} ${createdCount === 1 ? 'entry' : 'entries'}${skippedCount ? `, skipped ${skippedCount}` : ''}.`
        );
        setIsImportOpen(false);
        dispatch(getWaitlist({ facilityCode: selectedFacility, all: true }));
      })
      .catch((error: string) => toast.error(error));
  };

  const handleAddLead = (values: AddLeadFormValues) => {
    if (!selectedFacility) {
      toast.error('Pick a specific centre before adding a lead — not available in "All Centres" view.');
      return;
    }
    dispatch(
      createLead({
        facilityCode: selectedFacility,
        name: values.name,
        email: values.email,
        phone: values.phone || undefined,
        planInterest: values.planInterest || undefined,
      })
    )
      .unwrap()
      .then(() => {
        toast.success('Lead added successfully.');
        setIsAddLeadOpen(false);
      })
      .catch((error: string) => toast.error(error));
  };

  const waitlistColumns: ColumnDef[] = [
    {
      field: 'position',
      headerName: 'Position',
      width: 100,
      sortable: false,
      renderCell: params => {
        const computed = waitlistPage * waitlistRowsPerPage + (params.index || 0) + 1;
        return <span className="font-medium text-gray-600">#{params.row?.position ?? computed}</span>;
      },
    },
    {
      field: 'name',
      headerName: 'Member',
      flex: 1.5,
      minWidth: 220,
      sortable: false,
      renderCell: params => {
        const entryName = params.row?.name || 'Unnamed';
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#21295A]/10 text-xs font-semibold text-[#21295A]">
              {getInitials(entryName)}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-gray-900">{entryName}</p>
              <p className="truncate text-xs text-gray-500">{params.row?.email || ''}</p>
            </div>
          </div>
        );
      },
      valueGetter: params => params.row?.name || '',
    },
    {
      field: 'facilityCode',
      headerName: 'Centre',
      flex: 1,
      minWidth: 140,
      sortable: false,
      valueGetter: params => facilityLabel(params.row?.facilityCode),
    },
    {
      field: 'subscriptionSrc',
      headerName: 'Waitlist Type',
      flex: 1,
      minWidth: 150,
      sortable: false,
      renderCell: params => {
        const bucket = resolveTypeBucket(params.row?.subscriptionSrc);
        return (
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${bucket.className}`}>{bucket.label}</span>
        );
      },
    },
    {
      field: 'plan',
      headerName: 'Plan',
      flex: 1,
      minWidth: 120,
      sortable: false,
      valueGetter: params => params.row?.plan || params.row?.details?.subscription_code || '—',
    },
    {
      field: 'createdAt',
      headerName: 'Date Added',
      flex: 1,
      minWidth: 140,
      sortable: false,
      valueGetter: params => formatDate(params.row?.createdAt),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 90,
      sortable: false,
      renderCell: params => (
        <ViewActionButton
          onClick={e => {
            e.stopPropagation();
            setDetail({ kind: 'waitlist', entry: params.row });
          }}
        />
      ),
    },
  ];

  const leadsColumns: ColumnDef[] = [
    {
      field: 'member',
      headerName: 'Member',
      flex: 1.5,
      minWidth: 220,
      sortable: false,
      renderCell: params => {
        const email = params.row?.details?.email || '';
        const displayName = params.row?.name || 'Manually Added';
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#21295A]/10 text-xs font-semibold text-[#21295A]">
              {getInitials(params.row?.name || email || '?')}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-gray-900">{displayName}</p>
              <p className="truncate text-xs text-gray-500">{email || '—'}</p>
            </div>
          </div>
        );
      },
    },
    {
      field: 'facilityCode',
      headerName: 'Centre',
      flex: 1,
      minWidth: 140,
      sortable: false,
      valueGetter: params => facilityLabel(params.row?.facilityCode),
    },
    {
      field: 'action',
      headerName: 'Action',
      flex: 1.2,
      minWidth: 200,
      sortable: false,
      valueGetter: params => {
        if (params.row?.action) return titleCase(params.row.action);
        return params.row?.name || params.row?.phone ? 'Manually Added' : '—';
      },
    },
    {
      field: 'plan',
      headerName: 'Plan',
      flex: 1,
      minWidth: 120,
      sortable: false,
      valueGetter: params => params.row?.details?.subscription_code || '—',
    },
    {
      field: 'billing',
      headerName: 'Billing',
      flex: 1,
      minWidth: 130,
      sortable: false,
      renderCell: params => {
        const billing = params.row?.details?.billing_cycle;
        if (!billing) return <span className="text-gray-400">—</span>;
        return (
          <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
            {titleCase(billing)}
          </span>
        );
      },
    },
    {
      field: 'date',
      headerName: 'Date',
      flex: 1,
      minWidth: 140,
      sortable: false,
      valueGetter: params => formatDate(params.row?.timestamp || params.row?.createdAt),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 90,
      sortable: false,
      renderCell: params => (
        <ViewActionButton
          onClick={e => {
            e.stopPropagation();
            setDetail({ kind: 'leads', entry: params.row });
          }}
        />
      ),
    },
  ];

  const waitlistExportRows = useMemo(
    () =>
      filteredWaitlist.map((entry, index) => [
        entry.name || '',
        entry.email || '',
        resolveTypeBucket(entry.subscriptionSrc).label,
        entry.plan || entry.details?.subscription_code || '',
        formatDate(entry.createdAt),
        entry.position ?? index + 1,
      ]),
    [filteredWaitlist]
  );

  const leadsExportRows = useMemo(
    () =>
      leads.map(entry => [
        entry.details?.email || '',
        entry.action ? titleCase(entry.action) : entry.name || entry.phone ? 'Manually Added' : '',
        entry.details?.subscription_code || '',
        entry.details?.billing_cycle ? titleCase(entry.details.billing_cycle) : '',
        formatDate(entry.timestamp || entry.createdAt),
      ]),
    [leads]
  );

  const detailFields: DetailField[] =
    detail?.kind === 'waitlist'
      ? [
          { label: 'Waitlist Type', value: resolveTypeBucket(detail.entry.subscriptionSrc).label },
          { label: 'Requested Plan', value: detail.entry.plan || detail.entry.details?.subscription_code || '' },
          { label: 'Date Added', value: formatDate(detail.entry.createdAt) },
          { label: 'Position', value: detail.entry.position ? `#${detail.entry.position}` : '' },
        ]
      : detail?.kind === 'leads'
        ? [
            { label: 'Action', value: detail.entry.action ? titleCase(detail.entry.action) : 'Manually Added' },
            { label: 'Requested Plan', value: detail.entry.details?.subscription_code || '' },
            { label: 'Billing Cycle', value: detail.entry.details?.billing_cycle ? titleCase(detail.entry.details.billing_cycle) : '' },
            { label: 'Date', value: formatDate(detail.entry.timestamp || detail.entry.createdAt) },
          ]
        : [];

  const detailEmail = detail
    ? detail.kind === 'waitlist'
      ? detail.entry.email || ''
      : detail.entry.details?.email || ''
    : '';

  return (
    <div className="w-full max-w-full">
      <SectionTitle
        description="Manage the centre waitlist and track incoming leads."
        inputPlaceholder=""
        search={false}
        title="Waitlist / Leads"
        value=""
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full bg-gray-100 p-1">
          <button
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
              activeTab === 'waitlist' ? 'bg-white text-[#21295A] shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => handleTabChange('waitlist')}
          >
            Waitlist
          </button>
          <button
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
              activeTab === 'leads' ? 'bg-white text-[#21295A] shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => handleTabChange('leads')}
          >
            Leads
          </button>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-600">
          Centre
          <select
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            value={selectedFacility}
            onChange={e => setSelectedFacility(e.target.value)}
          >
            {FACILITY_FILTER_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {activeTab === 'waitlist' ? (
        <div>
          <div className="mb-4 flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative min-w-[220px] max-w-sm flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                    />
                  </svg>
                </span>
                <input
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-700 shadow-inner focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="Search by name or email"
                  type="text"
                  value={waitlistSearch}
                  onChange={e => setWaitlistSearch(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectedTypeKey === null
                      ? 'border-[#21295A] bg-[#21295A] text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedTypeKey(null)}
                >
                  All Types
                </button>
                {typeFilterOptions.map(option => (
                  <button
                    key={option.key}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      selectedTypeKey === option.key
                        ? 'border-[#21295A] bg-[#21295A] text-white'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedTypeKey(option.key)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!selectedFacility}
                title={selectedFacility ? undefined : 'Pick a specific centre first'}
                onClick={() => setIsImportOpen(true)}
              >
                Import from Excel
              </button>
              <button
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                onClick={() => setExportTab('waitlist')}
              >
                Export
              </button>
            </div>
          </div>

          <DataTable
            columns={adaptColumns(waitlistColumns)}
            data={filteredWaitlist}
            emptyState={{ title: 'No one on the waitlist', subtitle: 'Try adjusting your search or filters' }}
            getRowId={(row: any) => row.id || row.email}
            loading={waitlistLoading}
            page={waitlistPage}
            rowsPerPage={waitlistRowsPerPage}
            onPageChange={setWaitlistPage}
            onRowsPerPageChange={rowsPerPage => {
              setWaitlistRowsPerPage(rowsPerPage);
              setWaitlistPage(0);
            }}
          />
        </div>
      ) : (
        <div>
          <div className="mb-4 flex justify-end gap-3">
            <button
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!selectedFacility}
              title={selectedFacility ? undefined : 'Pick a specific centre first'}
              onClick={() => setIsAddLeadOpen(true)}
            >
              Add Lead
            </button>
            <button
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
              onClick={() => setExportTab('leads')}
            >
              Export
            </button>
          </div>

          <DataTable
            columns={adaptColumns(leadsColumns)}
            data={leads}
            emptyState={{ title: 'No leads yet' }}
            getRowId={(row: any) => row.id}
            loading={leadsLoading}
            page={leadsPage - 1}
            rowsPerPage={leadsLimit}
            serverSide={true}
            totalRows={leadsTotal}
            onPageChange={page => {
              dispatch(getLeads({ facilityCode: selectedFacility || undefined, page: page + 1, limit: leadsLimit }));
            }}
            onRowsPerPageChange={rowsPerPage => {
              dispatch(getLeads({ facilityCode: selectedFacility || undefined, page: 1, limit: rowsPerPage }));
            }}
          />
        </div>
      )}

      <ImportWaitlistModal
        isImporting={importLoading}
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImport}
      />

      <AddLeadModal
        isOpen={isAddLeadOpen}
        isSubmitting={createLeadLoading}
        onClose={() => setIsAddLeadOpen(false)}
        onSubmit={handleAddLead}
      />

      <ExportPreviewModal
        fileName={`${exportTab || 'waitlist'}-${selectedFacility || 'all-centres'}.csv`}
        headers={exportTab === 'leads' ? ['Email', 'Action', 'Plan', 'Billing', 'Date'] : ['Name', 'Email', 'Waitlist Type', 'Plan', 'Date Added', 'Position']}
        isOpen={exportTab !== null}
        rows={exportTab === 'leads' ? leadsExportRows : waitlistExportRows}
        title={exportTab === 'leads' ? 'Export Leads' : 'Export Waitlist'}
        onClose={() => setExportTab(null)}
      />

      {detail && (
        <MemberDetailDrawer
          email={detailEmail}
          fields={detailFields}
          isOpen={true}
          name={detail.entry.name || ''}
          notes={detail.entry.notes || []}
          noteSaving={noteSaving}
          title={detail.kind === 'waitlist' ? 'Waitlist Entry' : 'Lead Details'}
          onAddNote={handleAddNote}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
};

export default WaitlistLeads;
