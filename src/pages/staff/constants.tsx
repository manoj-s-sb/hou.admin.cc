import React from 'react';

import { StepKey } from './types';

export const STEPS: { key: StepKey; label: string }[] = [
  { key: 'profile', label: 'Profile' },
  { key: 'roleAccess', label: 'Role & Access' },
  { key: 'documents', label: 'Documents' },
  { key: 'account', label: 'Account' },
];

export const FORMAT_TO_ACCEPT: Record<string, string> = {
  PDF: '.pdf',
  JPG: '.jpg,.jpeg',
  JPEG: '.jpg,.jpeg',
  PNG: '.png',
  DOC: '.doc',
  DOCX: '.docx',
};

export const DOC_ICON_MAP: Record<string, React.ReactNode> = {
  govid: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8m-6-6l6 6m-6-6v6h6"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
    </svg>
  ),
  wwcc: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
    </svg>
  ),
  policecheck: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
    </svg>
  ),
  firstaid: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M3 12h3l3-8 4 16 3-8h5" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} />
    </svg>
  ),
  coachingcert: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M12 2l3 7h7l-5.5 4.5L18 22l-6-4-6 4 1.5-8.5L2 9h7l3-7z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
    </svg>
  ),
};

export const GENERIC_DOC_ICON = (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
    />
    <path d="M14 2v6h6M9 13h6M9 17h6" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} />
  </svg>
);

export const ROLE_ICON_MAP: Record<string, React.ReactNode> = {
  coach: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
    </svg>
  ),
  facilitymgmt: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6h-6v6H4a1 1 0 01-1-1v-9.5z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
    </svg>
  ),
  operations: (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d="M3 12h3l3-8 4 16 3-8h5" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} />
    </svg>
  ),
};

export const GENERIC_ROLE_ICON = (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx={12} cy={8} r={4} strokeWidth={1.8} />
    <path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" strokeLinecap="round" strokeWidth={1.8} />
  </svg>
);
