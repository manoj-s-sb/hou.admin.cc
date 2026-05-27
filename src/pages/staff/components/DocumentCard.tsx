import React, { useRef } from 'react';

import { DOC_ICON_MAP, GENERIC_DOC_ICON } from '../constants';
import { RequiredDocumentConfig, StaffDocument } from '../types';
import { buildAcceptString, formatBytes } from '../utils';

interface DocumentCardProps {
  doc: RequiredDocumentConfig;
  file: File | undefined;
  existing: StaffDocument | undefined;
  error: string | undefined;
  onSelect: (file: File | null) => void;
  onRemoveNew: () => void;
  onRemoveExisting: () => void;
}

const DocumentCard: React.FC<DocumentCardProps> = ({
  doc,
  file,
  existing,
  error,
  onSelect,
  onRemoveNew,
  onRemoveExisting,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const hasContent = Boolean(file || existing);
  const accept = buildAcceptString(doc.acceptedFormats);
  const formatsText = doc.acceptedFormats.join(', ');

  return (
    <div className={`rounded-lg border bg-white p-3 transition ${hasContent ? 'border-[#21295A]/40' : 'border-gray-100'}`}>
      <div className="flex items-start gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: doc.iconBg, color: doc.iconColor }}
        >
          {DOC_ICON_MAP[doc.id] ?? GENERIC_DOC_ICON}
        </span>
        <div className="flex-1">
          <p className="text-[13px] font-bold text-[#21295A]">{doc.label}</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-gray-500">
            {doc.description} {formatsText} — max {doc.maxSizeMB}MB.
          </p>
        </div>
        <input
          ref={inputRef}
          accept={accept}
          className="hidden"
          type="file"
          onChange={e => {
            onSelect(e.target.files?.[0] ?? null);
            // reset value so the same file can be re-picked after removal
            e.target.value = '';
          }}
        />
        <button
          className="shrink-0 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-700 transition hover:border-[#21295A]/30 hover:text-[#21295A]"
          type="button"
          onClick={() => inputRef.current?.click()}
        >
          {hasContent ? 'Replace' : 'Upload'}
        </button>
      </div>
      {existing && !file && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-blue-100 bg-blue-50 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <svg className="h-4 w-4 shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
              />
            </svg>
            <p className="truncate text-[12px] font-medium text-blue-800">{existing.fileName}</p>
            {existing.sasUrl && (
              <a
                className="shrink-0 text-[11px] font-semibold text-blue-700 underline-offset-2 hover:underline"
                href={existing.sasUrl}
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
            onClick={onRemoveExisting}
          >
            Remove
          </button>
        </div>
      )}
      {file && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <svg className="h-4 w-4 shrink-0 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
            <p className="truncate text-[12px] font-medium text-emerald-800">{file.name}</p>
            <span className="shrink-0 text-[11px] text-emerald-600">· {formatBytes(file.size)}</span>
          </div>
          <button
            className="shrink-0 text-[11px] font-semibold text-red-500 transition hover:text-red-700"
            type="button"
            onClick={() => {
              onRemoveNew();
              if (inputRef.current) inputRef.current.value = '';
            }}
          >
            Remove
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-[11px] font-medium text-red-500">{error}</p>}
    </div>
  );
};

export default DocumentCard;
