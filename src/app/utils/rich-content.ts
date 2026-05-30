export function hasHtmlMarkup(value: string | null | undefined): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(String(value || ''));
}

export function richContentPlainText(value: string | null | undefined): string {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(nbsp|ensp|emsp|thinsp|#160|#xa0);/gi, ' ')
    .replace(/\u00a0/g, ' ');
}

export function richTextWordCount(value: string | null | undefined): number {
  const text = richContentPlainText(value).replace(/\s+/g, ' ').trim();
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}
