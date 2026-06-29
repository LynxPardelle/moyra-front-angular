import { DomSanitizer } from '@angular/platform-browser';

import { SafeHtmlPipe } from './safe-html';

describe('SafeHtmlPipe', () => {
  it('normalizes escaped rich HTML before sanitizing', () => {
    const sanitizer = jasmine.createSpyObj<DomSanitizer>('DomSanitizer', [
      'sanitize',
      'bypassSecurityTrustHtml',
    ]);
    sanitizer.sanitize.and.callFake((_, value) => String(value));
    sanitizer.bypassSecurityTrustHtml.and.callFake((value) => value as never);

    const result = new SafeHtmlPipe(sanitizer).transform(
      '&lt;p&gt;Texto&nbsp;legal&lt;/p&gt;'
    );

    expect(result).toBe('<p>Texto legal</p>');
  });
});
