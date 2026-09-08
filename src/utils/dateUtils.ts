/**
 * Utility functions for safe date handling
 * Prevents RangeError: Invalid time value when working with dates
 */

/**
 * Check if a date is valid
 * @param date - The date to check
 * @returns true if the date is valid, false otherwise
 */
/** Anything that can sensibly be coerced to a Date. */
export type DateInput = string | number | Date | null | undefined;

export const isValidDate = (date: unknown): boolean => {
  return date instanceof Date && !isNaN(date.getTime());
};

/**
 * Safely create a Date object from any value
 * @param value - The value to convert to a Date (can be string, Date, number, etc.)
 * @returns A valid Date object or null if the date is invalid
 */
export const safeDate = (value: DateInput): Date | null => {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  return isValidDate(date) ? date : null;
};

/**
 * Safely format a date to a localized string
 * @param dateValue - The date value to format (can be string, Date, number, etc.)
 * @param options - Intl.DateTimeFormatOptions for formatting
 * @param locale - The locale to use for formatting (default: 'en-US')
 * @param timeZone - The time zone to use (default: 'America/Chicago')
 * @returns Formatted date string or 'Invalid Date' if the date is invalid
 */
const DEFAULT_LOCALE = 'en-US';
const DEFAULT_TIME_ZONE = 'America/Chicago';

export const formatDate = (
  dateValue: DateInput,
  options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: DEFAULT_TIME_ZONE,
  },
  locale: string = DEFAULT_LOCALE,
  timeZone: string = DEFAULT_TIME_ZONE
): string => {
  const date = safeDate(dateValue);
  if (!date) return 'Invalid Date';

  const formatOptions = { ...options, timeZone };
  return date.toLocaleDateString(locale, formatOptions);
};

/**
 * Safely convert a date to ISO string
 * @param dateValue - The date value to convert
 * @returns ISO string or null if the date is invalid
 */
export const toISOString = (dateValue: DateInput): string | null => {
  const date = safeDate(dateValue);
  return date ? date.toISOString() : null;
};

/**
 * Safely get timestamp from a date
 * @param dateValue - The date value to convert
 * @returns Timestamp in milliseconds or null if the date is invalid
 */
export const getTimestamp = (dateValue: DateInput): number | null => {
  const date = safeDate(dateValue);
  return date ? date.getTime() : null;
};

/**
 * Get a fallback timestamp for sorting invalid dates
 * Use this to place invalid dates at the end of a sorted list
 */
export const INVALID_DATE_SORT_VALUE = Number.MAX_SAFE_INTEGER;

/**
 * Safely format a date time to a localized string with time zone
 * @param dateValue - The date value to format (can be string, Date, number, etc.)
 * @param options - Intl.DateTimeFormatOptions for formatting
 * @param locale - The locale to use for formatting (default: 'en-US')
 * @param timeZone - The time zone to use (default: 'America/Chicago')
 * @returns Formatted date time string or 'Invalid Date' if the date is invalid
 */
export const formatDateTime = (
  dateValue: DateInput,
  options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: DEFAULT_TIME_ZONE,
  },
  locale: string = DEFAULT_LOCALE,
  timeZone: string = DEFAULT_TIME_ZONE
): string => {
  const date = safeDate(dateValue);
  if (!date) return 'Invalid Date';

  const formatOptions = { ...options, timeZone };
  return date.toLocaleTimeString(locale, formatOptions);
};

/**
 * Get today's date in YYYY-MM-DD format for America/Chicago timezone
 * @returns Today's date string in YYYY-MM-DD format
 */
export const getTodayDateInChicago = (): string => {
  const today = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: DEFAULT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };

  const formatter = new Intl.DateTimeFormat('en-CA', options);
  return formatter.format(today); // en-CA format gives YYYY-MM-DD
};

// ========================================
// Global Formatters for America/Chicago
// ========================================

/**
 * Global date formatter for America/Chicago timezone
 * Formats: "Wed, Jan 15, 2025"
 * @param dateValue - The date value to format
 * @returns Formatted date string or 'Invalid Date' if the date is invalid
 */
export const formatDateChicago = (dateValue: DateInput): string => {
  const date = safeDate(dateValue);
  if (!date) return 'Invalid Date';

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: DEFAULT_TIME_ZONE,
  });
};

/**
 * Global time formatter for America/Chicago timezone
 * Formats: "10:30 AM"
 * @param dateValue - The date value to format
 * @returns Formatted time string or 'Invalid Date' if the date is invalid
 */
export const formatTimeChicago = (dateValue: DateInput): string => {
  const date = safeDate(dateValue);
  if (!date) return 'Invalid Date';

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: DEFAULT_TIME_ZONE,
  });
};

