import React, { useEffect } from 'react';

import { useDispatch, useSelector } from 'react-redux';

import { getCentreBookings } from '../../../store/centres/api';
import { AppDispatch, RootState } from '../../../store/store';

import type { CentreBooking } from '../../../store/centres/types';

const PILL_BASE = 'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold';

const STATUS_TONE: Record<CentreBooking['status'], string> = {
  Confirmed: 'bg-cmx-blue-light text-cmx-blue',
  Completed: 'bg-cmx-green-bg text-cmx-green',
  'No-show': 'bg-red-100 text-red-600',
  Cancelled: 'bg-gray-100 text-sub',
  Waitlisted: 'bg-cmx-amber-bg text-cmx-amber',
};

interface Props {
  centre: { id: string };
}

const BookingsTab: React.FC<Props> = ({ centre }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { bookings, bookingsLoading: isLoading } = useSelector((state: RootState) => state.centres);

  useEffect(() => {
    dispatch(getCentreBookings(centre.id));
  }, [dispatch, centre.id]);

  return (
    <div>
      <div className="mb-[22px] grid grid-cols-1 gap-[14px] min-[560px]:grid-cols-2 min-[900px]:grid-cols-4">
        {[
          { label: 'Bookings Today', accent: '#21295A' },
          { label: 'This Week', accent: '#008482' },
          { label: 'No-Shows Today', accent: '#d97706' },
          { label: 'Waitlisted', accent: '#0891b2' },
        ].map(c => (
          <div
            key={c.label}
            className="relative overflow-hidden rounded-xl border border-cmx-border bg-white px-5 py-[18px] shadow-cmx before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-[var(--accent,#21295a)] before:content-['']"
            style={{ ['--accent' as string]: c.accent }}
          >
            <div className="mb-1.5 text-[11.5px] font-medium text-sub">{c.label}</div>
            <div className="text-[26px] font-bold leading-none text-navy">—</div>
            <div className="mt-1.5 text-[11.5px] text-sub" style={{ color: 'var(--sub)' }}>
              Pending data
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-[10px] border border-cmx-border bg-white">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              <th className="border-b border-cmx-border bg-gray-50 px-3.5 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.04em] text-sub">
                Booking ID
              </th>
              <th className="border-b border-cmx-border bg-gray-50 px-3.5 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.04em] text-sub">
                Member
              </th>
              <th className="border-b border-cmx-border bg-gray-50 px-3.5 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.04em] text-sub">
                Lane
              </th>
              <th className="border-b border-cmx-border bg-gray-50 px-3.5 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.04em] text-sub">
                Date
              </th>
              <th className="border-b border-cmx-border bg-gray-50 px-3.5 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.04em] text-sub">
                Time
              </th>
              <th className="border-b border-cmx-border bg-gray-50 px-3.5 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.04em] text-sub">
                Session Type
              </th>
              <th className="border-b border-cmx-border bg-gray-50 px-3.5 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.04em] text-sub">
                Status
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
                  Loading bookings…
                </td>
              </tr>
            )}
            {!isLoading &&
              bookings.map(b => (
                <tr key={b.id}>
                  <td className="border-b border-gray-100 px-3.5 py-[11px] align-middle">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">{b.id}</span>
                  </td>
                  <td
                    className="border-b border-gray-100 px-3.5 py-[11px] align-middle"
                    style={{ fontWeight: 600, color: 'var(--navy)' }}
                  >
                    {b.member}
                  </td>
                  <td className="border-b border-gray-100 px-3.5 py-[11px] align-middle">
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-sub">
                      {b.lane}
                    </span>
                  </td>
                  <td
                    className="border-b border-gray-100 px-3.5 py-[11px] align-middle"
                    style={{ color: 'var(--sub)' }}
                  >
                    {b.date}
                  </td>
                  <td
                    className="border-b border-gray-100 px-3.5 py-[11px] align-middle"
                    style={{ color: 'var(--sub)' }}
                  >
                    {b.time}
                  </td>
                  <td className="border-b border-gray-100 px-3.5 py-[11px] align-middle">{b.sessionType}</td>
                  <td className="border-b border-gray-100 px-3.5 py-[11px] align-middle">
                    <span className={`${PILL_BASE} ${STATUS_TONE[b.status]}`}>{b.status}</span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BookingsTab;
