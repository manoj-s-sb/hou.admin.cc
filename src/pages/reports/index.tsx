import React, { useEffect, useMemo, useState } from 'react';

import { toast } from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';

import { getLocalUser } from '../../constants/user';
import { getCentres } from '../../store/centres/api';
import { getReport } from '../../store/reports/api';
import { AppDispatch, RootState } from '../../store/store';

import FilterBar, { type CentreOption } from './components/FilterBar';
import { fetchReportData } from './pdf/exportMembershipPdf';
import PdfPreviewModal from './pdf/PdfPreviewModal';
import CapacityTab from './tabs/CapacityTab';
import MembershipTab from './tabs/MembershipTab';
import OverviewTab from './tabs/OverviewTab';
import SessionsTab from './tabs/SessionsTab';
import UtilisationTab from './tabs/UtilisationTab';

import type { PdfReportData } from './pdf/reportPdfData';
import type { FacilitySummary } from '../../store/centres/types';
import type {
  CapacityData,
  MembershipData,
  OverviewData,
  ReportTab,
  ReportsRequest,
  SessionsData,
  UtilisationData,
} from '../../store/reports/types';

const TABS: { key: ReportTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'membership', label: 'Membership' },
  { key: 'utilisation', label: 'Utilisation' },
  { key: 'sessions', label: 'Sessions' },
  { key: 'capacity', label: 'Capacity' },
];

const DEFAULT_REQ: ReportsRequest = { tab: 'overview', view: 'network', period: '30d' };

const Reports: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { data, isLoading, error } = useSelector((s: RootState) => s.reports);
  const [applied, setApplied] = useState<ReportsRequest>(DEFAULT_REQ);
  const [facilities, setFacilities] = useState<FacilitySummary[]>([]);
  const [exporting, setExporting] = useState(false);
  const [previewData, setPreviewData] = useState<PdfReportData | null>(null);
  const exportedBy = useSelector((s: RootState) => s.auth.user?.email) || getLocalUser().name || '—';

  // Fetch + shape the data, then open the preview (download happens from there).
  const handleExport = async () => {
    setExporting(true);
    try {
      const reportData = await fetchReportData(applied, exportedBy);
      setPreviewData(reportData);
    } catch (e) {
      toast.error(typeof e === 'string' ? e : 'Could not generate the report');
    } finally {
      setExporting(false);
    }
  };

  // Centre catalogue powers the filter dropdowns.
  useEffect(() => {
    dispatch(getCentres({ skip: 0, limit: 200 }))
      .unwrap()
      .then(res => setFacilities(res.facilities ?? []))
      .catch(() => setFacilities([]));
  }, [dispatch]);

  // Fetch the report whenever the applied filters (incl. tab) change.
  useEffect(() => {
    dispatch(getReport(applied));
  }, [dispatch, applied]);

  const centres: CentreOption[] = useMemo(() => facilities.map(f => ({ code: f.code, name: f.name })), [facilities]);

  const setTab = (tab: ReportTab) => setApplied(prev => ({ ...prev, tab }));

  const renderTab = () => {
    if (error) return <p className="py-12 text-center text-[13px] text-red-500">{error}</p>;
    // Guard the tab-switch race: the store may still hold the previous tab's data
    // until the new fetch resolves — render the loader until the data matches the tab.
    if (isLoading || !data || data.meta.tab !== applied.tab)
      return <p className="py-12 text-center text-[13px] text-gray-400">Loading analytics…</p>;
    switch (applied.tab) {
      case 'membership':
        return <MembershipTab data={data as MembershipData} />;
      case 'utilisation':
        return <UtilisationTab data={data as UtilisationData} />;
      case 'sessions':
        return <SessionsTab data={data as SessionsData} />;
      case 'capacity':
        return <CapacityTab data={data as CapacityData} />;
      default:
        return <OverviewTab data={data as OverviewData} />;
    }
  };

  return (
    <div className="space-y-5 print:space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-[#21295A]">Reports</h1>
          <p className="mt-0.5 text-[13px] text-gray-500">Network-wide analytics across all centres.</p>
        </div>
        <button
          className="flex items-center gap-1.5 rounded-lg bg-[#21295A] px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-[#2d3570] disabled:opacity-50 print:hidden"
          disabled={exporting || (isLoading && !data)}
          type="button"
          onClick={handleExport}
        >
          {exporting ? 'Preparing…' : '⭳ Export PDF'}
        </button>
      </div>

      <div className="print:hidden">
        <FilterBar
          applied={applied}
          centres={centres}
          onApply={next => setApplied(next)}
          onReset={() => setApplied({ ...DEFAULT_REQ })}
        />
      </div>

      <div className="flex flex-wrap items-center gap-1 border-b border-gray-100 print:hidden">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`border-b-2 px-3 py-1.5 text-[13px] font-semibold transition ${
              applied.tab === t.key
                ? 'border-[#21295A] text-[#21295A]'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
            type="button"
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {renderTab()}

      {previewData && <PdfPreviewModal data={previewData} onClose={() => setPreviewData(null)} />}
    </div>
  );
};

export default Reports;
