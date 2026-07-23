import React, { useState } from 'react';

import { PDFViewer } from '@react-pdf/renderer';
import { toast } from 'react-hot-toast';

import { downloadReportPdf } from './exportMembershipPdf';
import MembershipReportPdf from './MembershipReportPdf';

import type { PdfReportData } from './reportPdfData';

interface Props {
  data: PdfReportData;
  onClose: () => void;
}

/** Full-screen preview of the generated report with an explicit Download action. */
const PdfPreviewModal: React.FC<Props> = ({ data, onClose }) => {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadReportPdf(data);
    } catch (e) {
      toast.error(typeof e === 'string' ? e : 'Could not download the PDF');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div aria-modal="true" className="fixed inset-0 z-[700] flex flex-col bg-black/60 p-4" role="dialog">
      <div className="mx-auto flex h-full w-full max-w-[920px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <div>
            <h2 className="text-[15px] font-bold text-[#21295A]">Report Preview</h2>
            <p className="text-[11.5px] text-gray-400">
              {data.title} · {data.periodLabel}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg bg-[#21295A] px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-[#2d3570] disabled:opacity-50"
              disabled={downloading}
              type="button"
              onClick={handleDownload}
            >
              {downloading ? 'Downloading…' : '⭳ Download PDF'}
            </button>
            <button
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
              type="button"
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 bg-gray-100">
          <PDFViewer height="100%" showToolbar={false} style={{ border: 'none' }} width="100%">
            <MembershipReportPdf data={data} />
          </PDFViewer>
        </div>
      </div>
    </div>
  );
};

export default PdfPreviewModal;
