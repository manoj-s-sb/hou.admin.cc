/**
 * Handles API errors and returns a user-friendly error message
 * @param error - The error object from the API call
 * @param defaultMessage - The default message to return if no specific error message is found
 * @returns A formatted error message string
 */
export const handleApiError = (error: unknown, defaultMessage: string): string => {
  const err = error as {
    response?: { data?: { message?: string; data?: { errors?: { loc?: unknown[]; msg?: string }[] } } };
    message?: string;
  };
  const data = err.response?.data;
  const fieldErrors = data?.data?.errors;
  if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
    const [first] = fieldErrors;
    const field = Array.isArray(first.loc) ? first.loc[first.loc.length - 1] : undefined;
    return field ? `${first.msg ?? 'Invalid value'} (${field})` : (first.msg ?? data?.message ?? defaultMessage);
  }
  return data?.message || err.message || defaultMessage;
};
