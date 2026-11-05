/** A slot's raw start/end time may already be "HH:MM", "HH.MM", or a full ISO
 * datetime depending on backend environment. These helpers normalize that for
 * display and for combining with the calendar's selected day into a real Date. */

const toHHMM = (rawTime: string): string | null => {
  if (!rawTime) return null;
  if (/^\d{2}:\d{2}$/.test(rawTime)) return rawTime;
  if (/^\d+\.\d+$/.test(rawTime)) {
    const [hours, minutes] = rawTime.split('.');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  }
  const parsed = new Date(rawTime);
  if (!Number.isNaN(parsed.getTime())) {
    return `${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`;
  }
  return null;
};

/** Display-friendly "HH:MM" — falls back to the raw string if it can't be parsed. */
export const formatSlotTime = (rawTime: string): string => toHHMM(rawTime) || rawTime;

/** Combines the calendar's selected day (YYYY-MM-DD) with a slot's raw start time
 * into a single Date, e.g. to compute the cancel-booking cutoff. */
export const parseSlotDateTime = (dateStr: string, rawTime: string): Date | null => {
  const hhmm = toHHMM(rawTime);
  if (!dateStr || !hhmm) return null;
  const combined = new Date(`${dateStr}T${hhmm}:00`);
  return Number.isNaN(combined.getTime()) ? null : combined;
};
