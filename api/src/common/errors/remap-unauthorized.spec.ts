import { remapUnauthorized } from './remap-unauthorized';

describe('remapUnauthorized', () => {
  it('turns Passport Unauthorized into AUTH_REQUIRED', () => {
    const out = remapUnauthorized(401, 'Unauthorized', 'Unauthorized');
    expect(out.code).toBe('AUTH_REQUIRED');
    expect(out.message).toBe('Session expired. Sign in again.');
  });

  it('leaves AppError-style AUTH_REVOKED alone', () => {
    const out = remapUnauthorized(401, 'AUTH_REVOKED', 'Session ended. Sign in again.');
    expect(out.code).toBe('AUTH_REVOKED');
    expect(out.message).toBe('Session ended. Sign in again.');
  });

  it('leaves non-401 errors alone', () => {
    const out = remapUnauthorized(500, 'Unauthorized', 'Unauthorized');
    expect(out.code).toBe('Unauthorized');
  });
});
