import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

import { Main } from '../../models/main';
import { MainService } from '../../services/main.service';
import { SafeRichHtmlPipe } from '../../pipes/safe-rich-html';
import { DEFAULT_PRIVACY_NOTICE_BODY_HTML } from '../../utils/privacy-notice-content';

@Component({
  selector: 'app-privacy-notice',
  imports: [CommonModule, SafeRichHtmlPipe],
  template: `
    <main class="privacy-page">
      <header class="privacy-hero">
        <p class="privacy-hero__eyebrow">Montaño & Reyes Arrazola S.C.</p>
        <h1>Aviso de privacidad</h1>
        <p>
          Este aviso describe el tratamiento de datos personales en el sitio moyra.org y en el
          portal privado Casos. Última actualización: 21 de junio de 2026.
        </p>
      </header>

      <section class="privacy-content" [innerHTML]="noticeBodyHtml() | safeRichHtml"></section>
    </main>
  `,
  styles: [
    `
      .privacy-page {
        color: #29303b;
        margin: 0 auto;
        max-width: 980px;
        padding: 1rem clamp(1rem, 3vw, 2rem) 2.75rem;
      }

      .privacy-hero {
        border-bottom: 1px solid rgba(41, 48, 59, 0.14);
        margin-bottom: 1rem;
        padding: 1rem 0 1.35rem;
      }

      .privacy-hero__eyebrow {
        color: #4b8ff5;
        font-size: 0.78rem;
        font-weight: 750;
        letter-spacing: 0;
        margin: 0 0 0.55rem;
        text-transform: uppercase;
      }

      h1 {
        color: #202631;
        font-size: clamp(2rem, 4.5vw, 3.25rem);
        line-height: 1.05;
        margin: 0;
        overflow-wrap: anywhere;
      }

      .privacy-hero p,
      .privacy-section p,
      .privacy-section li {
        color: rgba(41, 48, 59, 0.76);
        line-height: 1.72;
      }

      .privacy-hero p {
        margin: 1rem 0 0;
      }

      .privacy-content {
        background: rgba(255, 255, 255, 0.76);
        border: 1px solid rgba(41, 48, 59, 0.12);
        margin-top: 1rem;
        padding: clamp(1rem, 3vw, 1.35rem);
      }

      :host ::ng-deep .privacy-content h2 {
        color: #202631;
        font-size: 1.25rem;
        line-height: 1.2;
        margin: 1.6rem 0 0.9rem;
      }

      :host ::ng-deep .privacy-content h2:first-child {
        margin-top: 0;
      }

      :host ::ng-deep .privacy-content p {
        margin: 0.75rem 0 0;
      }

      :host ::ng-deep .privacy-content ul {
        display: grid;
        gap: 0.65rem;
        margin: 0.75rem 0 0;
        padding-left: 1.1rem;
      }

      :host ::ng-deep .privacy-content a {
        color: #1f5eb8;
        font-weight: 700;
        text-decoration: none;
      }

      :host ::ng-deep .privacy-content a:hover {
        color: #4b8ff5;
      }
    `,
  ],
})
export class PrivacyNoticeComponent implements OnInit {
  main: Main | null = null;

  constructor(
    private _mainService: MainService,
    private _title: Title,
    private _meta: Meta
  ) {}

  ngOnInit(): void {
    this.setSeo();
    this._mainService.getMain().subscribe({
      next: (response) => {
        this.main = response?.main || null;
      },
      error: () => {
        this.main = null;
      },
    });
  }

  noticeBodyHtml(): string {
    const value = this.main?.pageTexts?.['privacyNoticeBodyHtml'];
    return typeof value === 'string' && value.trim()
      ? value
      : DEFAULT_PRIVACY_NOTICE_BODY_HTML;
  }

  private setSeo(): void {
    const title = 'Aviso de privacidad | Montaño & Reyes Arrazola S.C.';
    const description =
      'Aviso de privacidad para el sitio moyra.org y las comunicaciones transaccionales del portal privado Casos.';

    this._title.setTitle(title);
    this._meta.updateTag({ name: 'description', content: description });
    this._meta.updateTag({ property: 'og:title', content: title });
    this._meta.updateTag({ property: 'og:description', content: description });
    this._meta.updateTag({ name: 'twitter:title', content: title });
    this._meta.updateTag({ name: 'twitter:description', content: description });
  }
}
