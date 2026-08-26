import React from 'react';

interface ComingSoonProps {
  moduleLabel: string;
  /** Override the default "not available yet" line — e.g. CentreModuleRoute passes a
   * centre-specific reason for a pre-launch centre like New York. */
  description?: string;
}

/** Generic placeholder for a module that isn't live yet — reused for both a pre-launch
 * centre's non-waitlist modules (CentreModuleRoute) and the app's other global menu
 * items while only Centre Management is enabled (App.tsx). */
const ComingSoon: React.FC<ComingSoonProps> = ({ moduleLabel, description }) => (
  <div className="flex min-h-[50vh] items-center justify-center px-4 py-10">
    <div className="w-full max-w-md rounded-2xl border border-cmx-border bg-white p-8 text-center shadow-cmx">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
        <svg className="h-7 w-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" strokeWidth={2} />
          <path d="M12 8v4l3 3" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
        </svg>
      </div>
      <h2 className="mb-2 text-xl font-semibold text-navy">{moduleLabel} — Coming Soon</h2>
      <p className="text-sm text-sub">{description || `We're still working on ${moduleLabel.toLowerCase()}.`}</p>
    </div>
  </div>
);

export default ComingSoon;
