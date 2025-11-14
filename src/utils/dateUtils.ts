/**
 * Utility functions for safe date handling
 * Prevents RangeError: Invalid time value when working with dates
 */

/**
 * Check if a date is valid
 * @param date - The date to check
 * @returns true if the date is valid, false otherwise
 */
export const isValidDate = (date: any): boolean => {
  return date instanceof Date && !isNaN(date.getTime());
};

/**
 * Safely create a Date object from any value
 * @param value - The value to convert to a Date (can be string, Date, number, etc.)
 * @returns A valid Date object or null if the date is invalid
 */
export const safeDate = (value: any): Date | null => {
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
export const formatDate = (
  dateValue: any,
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Chicago",
  },
  locale: string = "en-US",
  timeZone: string = "America/Chicago",
): string => {
  const date = safeDate(dateValue);
  if (!date) return "Invalid Date";

  const formatOptions = { ...options, timeZone };
  return date.toLocaleDateString(locale, formatOptions);
};

/**
 * Safely convert a date to ISO string
 * @param dateValue - The date value to convert
 * @returns ISO string or null if the date is invalid
 */
export const toISOString = (dateValue: any): string | null => {
  const date = safeDate(dateValue);
  return date ? date.toISOString() : null;
};

/**
 * Safely get timestamp from a date
 * @param dateValue - The date value to convert
 * @returns Timestamp in milliseconds or null if the date is invalid
 */
export const getTimestamp = (dateValue: any): number | null => {
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
  dateValue: any,
  options: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Chicago",
  },
  locale: string = "en-US",
  timeZone: string = "America/Chicago",
): string => {
  const date = safeDate(dateValue);
  if (!date) return "Invalid Date";

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
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };
  
  const formatter = new Intl.DateTimeFormat("en-CA", options);
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
export const formatDateChicago = (dateValue: any): string => {
  const date = safeDate(dateValue);
  if (!date) return "Invalid Date";

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Chicago",
  });
};

/**
 * Global time formatter for America/Chicago timezone
 * Formats: "10:30 AM"
 * @param dateValue - The date value to format
 * @returns Formatted time string or 'Invalid Date' if the date is invalid
 */
export const formatTimeChicago = (dateValue: any): string => {
  const date = safeDate(dateValue);
  if (!date) return "Invalid Date";

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Chicago",
  });
};

/**
 * Global date and time formatter for America/Chicago timezone
 * Formats: "Wed, Jan 15, 2025 at 10:30 AM"
 * @param dateValue - The date value to format
 * @returns Formatted date and time string or 'Invalid Date' if the date is invalid
 */
export const formatDateTimeChicago = (dateValue: any): string => {
  const date = safeDate(dateValue);
  if (!date) return "Invalid Date";

  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Chicago",
  });
};

/**
 * Format a time range for America/Chicago timezone
 * Formats: "10:30 AM - 11:30 AM"
 * @param startTime - The start time value
 * @param endTime - The end time value
 * @returns Formatted time range string or 'Invalid Date' if either date is invalid
 */
export const formatTimeRangeChicago = (startTime: any, endTime: any): string => {
  const start = formatTimeChicago(startTime);
  const end = formatTimeChicago(endTime);
  
  if (start === "Invalid Date" || end === "Invalid Date") {
    return "Invalid Date";
  }
  
  return `${start} - ${end}`;
};
