import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { toAllowedEmbedUrl } from '../utils/embeds';

@Pipe({
  name: 'safeEmbedUrl',
  standalone: true,
})
export class SafeEmbedUrlPipe implements PipeTransform {
  private readonly cache = new Map<string, SafeResourceUrl>();

  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string | null | undefined): SafeResourceUrl | null {
    const embedUrl = toAllowedEmbedUrl(value);
    if (!embedUrl) {
      return null;
    }

    const cached = this.cache.get(embedUrl);
    if (cached) {
      return cached;
    }

    const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
    this.cache.set(embedUrl, safeUrl);
    return safeUrl;
  }
}
