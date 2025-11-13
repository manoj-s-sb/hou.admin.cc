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
 * @returns Formatted date string or 'Invalid Date' if the date is invalid
 */
export const formatDate = (
  dateValue: any,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' },
  locale: string = 'en-US'
): string => {
  const date = safeDate(dateValue);
  if (!date) return 'Invalid Date';
  
  return date.toLocaleDateString(locale, options);
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

