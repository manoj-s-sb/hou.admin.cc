import { pdf } from '@react-pdf/renderer';

import endpoints from '../../../constants/endpoints';
import api from '../../../services';

import MembershipReportPdf from './MembershipReportPdf';
import { buildPdfData, type PdfReportData } from './reportPdfData';

import type { MembershipData, OverviewData, ReportsRequest } from '../../../store/reports/types';

// Fetch a tab's report data directly (bypassing the store, so the on-screen tab
// isn't disturbed) using the currently-applied filters.
const fetchTab = async (req: ReportsRequest, tab: 'overview' | 'membership') => {
  const res = await api.get<{ data: unknown }>(endpoints.reports, {
    params: {
      tab,
      view: req.view,
      centreId: req.centreId || undefined,
      country: req.country || undefined,
      period: req.period,
      startDate: req.startDate || undefined,
      endDate: req.endDate || undefined,
    },
  });
  return res.data?.data;
};

/** Fetch + shape the report data for the current filters (used to drive the preview). */
export async function fetchReportData(req: ReportsRequest, exportedBy: string): Promise<PdfReportData> {
  const [overview, membership] = await Promise.all([fetchTab(req, 'overview'), fetchTab(req, 'membership')]);
  return buildPdfData(overview as OverviewData, membership as MembershipData, req, exportedBy);
}

/** Render the report to a blob and trigger a download. */
export async function downloadReportPdf(data: PdfReportData): Promise<void> {
  const blob = await pdf(<MembershipReportPdf data={data} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `membership-report-${new Date().toISOString().slice(0, 10)}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
