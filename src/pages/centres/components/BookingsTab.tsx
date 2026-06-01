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
        <div className="cmx-stat-card" style={{ ['--accent' as string]: '#21295A' }}>
          <div className="cmx-s-label">Bookings Today</div>
          <div className="cmx-s-val">42</div>
        </div>
        <div className="cmx-stat-card" style={{ ['--accent' as string]: '#008482' }}>
          <div className="cmx-s-label">This Week</div>
          <div className="cmx-s-val">284</div>
        </div>
        <div className="cmx-stat-card" style={{ ['--accent' as string]: '#d97706' }}>
          <div className="cmx-s-label">No-Shows Today</div>
          <div className="cmx-s-val">3</div>
        </div>
        <div className="cmx-stat-card" style={{ ['--accent' as string]: '#0891b2' }}>
          <div className="cmx-s-label">Waitlisted</div>
          <div className="cmx-s-val">7</div>
        </div>
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
