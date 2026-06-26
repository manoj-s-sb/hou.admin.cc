import React, { useEffect, useMemo, useState } from 'react';

import { toast } from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';

import { getCentreMembers } from '../../../store/centres/api';
import { AppDispatch, RootState } from '../../../store/store';
import { PLAN_COLORS } from '../constants';

import type { CentreKPISnapshot, CentreMember, PlanId } from '../../../store/centres/types';

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

const PILL_BASE = 'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold';

const STATUS_TONE: Record<CentreMember['status'], string> = {
  Active: 'bg-cmx-green-bg text-cmx-green',
  'On Hold': 'bg-cmx-amber-bg text-cmx-amber',
  Suspended: 'bg-red-100 text-red-600',
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

  const dispatch = useDispatch<AppDispatch>();
  const { members, membersLoading: isLoading } = useSelector((state: RootState) => state.centres);

  useEffect(() => {
    dispatch(
      getCentreMembers({
        centreId: centre.id,
        search: search || undefined,
        plan: plan === 'All Plans' ? undefined : plan,
        status: status === 'All' ? undefined : status,
      })
    );
  }, [dispatch, centre.id, search, plan, status]);

  // Belt-and-braces client filter in case the API isn't filtering server-side yet.
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
      <div
        className="mb-[22px] grid grid-cols-1 gap-[14px] min-[560px]:grid-cols-2 min-[900px]:grid-cols-4"
        style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}
      >
        <div
          className="relative overflow-hidden rounded-xl border border-cmx-border bg-white px-5 py-[18px] shadow-cmx before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-[var(--accent,#21295a)] before:content-['']"
          style={{ ['--accent' as string]: '#21295A' }}
        >
          <div className="mb-1.5 text-[11.5px] font-medium text-sub">Total Members</div>
          <div className="text-[26px] font-bold leading-none text-navy">
            {kpi ? kpi.totalMembers.toLocaleString() : '—'}
          </div>
        </div>
        <div
          className="relative overflow-hidden rounded-xl border border-cmx-border bg-white px-5 py-[18px] shadow-cmx before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-[var(--accent,#21295a)] before:content-['']"
          style={{ ['--accent' as string]: '#008482' }}
        >
          <div className="mb-1.5 text-[11.5px] font-medium text-sub">Active Members</div>
          <div className="text-[26px] font-bold leading-none text-navy">
            {kpi ? kpi.activeMembers.toLocaleString() : '—'}
          </div>
        </div>
        <div
          className="relative overflow-hidden rounded-xl border border-cmx-border bg-white px-5 py-[18px] shadow-cmx before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-[var(--accent,#21295a)] before:content-['']"
          style={{ ['--accent' as string]: '#d97706' }}
        >
          <div className="mb-1.5 text-[11.5px] font-medium text-sub">Utilisation</div>
          <div className="text-[26px] font-bold leading-none text-navy">{kpi ? `${kpi.utilisationPct}%` : '—'}</div>
          <div className="mt-1.5 text-[11.5px] text-sub" style={{ color: 'var(--sub)' }}>
            capacity used
          </div>
        </div>
        <div
          className="relative overflow-hidden rounded-xl border border-cmx-border bg-white px-5 py-[18px] shadow-cmx before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-[var(--accent,#21295a)] before:content-['']"
          style={{ ['--accent' as string]: '#d42b2b' }}
        >
          <div className="mb-1.5 text-[11.5px] font-medium text-sub">No-show Rate</div>
          <div className="text-[26px] font-bold leading-none text-navy">{kpi ? `${kpi.noShowPct}%` : '—'}</div>
          <div className="mt-1.5 text-[11.5px] text-sub" style={{ color: 'var(--sub)' }}>
            last 30 days
          </div>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-[10px] border border-cmx-border bg-white px-[18px] py-3.5 shadow-cmx">
        <div className="flex flex-col gap-1">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.04em] text-sub">Search</span>
          <input
            className="min-w-[130px] rounded-[7px] border border-cmx-border bg-white px-2.5 py-1.5 text-[13px] text-cmx-text outline-none focus:border-cmx-blue"
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
        <div className="flex flex-col gap-1">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.04em] text-sub">Plan</span>
          <select
            className="min-w-[130px] rounded-[7px] border border-cmx-border bg-white px-2.5 py-1.5 text-[13px] text-cmx-text outline-none focus:border-cmx-blue"
            value={plan}
            onChange={e => setPlan(e.target.value)}
          >
            {['All Plans', 'Premium', 'Standard', 'Family', 'Off Peak', 'Night Owl'].map(p => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.04em] text-sub">Status</span>
          <select
            className="min-w-[130px] rounded-[7px] border border-cmx-border bg-white px-2.5 py-1.5 text-[13px] text-cmx-text outline-none focus:border-cmx-blue"
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            {['All', 'Active', 'On Hold', 'Suspended'].map(s => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="ml-auto flex items-end gap-[7px]">
          <button
            className="inline-flex cursor-pointer items-center gap-[5px] rounded-[7px] border border-cmx-border bg-white px-3 py-1.5 text-[12.5px] font-semibold text-sub transition-all hover:bg-gray-50"
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
          <button
            className="inline-flex cursor-pointer items-center gap-[5px] rounded-[7px] bg-cmx-blue px-3 py-1.5 text-[12.5px] font-semibold text-white transition-all hover:opacity-90"
            type="button"
            onClick={() => setSearch(searchInput)}
          >
            Search
          </button>
          <button
            className="inline-flex cursor-pointer items-center gap-[5px] rounded-[7px] bg-navy px-3 py-1.5 text-[12.5px] font-semibold text-white transition-all hover:opacity-90"
            type="button"
            onClick={comingSoon}
          >
            + Add Member
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-[10px] border border-cmx-border bg-white">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              <th className="border-b border-cmx-border bg-gray-50 px-3.5 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.04em] text-sub">
                Member ID
              </th>
              <th className="border-b border-cmx-border bg-gray-50 px-3.5 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.04em] text-sub">
                Name
              </th>
              <th className="border-b border-cmx-border bg-gray-50 px-3.5 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.04em] text-sub">
                Plan
              </th>
              <th className="border-b border-cmx-border bg-gray-50 px-3.5 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.04em] text-sub">
                Joined
              </th>
              <th className="border-b border-cmx-border bg-gray-50 px-3.5 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.04em] text-sub">
                Sessions
              </th>
              <th className="border-b border-cmx-border bg-gray-50 px-3.5 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.04em] text-sub">
                Status
              </th>
              <th className="border-b border-cmx-border bg-gray-50 px-3.5 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.04em] text-sub">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td
                  className="border-b border-gray-100 px-3.5 py-[11px] align-middle"
                  colSpan={7}
                  style={{ textAlign: 'center', padding: 40, color: 'var(--sub)' }}
                >
                  Loading members…
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td
                  className="border-b border-gray-100 px-3.5 py-[11px] align-middle"
                  colSpan={7}
                  style={{ textAlign: 'center', padding: 40, color: 'var(--sub)' }}
                >
                  No members match these filters.
                </td>
              </tr>
            )}
            {!isLoading &&
              rows.map(m => (
                <tr key={m.id}>
                  <td className="border-b border-gray-100 px-3.5 py-[11px] align-middle">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">{m.id}</span>
                  </td>
                  <td className="border-b border-gray-100 px-3.5 py-[11px] align-middle">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        className="inline-flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                        style={{ background: avatarColor(m.name) }}
                      >
                        {initials(m.name)}
                      </span>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--navy)' }}>{m.name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--sub)' }}>{m.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="border-b border-gray-100 px-3.5 py-[11px] align-middle">
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={{ background: `${planTone(m.plan)}22`, color: planTone(m.plan) }}
                    >
                      {m.plan}
                    </span>
                  </td>
                  <td
                    className="border-b border-gray-100 px-3.5 py-[11px] align-middle"
                    style={{ color: 'var(--sub)' }}
                  >
                    {m.joinDate}
                  </td>
                  <td className="border-b border-gray-100 px-3.5 py-[11px] align-middle">{m.bookings}</td>
                  <td className="border-b border-gray-100 px-3.5 py-[11px] align-middle">
                    <span className={`${PILL_BASE} ${STATUS_TONE[m.status]}`}>{m.status}</span>
                  </td>
                  <td className="border-b border-gray-100 px-3.5 py-[11px] align-middle">
                    <button
                      className="inline-flex cursor-pointer items-center gap-[5px] rounded-[7px] border border-cmx-border bg-white px-3 py-1.5 text-[12.5px] font-semibold text-sub transition-all hover:bg-gray-50"
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
