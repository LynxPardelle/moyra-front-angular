import { SecurityContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';

import { SafeRichHtmlPipe } from './safe-rich-html';

describe('SafeRichHtmlPipe', () => {
  let sanitizer: DomSanitizer;
  let pipe: SafeRichHtmlPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    sanitizer = TestBed.inject(DomSanitizer);
    pipe = new SafeRichHtmlPipe(sanitizer);
  });

  it('normalizes escaped rich text before sanitizing it', () => {
    const safe = pipe.transform('&lt;p&gt;&lt;em&gt;Aviso&lt;/em&gt;&lt;/p&gt;');

    expect(sanitizer.sanitize(SecurityContext.HTML, safe)).toBe('<p><em>Aviso</em></p>');
  });

  it('keeps unsafe scripts out after normalization', () => {
    const safe = pipe.transform('&lt;script&gt;alert(1)&lt;/script&gt;&lt;p&gt;Texto&lt;/p&gt;');

    expect(sanitizer.sanitize(SecurityContext.HTML, safe)).toBe('<p>Texto</p>');
  });
});
