/** Passport JWT expiry/missing token becomes generic Unauthorized — map for the app. */
export function remapUnauthorized(
  status: number,
  code: string,
  message: string,
): { code: string; message: string } {
  if (status === 401 && (code === 'Unauthorized' || message === 'Unauthorized')) {
    return {
      code: 'AUTH_REQUIRED',
      message: 'Session expired. Sign in again.',
    };
  }
  return { code, message };
}
