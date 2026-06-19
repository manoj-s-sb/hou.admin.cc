import React, { useMemo, useState } from 'react';

import { toast } from 'react-hot-toast';

import { PLAN_COLORS } from '../constants';
import { useCentreMembers } from '../useCentres';

import type { CentreKPISnapshot, CentreMember, PlanId } from '../types';

const comingSoon = () => toast('Coming soon');

const AVATAR_COLORS = ['#21295A', '#008482', '#d97706', '#7c3aed', '#0891b2', '#d42b2b'];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => Array.from(p)[0]?.toUpperCase() ?? '')
    .join('');

const avatarColor = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash + seed.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
};

const planTone = (plan: string): string => {
  const key = plan.toLowerCase().replace(/\s/g, '') as PlanId;
  return PLAN_COLORS[key] ?? '#6b7280';
};

const STATUS_TONE: Record<CentreMember['status'], string> = {
  Active: 'green',
  'On Hold': 'amber',
  Suspended: 'red',
};

interface Props {
  /** Only `id` is required; `kpi` is shown in the stat strip when available. */
  centre: { id: string; kpi?: CentreKPISnapshot };
}

const MembersTab: React.FC<Props> = ({ centre }) => {
  const { kpi } = centre;
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [plan, setPlan] = useState('All Plans');
  const [status, setStatus] = useState('All');

  const { members, isLoading } = useCentreMembers(centre.id, {
    search: search || undefined,
    plan: plan === 'All Plans' ? undefined : plan,
    status: status === 'All' ? undefined : status,
  });

  // Belt-and-braces client filter (the seed fallback isn't server-filtered).
  const rows = useMemo(
    () =>
      members.filter(m => {
        if (search && !`${m.name} ${m.email} ${m.id}`.toLowerCase().includes(search.toLowerCase())) return false;
        if (plan !== 'All Plans' && m.plan !== plan) return false;
        if (status !== 'All' && m.status !== status) return false;
        return true;
      }),
    [members, search, plan, status]
  );

  return (
    <div>
      <div className="cmx-stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="cmx-stat-card" style={{ ['--accent' as string]: '#21295A' }}>
          <div className="cmx-s-label">Total Members</div>
          <div className="cmx-s-val">{kpi ? kpi.totalMembers.toLocaleString() : '—'}</div>
        </div>
        <div className="cmx-stat-card" style={{ ['--accent' as string]: '#008482' }}>
          <div className="cmx-s-label">Active Members</div>
          <div className="cmx-s-val">{kpi ? kpi.activeMembers.toLocaleString() : '—'}</div>
        </div>
        <div className="cmx-stat-card" style={{ ['--accent' as string]: '#d97706' }}>
          <div className="cmx-s-label">Utilisation</div>
          <div className="cmx-s-val">{kpi ? `${kpi.utilisationPct}%` : '—'}</div>
          <div className="cmx-s-sub" style={{ color: 'var(--sub)' }}>
            capacity used
          </div>
        </div>
        <div className="cmx-stat-card" style={{ ['--accent' as string]: '#d42b2b' }}>
          <div className="cmx-s-label">No-show Rate</div>
          <div className="cmx-s-val">{kpi ? `${kpi.noShowPct}%` : '—'}</div>
          <div className="cmx-s-sub" style={{ color: 'var(--sub)' }}>
            last 30 days
          </div>
        </div>
      </div>

      <div className="cmx-filter-bar">
        <div className="cmx-fg">
          <span className="cmx-fld-lbl">Search</span>
          <input
            placeholder="Name, email or member ID…"
            style={{ minWidth: 220 }}
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') setSearch(searchInput);
            }}
          />
        </div>
        <div className="cmx-fg">
          <span className="cmx-fld-lbl">Plan</span>
          <select value={plan} onChange={e => setPlan(e.target.value)}>
            {['All Plans', 'Premium', 'Standard', 'Family', 'Off Peak', 'Night Owl'].map(p => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="cmx-fg">
          <span className="cmx-fld-lbl">Status</span>
          <select value={status} onChange={e => setStatus(e.target.value)}>
            {['All', 'Active', 'On Hold', 'Suspended'].map(s => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="cmx-filter-actions">
          <button
            className="cmx-btn cmx-btn-outline"
            type="button"
            onClick={() => {
              setSearchInput('');
              setSearch('');
              setPlan('All Plans');
              setStatus('All');
            }}
          >
            Reset
          </button>
          <button className="cmx-btn cmx-btn-blue" type="button" onClick={() => setSearch(searchInput)}>
            Search
          </button>
          <button className="cmx-btn cmx-btn-navy" type="button" onClick={comingSoon}>
            + Add Member
          </button>
        </div>
      </div>

      <div className="cmx-tbl-wrap">
        <table className="cmx-tbl">
          <thead>
            <tr>
              <th>Member ID</th>
              <th>Name</th>
              <th>Plan</th>
              <th>Joined</th>
              <th>Sessions</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--sub)' }}>
                  Loading members…
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--sub)' }}>
                  No members match these filters.
                </td>
              </tr>
            )}
            {!isLoading &&
              rows.map(m => (
                <tr key={m.id}>
                  <td>
                    <span className="cmx-mono">{m.id}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="cmx-avatar" style={{ background: avatarColor(m.name) }}>
                        {initials(m.name)}
                      </span>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--navy)' }}>{m.name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--sub)' }}>{m.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="cmx-pill" style={{ background: `${planTone(m.plan)}22`, color: planTone(m.plan) }}>
                      {m.plan}
                    </span>
                  </td>
                  <td style={{ color: 'var(--sub)' }}>{m.joinDate}</td>
                  <td>{m.bookings}</td>
                  <td>
                    <span className={`cmx-pill ${STATUS_TONE[m.status]}`}>{m.status}</span>
                  </td>
                  <td>
                    <button
                      className="cmx-btn cmx-btn-outline"
                      style={{ fontSize: 11.5, padding: '4px 9px' }}
                      type="button"
                      onClick={comingSoon}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MembersTab;
