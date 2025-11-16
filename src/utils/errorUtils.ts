/**
 * Handles API errors and returns a user-friendly error message
 * @param error - The error object from the API call
 * @param defaultMessage - The default message to return if no specific error message is found
 * @returns A formatted error message string
 */
export const handleApiError = (error: any, defaultMessage: string): string => {
  return error.response?.data?.message || error.message || defaultMessage;
};
