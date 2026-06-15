import React from 'react';

import { useCentreBookings } from '../useCentres';

import type { CentreBooking, CentreWithKPI } from '../types';

const STATUS_TONE: Record<CentreBooking['status'], string> = {
  Confirmed: 'blue',
  Completed: 'green',
  'No-show': 'red',
  Cancelled: 'gray',
  Waitlisted: 'amber',
};

interface Props {
  centre: CentreWithKPI;
}

const BookingsTab: React.FC<Props> = ({ centre }) => {
  const { bookings, isLoading } = useCentreBookings(centre.id);

  return (
    <div>
      <div className="cmx-stat-grid">
        {[
          { label: 'Bookings Today', accent: '#21295A' },
          { label: 'This Week', accent: '#008482' },
          { label: 'No-Shows Today', accent: '#d97706' },
          { label: 'Waitlisted', accent: '#0891b2' },
        ].map(c => (
          <div key={c.label} className="cmx-stat-card" style={{ ['--accent' as string]: c.accent }}>
            <div className="cmx-s-label">{c.label}</div>
            <div className="cmx-s-val">—</div>
            <div className="cmx-s-sub" style={{ color: 'var(--sub)' }}>
              Pending data
            </div>
          </div>
        ))}
      </div>

      <div className="cmx-tbl-wrap">
        <table className="cmx-tbl">
          <thead>
            <tr>
              <th>Booking ID</th>
              <th>Member</th>
              <th>Lane</th>
              <th>Date</th>
              <th>Time</th>
              <th>Session Type</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--sub)' }}>
                  Loading bookings…
                </td>
              </tr>
            )}
            {!isLoading &&
              bookings.map(b => (
                <tr key={b.id}>
                  <td>
                    <span className="cmx-mono">{b.id}</span>
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--navy)' }}>{b.member}</td>
                  <td>
                    <span className="cmx-pill gray">{b.lane}</span>
                  </td>
                  <td style={{ color: 'var(--sub)' }}>{b.date}</td>
                  <td style={{ color: 'var(--sub)' }}>{b.time}</td>
                  <td>{b.sessionType}</td>
                  <td>
                    <span className={`cmx-pill ${STATUS_TONE[b.status]}`}>{b.status}</span>
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
