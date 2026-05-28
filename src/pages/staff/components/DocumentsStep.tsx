import React from 'react';

import { RequiredDocumentConfig, StaffDocument } from '../types';

import DocumentCard from './DocumentCard';

interface DocumentsStepProps {
  requiredDocuments: RequiredDocumentConfig[];
  documents: Record<string, File>;
  existingDocs: StaffDocument[];
  docErrors: Record<string, string>;
  onSelect: (id: string, file: File | null, maxSizeMB: number) => void;
  onRemoveNew: (id: string) => void;
  onRemoveExisting: (type: string) => void;
  onRemoveOrphan: (doc: StaffDocument) => void;
  isConfigLoading: boolean;
  configError: string | null;
}

const DocumentsStep: React.FC<DocumentsStepProps> = ({
  requiredDocuments,
  documents,
  existingDocs,
  docErrors,
  onSelect,
  onRemoveNew,
  onRemoveExisting,
  onRemoveOrphan,
  isConfigLoading,
  configError,
}) => {
  const requiredIds = new Set(requiredDocuments.map(d => d.id.toLowerCase()));
  const orphanDocs = existingDocs.filter(d => !d.type || !requiredIds.has(d.type.toLowerCase()));

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">Required Documents</p>
        {isConfigLoading ? (
          <p className="text-[12px] text-gray-400">Loading documents…</p>
        ) : configError ? (
          <p className="text-[12px] text-red-500">{configError}</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {requiredDocuments.map(doc => {
              const file = documents[doc.id];
              const existing = existingDocs.find(d => d.type?.toLowerCase() === doc.id.toLowerCase());
              return (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  error={docErrors[doc.id]}
                  existing={existing}
                  file={file}
                  onRemoveExisting={() => onRemoveExisting(doc.id)}
                  onRemoveNew={() => onRemoveNew(doc.id)}
                  onSelect={f => onSelect(doc.id, f, doc.maxSizeMB)}
                />
              );
            })}
          </div>
        )}
      </div>

      {orphanDocs.length > 0 && (
        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">Other Uploaded Documents</p>
          <div className="space-y-2">
            {orphanDocs.map((d, idx) => (
              <div
                key={`${d.fileName ?? 'doc'}-${idx}`}
                className="flex items-center justify-between gap-3 rounded-md border border-gray-100 bg-white px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <svg className="h-4 w-4 shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                    />
                  </svg>
                  <p className="truncate text-[12px] font-medium text-gray-800">{d.fileName}</p>
                  {d.sasUrl && (
                    <a
                      className="shrink-0 text-[11px] font-semibold text-blue-700 underline-offset-2 hover:underline"
                      href={d.sasUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Preview
                    </a>
                  )}
                </div>
                <button
                  className="shrink-0 text-[11px] font-semibold text-red-500 transition hover:text-red-700"
                  type="button"
                  onClick={() => onRemoveOrphan(d)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
        <p className="text-[12px] leading-relaxed text-gray-600">
          <span className="font-semibold text-gray-800">Additional Documents</span> — You can upload any other relevant
          documents (e.g. contract, NDA, emergency contact form) after the staff member is created, via their profile
          page.
        </p>
      </div>
    </div>
  );
};

export default DocumentsStep;
