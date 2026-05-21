import { createAuthSession } from './auth.storage';

describe('auth storage session normalization', () => {
  it('rejects missing tokens', () => {
    expect(createAuthSession({ role: 'ROLE_ADMIN' }, '')).toBeNull();
  });

  it('does not trust a stored admin identity when the token has no admin claim', () => {
    const session = createAuthSession(
      { role: 'ROLE_ADMIN', email: 'fake@moyra.org' },
      fakeJwt({ sub: 'fake-user', exp: futureExpiration() })
    );

    expect(session).not.toBeNull();
    expect(session?.role).toBe('ROLE_USER');
    expect(session?.identity.role).toBe('ROLE_USER');
  });

  it('accepts admin role only from trusted token claims in the current v2 runtime', () => {
    const session = createAuthSession(
      { role: 'ROLE_USER', email: 'admin@moyra.org' },
      fakeJwt({
        sub: 'admin-user',
        exp: futureExpiration(),
        'cognito:groups': ['ROLE_ADMIN'],
      })
    );

    expect(session?.role).toBe('ROLE_ADMIN');
    expect(session?.identity.role).toBe('ROLE_ADMIN');
  });

  it('rejects expired JWT sessions', () => {
    const session = createAuthSession(
      { role: 'ROLE_ADMIN' },
      fakeJwt({ sub: 'admin-user', exp: Math.floor(Date.now() / 1000) - 60 })
    );

    expect(session).toBeNull();
  });
});

function fakeJwt(payload: Record<string, unknown>): string {
  return `${base64Url({ alg: 'none', typ: 'JWT' })}.${base64Url(payload)}.signature`;
}

function base64Url(value: Record<string, unknown>): string {
  return btoa(JSON.stringify(value))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function futureExpiration(): number {
  return Math.floor(Date.now() / 1000) + 3600;
}
