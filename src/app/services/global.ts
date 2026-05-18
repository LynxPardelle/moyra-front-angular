import { environment } from '../../environments/environment';

type RuntimeProcess = {
  env?: Record<string, string | undefined>;
};

type RuntimeGlobal = typeof globalThis & {
  process?: RuntimeProcess;
};

const STAGING_HOSTS = new Set(['cloud.moyra.org']);
const STAGING_API_BASE_URL = 'https://api-cloud.moyra.org/api/v2';

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function trimSlashes(value: string): string {
  return value.replace(/^\/+/, '').replace(/\/+$/, '');
}

function runtimeEnv(name: string): string | undefined {
  const runtimeGlobal = globalThis as RuntimeGlobal;
  const value = runtimeGlobal.process?.env?.[name];
  return value && value.trim() !== '' ? value.trim() : undefined;
}

function browserHost(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.location.hostname;
}

function resolveApiBaseUrl(): string {
  const configuredUrl =
    runtimeEnv('MOYRA_API_BASE_URL') ||
    runtimeEnv('API_BASE_URL') ||
    runtimeEnv('PUBLIC_API_BASE_URL');

  if (configuredUrl) {
    return trimTrailingSlash(configuredUrl);
  }

  const host = browserHost();
  if (host && STAGING_HOSTS.has(host)) {
    return STAGING_API_BASE_URL;
  }

  return trimTrailingSlash(environment.apiBaseUrl);
}

const web = resolveApiBaseUrl();

export const ApiRuntime = {
  url: web,
  isV2: /\/api\/v2$/.test(web),
};

export const Global = {
  url: web,
};

export const GlobalArticle = {
  url: legacyScopedUrl('article'),
};

export const GlobalMain = {
  url: legacyScopedUrl('main'),
};

export const GlobalPublication = {
  url: legacyScopedUrl('publication'),
};

export const GlobalServicio = {
  url: legacyScopedUrl('servicio'),
};

export const GlobalUser = {
  url: legacyScopedUrl('user'),
};

export function apiUrl(path: string): string {
  return `${web}/${trimSlashes(path)}`;
}

export function legacyScopedUrl(scope: string): string {
  return `${web}/${trimSlashes(scope)}/`;
}

export function jsonAuthHeaders(token: string | null | undefined): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = token;
  }

  return headers;
}

export function storedToken(): string | null {
  if (typeof localStorage !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      return token;
    }
  }

  if (typeof sessionStorage !== 'undefined') {
    return sessionStorage.getItem('token');
  }

  return null;
}

export function toApiPayload(
  value: any,
  fileFields: string[] = [],
  listFields: string[] = []
): any {
  if (!value || typeof value !== 'object') {
    return value;
  }

  const payload = Object.entries(value).reduce((nextPayload: any, [key, fieldValue]) => {
    if (key === '_id' || key === 'publicUrl' || key === 'url') {
      return nextPayload;
    }

    if (fileFields.includes(key)) {
      nextPayload[key] = toReferenceId(fieldValue);
      return nextPayload;
    }

    if (listFields.includes(key) && Array.isArray(fieldValue)) {
      nextPayload[key] = fieldValue.map(toReferenceId).filter(Boolean);
      return nextPayload;
    }

    nextPayload[key] = fieldValue;
    return nextPayload;
  }, {});

  if (payload.urltitle && !payload.slug) {
    payload.slug = payload.urltitle;
  }

  return payload;
}

export function toLegacyEntity<T = any>(value: any): T {
  if (Array.isArray(value)) {
    return value.map((item) => toLegacyEntity(item)) as T;
  }

  if (!value || typeof value !== 'object') {
    return value as T;
  }

  const clone: any = { ...value };
  if (clone.id && !clone._id) {
    clone._id = clone.id;
  }

  if (clone.slug && !clone.urltitle) {
    clone.urltitle = clone.slug;
  }

  for (const field of ['logo', 'mainImg', 'seoImg', 'photo', 'mainFile']) {
    if (clone[field]) {
      clone[field] = toLegacyFile(clone[field]);
    }
  }

  if (Array.isArray(clone.files)) {
    clone.files = clone.files.map((file: any) => toLegacyFile(file));
  }

  if (Array.isArray(clone.sections)) {
    clone.sections = clone.sections.map((section: any) => toLegacyEntity(section));
  }

  return clone as T;
}

export function toLegacyFile(value: any): any {
  if (!value || typeof value !== 'object') {
    return value;
  }

  const file = { ...value };
  if (file.id && !file._id) {
    file._id = file.id;
  }

  if (!file.publicUrl) {
    file.publicUrl = resolveFileUrl(file);
  }

  return file;
}

function toReferenceId(value: any): string | null {
  if (typeof value === 'string') {
    return value;
  }

  if (value && typeof value === 'object') {
    return value.id || value._id || value.file || null;
  }

  return null;
}

function resolveFileUrl(file: any): string {
  if (typeof file.url === 'string' && file.url !== '') {
    return absoluteApiUrl(file.url);
  }

  if (ApiRuntime.isV2 && file.category && file.location) {
    return apiUrl(`/files/${file.category}/${encodeURIComponent(file.location)}`);
  }

  return '';
}

function absoluteApiUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  const originMatch = web.match(/^(https?:\/\/[^/]+)/i);
  const origin = originMatch ? originMatch[1] : '';
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;

  return `${origin}${path}`;
}
