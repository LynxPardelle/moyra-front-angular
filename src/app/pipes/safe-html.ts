import { Pipe, PipeTransform, SecurityContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

/**
 * Generated class for the SafeHtmlPipe pipe.
 *
 * See https://angular.io/api/core/Pipe for more info on Angular Pipes.
 */
@Pipe({
  name: 'safeHtml',
  standalone: true,
})
export class SafeHtmlPipe implements PipeTransform {

  constructor(private sanitizer: DomSanitizer) {}

  transform(html: any) {
    const sanitized = this.sanitizer.sanitize(
      SecurityContext.HTML,
      String(html || '')
    );
    return this.sanitizer.bypassSecurityTrustHtml(sanitized || '');
  }

}
