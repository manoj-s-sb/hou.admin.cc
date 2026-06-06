import { TailgateLog } from '../../store/tailgate/types';

const FACILITY_TZ = 'America/Chicago';

const AVATAR_COLORS = [
  { ab: '#dbeafe', ac: '#1e40af' },
  { ab: '#dcfce7', ac: '#15803d' },
  { ab: '#fef3c7', ac: '#92400e' },
  { ab: '#fce7f3', ac: '#9d174d' },
  { ab: '#ede9fe', ac: '#5b21b6' },
  { ab: '#ffedd5', ac: '#9a3412' },
  { ab: '#e0f2fe', ac: '#075985' },
  { ab: '#f0fdf4', ac: '#166534' },
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function getAvatarData(name: string | null | undefined): { ini: string; ab: string; ac: string } {
  if (!name) return { ini: '?', ab: '#fef9c3', ac: '#92400e' };
  const parts = name.trim().split(/\s+/);
  const ini =
    parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase();
  const { ab, ac } = avatarColor(name);
  return { ini, ab, ac };
}

export function getEventDisplayType(eventType: string | null | undefined): 'Entry' | 'Exit' | 'Tailgate' {
  const t = (eventType || '').toLowerCase();
  if (t === 'entry') return 'Entry';
  if (t === 'exit') return 'Exit';
  return 'Tailgate';
}

export function getEffectiveEventType(log: TailgateLog): 'Entry' | 'Exit' | 'Tailgate' {
  if (log.review?.reviewed) {
    if (log.review.isViolation) return 'Tailgate';
    if (log.review.actualEventType) return getEventDisplayType(log.review.actualEventType);
  }
  return getEventDisplayType(log.eventType);
}

export function getEffectiveName(log: TailgateLog): string | null {
  if (log.review?.reviewed) return log.review.memberName ?? null;
  return log.actor?.name ?? null;
}

export function getLogStatus(log: TailgateLog): 'pending' | 'reviewed' | 'violation' {
  if (!log.review?.reviewed) return 'pending';
  if (log.review.isViolation) return 'violation';
  return 'reviewed';
}

export function getLogDateVal(log: TailgateLog): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: FACILITY_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(log.timeStampms));
  const y = parts.find(p => p.type === 'year')!.value;
  const m = parts.find(p => p.type === 'month')!.value;
  const d = parts.find(p => p.type === 'day')!.value;
  return `${y}-${m}-${d}`;
}

export function getLogDate(log: TailgateLog): string {
  return new Date(log.timeStampms).toLocaleDateString('en-US', {
    timeZone: FACILITY_TZ,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getLogTime(log: TailgateLog): string {
  return new Date(log.timeStampms).toLocaleTimeString('en-US', {
    timeZone: FACILITY_TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function getPersonCount(log: TailgateLog): number {
  return log.detection?.personCount ?? 1;
}
