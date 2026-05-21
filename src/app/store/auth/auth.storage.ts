import { ApiRuntime, roleFromIdentity, toLegacyEntity } from '../../services/global';
import { JwtPayload, decodeJwtPayload, isJwtExpired } from '../../utils/auth-token';

const IDENTITY_KEY = 'identity';
const TOKEN_KEY = 'token';

export type AuthRole = 'ROLE_USER' | 'ROLE_ADMIN' | string;

export type AuthSession = {
  identity: any;
  token: string;
  role: AuthRole;
  expiresAt: number | null;
};

export function readStoredAuthSession(): AuthSession | null {
  const token = readStorageValue(TOKEN_KEY);
  if (!token) {
    return null;
  }

  const session = createAuthSession(parseStoredIdentity(), token);
  if (!session) {
    clearStoredAuthSession();
  }

  return session;
}

export function persistAuthSession(identity: any, token: string): AuthSession | null {
  const session = createAuthSession(identity, token);
  if (!session) {
    clearStoredAuthSession();
    return null;
  }

  writeStorageValue(IDENTITY_KEY, JSON.stringify(session.identity));
  writeStorageValue(TOKEN_KEY, session.token);
  return session;
}

export function clearStoredAuthSession(): void {
  removeStorageValue(IDENTITY_KEY);
  removeStorageValue(TOKEN_KEY);
}

export function createAuthSession(identity: any, token: string | null | undefined): AuthSession | null {
  const normalizedToken = String(token || '').trim();
  if (!normalizedToken) {
    return null;
  }

  const tokenIdentity = decodeJwtPayload(normalizedToken);
  if (tokenIdentity && isJwtExpired(tokenIdentity)) {
    return null;
  }

  if (ApiRuntime.isV2 && !tokenIdentity) {
    return null;
  }

  const normalizedIdentity = normalizeIdentity(identity, tokenIdentity);
  if (!normalizedIdentity) {
    return null;
  }

  const roleSource = ApiRuntime.isV2 && tokenIdentity ? tokenIdentity : normalizedIdentity;
  const role = roleFromIdentity(roleSource);
  const safeIdentity = toLegacyEntity(buildSafeIdentity(normalizedIdentity, tokenIdentity, role));

  return {
    identity: safeIdentity,
    token: normalizedToken,
    role,
    expiresAt: expirationFromPayload(tokenIdentity),
  };
}

function normalizeIdentity(identity: any, tokenIdentity: JwtPayload | null): any | null {
  if (identity && typeof identity === 'object') {
    return identity;
  }

  return tokenIdentity && typeof tokenIdentity === 'object' ? tokenIdentity : null;
}

function buildSafeIdentity(identity: any, tokenIdentity: JwtPayload | null, role: AuthRole): any {
  if (!ApiRuntime.isV2) {
    return {
      ...identity,
      role: identity?.role || role,
    };
  }

  const tokenGroups = tokenIdentity?.['cognito:groups'] || tokenIdentity?.['groups'] || [];

  return {
    ...identity,
    ...(tokenIdentity || {}),
    role,
    groups: tokenGroups,
    ['cognito:groups']: tokenGroups,
    ['custom:legacyRole']: tokenIdentity?.['custom:legacyRole'] || role,
  };
}

function parseStoredIdentity(): any | null {
  const value = readStorageValue(IDENTITY_KEY);
  if (!value || value === 'undefined') {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function expirationFromPayload(payload: JwtPayload | null): number | null {
  const expiresAt = Number(payload?.['exp']);
  return Number.isFinite(expiresAt) && expiresAt > 0 ? expiresAt * 1000 : null;
}

function readStorageValue(key: string): string | null {
  const localValue = browserStorage('local')?.getItem(key);
  if (localValue) {
    return localValue;
  }

  return browserStorage('session')?.getItem(key) || null;
}

function writeStorageValue(key: string, value: string): void {
  const storage = browserStorage('local') || browserStorage('session');
  storage?.setItem(key, value);
}

function removeStorageValue(key: string): void {
  browserStorage('local')?.removeItem(key);
  browserStorage('session')?.removeItem(key);
}

function browserStorage(type: 'local' | 'session'): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return type === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}
