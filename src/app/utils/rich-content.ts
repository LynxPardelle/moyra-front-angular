export function hasHtmlMarkup(value: string | null | undefined): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(String(value || ''));
}
