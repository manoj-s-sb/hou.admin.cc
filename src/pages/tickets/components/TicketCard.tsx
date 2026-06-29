import React from 'react';

import { formatDateTimeChicago } from '../../../utils/dateUtils';
import { CATEGORY_META, PRIORITY_META, ROLE_LABELS, slaState, STATUS_META } from '../constants';

import type { Ticket, TicketRole } from '../../../store/tickets/types';

const laneLabel = (lanes: number[] | null): string => {
  if (!lanes || lanes.length === 0) return '';
  if (lanes.length === 7) return 'All Lanes';
  return lanes.length === 1 ? `Lane ${lanes[0]}` : `Lanes ${[...lanes].sort((a, b) => a - b).join(', ')}`;
};

const assigneeLabel = (ticket: Ticket): string => {
  if (ticket.assignedToName) return ticket.assignedToName;
  if (ticket.assignedTo) return ROLE_LABELS[ticket.assignedTo as TicketRole] ?? ticket.assignedTo;
  return 'Unassigned';
};

interface Props {
  ticket: Ticket;
  currentUserId?: string;
  onOpen: (ticket: Ticket) => void;
}

const TicketCard: React.FC<Props> = ({ ticket, currentUserId, onOpen }) => {
  const status = STATUS_META[ticket.status];
  const priority = PRIORITY_META[ticket.priority];
  const category = CATEGORY_META[ticket.category];
  const isMine = Boolean(currentUserId && ticket.assignedToId === currentUserId);
  const commentCount = ticket.activities.filter(a => a.action === 'comment').length;
  const lanes = laneLabel(ticket.laneNo);
  const sla = slaState(ticket.slaDeadline, ticket.status);

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      className="mb-2.5 flex cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:border-indigo-300 hover:shadow-md"
      onClick={() => onOpen(ticket)}
    >
      <span className="w-1 flex-shrink-0" style={{ background: status.stripe }} />
      <div className="flex-1 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-gray-400">
              {ticket.ticketNo} &nbsp;·&nbsp; {ticket.facilityCode}
            </div>
            <div className="mt-0.5 text-[14px] font-bold text-[#21295A]">{ticket.title}</div>
          </div>
          <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${status.pill}`}>
              {status.label}
            </span>
            {sla && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${sla.className}`}>{sla.label}</span>
            )}
            {isMine && (
              <span className="rounded-lg bg-[#ecedf4] px-2 py-0.5 text-[10px] font-bold text-[#21295A]">
                Assigned to me
              </span>
            )}
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-gray-500">
          <span className="inline-flex items-center gap-1">
            <span className={`h-1.5 w-1.5 rounded-full ${priority.dot}`} />
            <span className={`font-semibold ${priority.text}`}>{priority.label}</span>
          </span>
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${category.className}`}>
            {category.label}
          </span>
          {lanes && <span className="font-semibold text-[#21295A]">{lanes}</span>}
          {ticket.task && <span>· {ticket.task}</span>}
          <span>
            · {commentCount} comment{commentCount === 1 ? '' : 's'}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-gray-50 pt-2.5 text-[11px]">
          <span className="text-gray-400">
            {ticket.raisedByName || '—'} · {formatDateTimeChicago(ticket.createdAt)}
          </span>
          <span className="font-semibold text-gray-600">{assigneeLabel(ticket)}</span>
        </div>
      </div>
    </div>
  );
};

export default TicketCard;