/**
 * Global date and time formatter for America/Chicago timezone
 * Formats: "Wed, Jan 15, 2025 at 10:30 AM"
 * @param dateValue - The date value to format
 * @returns Formatted date and time string or 'Invalid Date' if the date is invalid
 */
export const formatDateTimeChicago = (dateValue: DateInput): string => {
  const date = safeDate(dateValue);
  if (!date) return 'Invalid Date';

  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: DEFAULT_TIME_ZONE,
  });
};

/**
 * Format a time range for America/Chicago timezone
 * Formats: "10:30 AM - 11:30 AM"
 * @param startTime - The start time value
 * @param endTime - The end time value
 * @returns Formatted time range string or 'Invalid Date' if either date is invalid
 */
export const formatTimeRangeChicago = (startTime: DateInput, endTime: DateInput): string => {
  const start = formatTimeChicago(startTime);
  const end = formatTimeChicago(endTime);

  if (start === 'Invalid Date' || end === 'Invalid Date') {
    return 'Invalid Date';
  }

  return `${start} - ${end}`;
};

// ========================================
// Offset-preserving formatters ("as authored")
// ========================================
//
// The formatters above always convert into America/Chicago wall-clock time —
// correct for a Chicago-based centre, but WRONG for any other centre (e.g.
// BLR01/India), because the ISO timestamps these events carry already embed
// that facility's own local offset (e.g. "...T15:00:00+05:30" for 3:00 PM IST).
// Converting that into Chicago time shifts it by the offset difference (~10.5
// hours for IST), producing a nonsense displayed time. These formatters instead
// read the offset already present in the string and display THAT wall-clock
// time verbatim — correct for whichever facility authored the timestamp,
// regardless of the browser's or a hardcoded timezone.

interface ParsedIsoLocal {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
}

const parseIsoLocal = (iso: string): ParsedIsoLocal | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]), hour: Number(m[4]), minute: Number(m[5]) };
};

/**
 * Format a time (e.g. "3:00 PM") from the offset already embedded in the ISO
 * string — see the "as authored" note above.
 */
export const formatTimeAsAuthored = (dateValue: string | null | undefined): string => {
  const p = dateValue ? parseIsoLocal(dateValue) : null;
  if (!p) return 'Invalid Date';
  const ampm = p.hour >= 12 ? 'PM' : 'AM';
  const hour12 = p.hour % 12 || 12;
  return `${hour12}:${String(p.minute).padStart(2, '0')} ${ampm}`;
};

/** Time range version of formatTimeAsAuthored — see its doc comment. */
export const formatTimeRangeAsAuthored = (
  startTime: string | null | undefined,
  endTime: string | null | undefined
): string => {
  const start = formatTimeAsAuthored(startTime);
  const end = formatTimeAsAuthored(endTime);
  if (start === 'Invalid Date' || end === 'Invalid Date') return 'Invalid Date';
  return `${start} - ${end}`;
};

/**
 * Format a full date + time (e.g. "Wed, Sep 9, 2026, 3:00 PM") from the offset
 * already embedded in the ISO string — see the "as authored" note above.
 */
export const formatDateTimeAsAuthored = (dateValue: string | null | undefined): string => {
  const p = dateValue ? parseIsoLocal(dateValue) : null;
  if (!p) return 'Invalid Date';
  // Constructed at local midnight from the parsed Y/M/D — only used to derive
  // weekday/month names, which can't cross a calendar boundary from midnight.
  const dateForNames = new Date(p.year, p.month - 1, p.day);
  const weekday = dateForNames.toLocaleDateString(DEFAULT_LOCALE, { weekday: 'short' });
  const month = dateForNames.toLocaleDateString(DEFAULT_LOCALE, { month: 'short' });
  return `${weekday}, ${month} ${p.day}, ${p.year}, ${formatTimeAsAuthored(dateValue)}`;
};

/**
 * Format a date only (e.g. "Wed, Sep 9, 2026") from the offset already embedded
 * in the ISO string — see the "as authored" note above. Date-only counterpart
 * of formatDateChicago, for callers that don't want the time-of-day appended.
 */
export const formatDateAsAuthored = (dateValue: string | null | undefined): string => {
  const p = dateValue ? parseIsoLocal(dateValue) : null;
  if (!p) return 'Invalid Date';
  const dateForNames = new Date(p.year, p.month - 1, p.day);
  const weekday = dateForNames.toLocaleDateString(DEFAULT_LOCALE, { weekday: 'short' });
  const month = dateForNames.toLocaleDateString(DEFAULT_LOCALE, { month: 'short' });
  return `${weekday}, ${month} ${p.day}, ${p.year}`;
};
