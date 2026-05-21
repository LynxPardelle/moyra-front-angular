export type JwtPayload = Record<string, unknown>;

export function decodeJwtPayload(token: string | null | undefined): JwtPayload | null {
  const payload = String(token || '').split('.')[1];
  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(decodeBase64Url(payload)) as JwtPayload;
  } catch {
    return null;
  }
}

export function isJwtExpired(payload: JwtPayload | null, skewSeconds = 30): boolean {
  const expiresAt = Number(payload?.['exp']);
  if (!Number.isFinite(expiresAt) || expiresAt <= 0) {
    return false;
  }

  return expiresAt * 1000 <= Date.now() + skewSeconds * 1000;
}

function decodeBase64Url(value: string): string {
  const normalizedValue = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');

  if (typeof atob !== 'undefined') {
    const binaryValue = atob(normalizedValue);
    try {
      return decodeURIComponent(
        Array.from(binaryValue)
          .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
          .join('')
      );
    } catch {
      return binaryValue;
    }
  }

  return Buffer.from(normalizedValue, 'base64').toString('utf-8');
}
