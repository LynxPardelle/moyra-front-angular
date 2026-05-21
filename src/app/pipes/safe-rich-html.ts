import { Pipe, PipeTransform, SecurityContext } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'safeRichHtml',
  standalone: true,
})
export class SafeRichHtmlPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(html: string | null | undefined): SafeHtml {
    const sanitized = this.sanitizer.sanitize(
      SecurityContext.HTML,
      String(html || '')
    );
    return this.sanitizer.bypassSecurityTrustHtml(sanitized || '');
  }
}
