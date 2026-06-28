export function hasHtmlMarkup(value: string | null | undefined): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(String(value || ''));
}

export function normalizeRichContentHtml(value: string | null | undefined): string {
  const raw = String(value || '');
  const decoded = raw
    .replace(/&amp;(lt|gt|quot|#39|apos|nbsp|ensp|emsp|thinsp|#160|#xa0);?/gi, (match: string) =>
      decodeNamedEntity(match.replace(/^&amp;/i, '&'))
    )
    .replace(/&(lt|gt|quot|#39|apos|nbsp|ensp|emsp|thinsp|#160|#xa0);?/gi, decodeNamedEntity);

  return decoded;
}

export function richContentPlainText(value: string | null | undefined): string {
  return normalizeRichContentHtml(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;(nbsp|ensp|emsp|thinsp|#160|#xa0);?/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&(nbsp|ensp|emsp|thinsp|#160|#xa0);?/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\u00a0/g, ' ');
}

function decodeNamedEntity(value: string): string {
  const normalized = value.toLowerCase().replace(/;$/, '');
  if (normalized === '&lt') {
    return '<';
  }
  if (normalized === '&gt') {
    return '>';
  }
  if (normalized === '&quot') {
    return '"';
  }
  if (normalized === '&#39' || normalized === '&apos') {
    return "'";
  }
  return ' ';
}

export function richTextWordCount(value: string | null | undefined): number {
  const text = richContentPlainText(value).replace(/\s+/g, ' ').trim();
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}
