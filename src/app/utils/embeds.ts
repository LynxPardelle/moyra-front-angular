export type EmbedItem = {
  key: string;
  kind: 'iframe' | 'link' | 'youtube';
  original: string;
  title: string;
  allow?: string;
  embedUrl?: string;
  height?: number;
  sandbox?: string;
  url?: string;
};

type EmbedRule = {
  defaultHeight: number;
  hosts: string[];
  label: string;
  paths: RegExp[];
  transform?: (url: URL) => URL;
};

const DEFAULT_IFRAME_ALLOW = 'clipboard-write; encrypted-media; fullscreen; picture-in-picture; web-share';
const DEFAULT_IFRAME_SANDBOX = [
  'allow-forms',
  'allow-popups',
  'allow-popups-to-escape-sandbox',
  'allow-presentation',
  'allow-same-origin',
  'allow-scripts',
].join(' ');
const YOUTUBE_ALLOW =
  'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
const YOUTUBE_SANDBOX = [
  'allow-popups',
  'allow-popups-to-escape-sandbox',
  'allow-presentation',
  'allow-same-origin',
  'allow-scripts',
].join(' ');

const EMBED_RULES: EmbedRule[] = [
  {
    defaultHeight: 640,
    hosts: ['docs.google.com'],
    label: 'Google Forms',
    paths: [/^\/forms\//],
    transform: (url) => {
      const normalized = new URL(url.toString());
      normalized.searchParams.set('embedded', 'true');
      return normalized;
    },
  },
  {
    defaultHeight: 560,
    hosts: ['docs.google.com'],
    label: 'Google Docs',
    paths: [/^\/document\//, /^\/presentation\//, /^\/spreadsheets\//],
  },
  {
    defaultHeight: 560,
    hosts: ['drive.google.com'],
    label: 'Google Drive',
    paths: [/^\/file\/d\/[^/]+\/preview/, /^\/file\/d\/[^/]+\/view/],
    transform: (url) => {
      const match = url.pathname.match(/^\/file\/d\/([^/]+)/);
      return match ? new URL(`https://drive.google.com/file/d/${match[1]}/preview`) : url;
    },
  },
  {
    defaultHeight: 420,
    hosts: ['www.google.com', 'maps.google.com'],
    label: 'Google Maps',
    paths: [/^\/maps\/embed/],
  },
  {
    defaultHeight: 620,
    hosts: ['forms.office.com', 'forms.cloud.microsoft', 'forms.microsoft.com'],
    label: 'Microsoft Forms',
    paths: [/^\//],
  },
  {
    defaultHeight: 520,
    hosts: ['airtable.com'],
    label: 'Airtable',
    paths: [/^\/embed\//],
  },
  {
    defaultHeight: 520,
    hosts: ['calendly.com'],
    label: 'Calendly',
    paths: [/^\//],
  },
  {
    defaultHeight: 520,
    hosts: ['codepen.io'],
    label: 'CodePen',
    paths: [/\/embed\//],
  },
  {
    defaultHeight: 520,
    hosts: ['codesandbox.io'],
    label: 'CodeSandbox',
    paths: [/^\/embed\//, /^\/p\/sandbox\//],
  },
  {
    defaultHeight: 520,
    hosts: ['stackblitz.com'],
    label: 'StackBlitz',
    paths: [/^\/edit\//, /^\/github\//],
    transform: (url) => {
      const normalized = new URL(url.toString());
      normalized.searchParams.set('embed', '1');
      return normalized;
    },
  },
];

export function buildEmbedItems(values: Array<string | null | undefined>): EmbedItem[] {
  const seen = new Set<string>();
  const items: EmbedItem[] = [];

  for (const rawBlock of splitInsertionBlocks(values)) {
    const source = extractInsertionSource(rawBlock);
    if (!source || seen.has(source)) {
      continue;
    }

    const embedUrl = toYoutubeEmbedUrl(source);
    if (embedUrl) {
      if (seen.has(embedUrl)) {
        continue;
      }

      seen.add(embedUrl);
      items.push({
        allow: YOUTUBE_ALLOW,
        embedUrl,
        key: embedUrl,
        kind: 'youtube',
        original: source,
        sandbox: YOUTUBE_SANDBOX,
        title: 'Video de YouTube',
      });
      continue;
    }

    const iframe = toAllowedIframeEmbed(source, rawBlock);
    if (iframe) {
      const iframeUrl = iframe.embedUrl || '';
      if (!iframeUrl || seen.has(iframeUrl)) {
        continue;
      }

      seen.add(iframeUrl);
      items.push(iframe);
      continue;
    }

    if (isSafeHttpUrl(source)) {
      seen.add(source);
      items.push({
        key: source,
        kind: 'link',
        original: source,
        title: readableUrlTitle(source),
        url: source,
      });
    }
  }

  return items;
}

export function toYoutubeEmbedUrl(value: string | null | undefined): string | null {
  const source = extractInsertionSource(value || '');
  if (!source) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(source);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  let videoId = '';

  if (host === 'youtu.be') {
    videoId = url.pathname.split('/').filter(Boolean)[0] || '';
  }

  if (isYoutubeHost(host)) {
    const pathParts = url.pathname.split('/').filter(Boolean);
    if (url.pathname === '/watch') {
      videoId = url.searchParams.get('v') || '';
    } else if (
      pathParts[0] === 'embed' ||
      pathParts[0] === 'shorts' ||
      pathParts[0] === 'live' ||
      pathParts[0] === 'v'
    ) {
      videoId = pathParts[1] || '';
    }
  }

  if (!/^[a-zA-Z0-9_-]{6,20}$/.test(videoId)) {
    return null;
  }

  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}

export function toAllowedEmbedUrl(value: string | null | undefined): string | null {
  return toYoutubeEmbedUrl(value) || toAllowedIframeEmbed(value || '')?.embedUrl || null;
}

export function embedTrackKey(embed: EmbedItem, index: number = 0): string {
  return embed.key || embed.embedUrl || embed.url || embed.original || String(index);
}

function splitInsertionBlocks(values: Array<string | null | undefined>): string[] {
  const combined = values
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join('\n');
  const iframeBlocks: string[] = [];
  const textWithoutIframes = combined.replace(
    /<iframe[\s\S]*?(?:<\/iframe>|>)/gi,
    (match) => {
      iframeBlocks.push(match.trim());
      return '\n';
    }
  );
  const lines = textWithoutIframes
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return [...iframeBlocks, ...lines];
}

function extractInsertionSource(value: string): string {
  const normalized = value
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
  const iframeSource = normalized.match(/<iframe[^>]+src=(["']?)([^"'\s>]+)\1/i)?.[2];
  if (iframeSource) {
    return iframeSource.trim();
  }

  const urlSource = normalized.match(/https?:\/\/[^\s"'<>)]+/i)?.[0];
  return (urlSource || normalized).trim();
}

function toAllowedIframeEmbed(
  value: string | null | undefined,
  original: string = String(value || '')
): EmbedItem | null {
  const source = extractInsertionSource(String(value || ''));
  if (!source) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(source);
  } catch {
    return null;
  }

  if (url.protocol !== 'https:') {
    return null;
  }

  const rule = findEmbedRule(url);
  if (!rule) {
    return null;
  }

  const normalizedUrl = rule.transform ? rule.transform(url) : url;
  const iframeTitle = extractAttribute(original, 'title');
  const iframeHeight = clampEmbedHeight(
    Number(extractAttribute(original, 'height')),
    rule.defaultHeight
  );
  const embedUrl = normalizedUrl.toString();

  return {
    allow: DEFAULT_IFRAME_ALLOW,
    embedUrl,
    height: iframeHeight,
    key: embedUrl,
    kind: 'iframe',
    original: source,
    sandbox: DEFAULT_IFRAME_SANDBOX,
    title: iframeTitle || rule.label,
  };
}

function findEmbedRule(url: URL): EmbedRule | null {
  const host = url.hostname.toLowerCase();
  return (
    EMBED_RULES.find((rule) => {
      return rule.hosts.includes(host) && rule.paths.some((path) => path.test(url.pathname));
    }) || null
  );
}

function extractAttribute(value: string, attribute: string): string {
  const pattern = new RegExp(
    `${attribute}\\s*=\\s*(["'])(.*?)\\1|${attribute}\\s*=\\s*([^\\s>]+)`,
    'i'
  );
  const match = value.match(pattern);
  return match?.[2] || match?.[3] || '';
}

function clampEmbedHeight(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return Math.min(Math.max(Math.round(value), 320), 720);
}

function isYoutubeHost(host: string): boolean {
  return (
    host === 'youtube.com' ||
    host === 'youtube-nocookie.com' ||
    host.endsWith('.youtube.com') ||
    host.endsWith('.youtube-nocookie.com')
  );
}

function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function readableUrlTitle(value: string): string {
  try {
    const url = new URL(value);
    return url.hostname.replace(/^www\./, '') || value;
  } catch {
    return value;
  }
}
