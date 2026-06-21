import React, { useState } from 'react';

import BookingsTab from './BookingsTab';
import FacilitiesTab from './FacilitiesTab';
import MembersTab from './MembersTab';
import PlansTab from './PlansTab';

import type { CentreWithKPI } from '../../../store/centres/types';

type OpsTab = 'members' | 'bookings' | 'induction' | 'tours' | 'tailgate' | 'maintenance' | 'plans' | 'facilities';

const TABS: { key: OpsTab; label: string }[] = [
  { key: 'members', label: 'Members' },
  { key: 'bookings', label: 'Slot Bookings' },
  { key: 'induction', label: 'Induction' },
  { key: 'tours', label: 'Tour Details' },
  { key: 'tailgate', label: 'Tailgate Logs' },
  { key: 'maintenance', label: 'Maintenance Logs' },
  { key: 'plans', label: 'Plans' },
  { key: 'facilities', label: 'Facilities' },
];

const PLACEHOLDERS: Record<string, { title: string; desc: string }> = {
  induction: {
    title: 'Induction Management',
    desc: 'Schedule and track security training for this centre.',
  },
  tours: {
    title: 'Tour Details',
    desc: 'Manage tour bookings and scheduling for this centre.',
  },
  tailgate: {
    title: 'Tailgate Logs',
    desc: 'Video logs, unidentified entries and violation tracking.',
  },
  maintenance: {
    title: 'Maintenance Logs',
    desc: 'Lane and equipment maintenance tracking for this centre.',
  },
};

const Placeholder: React.FC<{ tab: string }> = ({ tab }) => {
  const p = PLACEHOLDERS[tab];
  if (!p) return null;
  return (
    <div className="rounded-xl border border-cmx-border bg-white px-6 py-14 text-center text-sub">
      <div className="text-sm font-bold text-navy">{p.title}</div>
      <div style={{ marginTop: 6 }}>{p.desc}</div>
      <div
        style={{ marginTop: 14, fontSize: 11, color: 'var(--sub)', textTransform: 'uppercase', letterSpacing: '.05em' }}
      >
        Coming soon
      </div>
    </div>
  );
};

interface Props {
  centre: CentreWithKPI;
  onBack: () => void;
}

const OpsView: React.FC<Props> = ({ centre, onBack }) => {
  const [tab, setTab] = useState<OpsTab>('members');

  return (
    <div className="font-sans text-sm text-cmx-text">
      {/* Ops nav row: back button + live centre badge (in lieu of touching the global sidebar) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <button
          className="inline-flex cursor-pointer items-center gap-[5px] rounded-[7px] border border-cmx-border bg-white px-3 py-1.5 text-[12.5px] font-semibold text-sub transition-all hover:bg-gray-50"
          type="button"
          onClick={onBack}
        >
          <svg fill="none" height={13} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" width={13}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Centres
        </button>
        <div className="inline-flex items-center gap-2 rounded-lg bg-navy px-3 py-1.5 text-white">
          <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_0_3px_rgba(34,197,94,0.25)]" />
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>
            {centre.name}, {centre.country}
          </span>
        </div>
      </div>

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 20,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div className="mb-1 text-xl font-bold text-navy">
            {centre.flag} {centre.name} — Operations
          </div>
          <div className="mb-[22px] text-[13px] text-sub" style={{ marginBottom: 0 }}>
            Managing {centre.city}
            {centre.state ? `, ${centre.state}` : ''}
          </div>
        </div>
      </div>

      {/* 4-stat strip */}
      <div className="mb-[22px] grid grid-cols-1 gap-[14px] min-[560px]:grid-cols-2 min-[900px]:grid-cols-4">
        <div
          className="relative overflow-hidden rounded-xl border border-cmx-border bg-white px-5 py-[18px] shadow-cmx before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-[var(--accent,#21295a)] before:content-['']"
          style={{ ['--accent' as string]: '#21295A' }}
        >
          <div className="mb-1.5 text-[11.5px] font-medium text-sub">Total Members</div>
          <div className="text-[26px] font-bold leading-none text-navy">{centre.kpi.totalMembers.toLocaleString()}</div>
        </div>
        <div
          className="relative overflow-hidden rounded-xl border border-cmx-border bg-white px-5 py-[18px] shadow-cmx before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-[var(--accent,#21295a)] before:content-['']"
          style={{ ['--accent' as string]: '#008482' }}
        >
          <div className="mb-1.5 text-[11.5px] font-medium text-sub">Active Members</div>
          <div className="text-[26px] font-bold leading-none text-navy">
            {centre.kpi.activeMembers.toLocaleString()}
          </div>
        </div>
        <div
          className="relative overflow-hidden rounded-xl border border-cmx-border bg-white px-5 py-[18px] shadow-cmx before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-[var(--accent,#21295a)] before:content-['']"
          style={{ ['--accent' as string]: '#d97706' }}
        >
          <div className="mb-1.5 text-[11.5px] font-medium text-sub">Utilisation</div>
          <div className="text-[26px] font-bold leading-none text-navy">{centre.kpi.utilisationPct}%</div>
        </div>
        <div
          className="relative overflow-hidden rounded-xl border border-cmx-border bg-white px-5 py-[18px] shadow-cmx before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-[var(--accent,#21295a)] before:content-['']"
          style={{ ['--accent' as string]: '#d42b2b' }}
        >
          <div className="mb-1.5 text-[11.5px] font-medium text-sub">No-show Rate</div>
          <div className="text-[26px] font-bold leading-none text-navy">{centre.kpi.noShowPct}%</div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="mb-6 flex gap-0 overflow-x-auto border-b border-cmx-border">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`-mb-px flex cursor-pointer items-center gap-[7px] whitespace-nowrap border-b-2 border-transparent bg-transparent px-[18px] py-3 text-[13px] font-medium text-sub transition-all hover:text-cmx-text ${
              tab === t.key ? 'border-b-cmx-blue font-semibold text-cmx-blue' : ''
            }`}
            type="button"
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'members' && <MembersTab centre={centre} />}
      {tab === 'bookings' && <BookingsTab centre={centre} />}
      {tab === 'plans' && <PlansTab centre={centre} />}
      {tab === 'facilities' && <FacilitiesTab centre={centre} />}
      {(tab === 'induction' || tab === 'tours' || tab === 'tailgate' || tab === 'maintenance') && (
        <Placeholder tab={tab} />
      )}
    </div>
  );
};

export default OpsView;
