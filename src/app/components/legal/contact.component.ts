import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

import { Main } from '../../models/main';
import { MainService } from '../../services/main.service';

@Component({
  selector: 'app-contact',
  imports: [CommonModule, RouterLink],
  template: `
    <main class="legal-page">
      <section class="legal-page__hero">
        <p class="legal-page__eyebrow">Montaño & Reyes Arrazola S.C.</p>
        <h1>Contacto</h1>
        <p>
          Para comunicación general con el despacho, utiliza los canales oficiales. Para asuntos
          activos del portal Casos, ingresa con tu cuenta y revisa el caso correspondiente.
        </p>
      </section>

      <section class="legal-panel" aria-label="Canales de contacto">
        <h2>Canales oficiales</h2>
        <dl class="contact-list">
          @if (main?.mail; as mail) {
          <div>
            <dt>Correo</dt>
            <dd>
              <a [href]="'mailto:' + mail">{{ mail }}</a>
            </dd>
          </div>
          }

          @if (main?.phoneNumber; as phoneNumber) {
          <div>
            <dt>Teléfono</dt>
            <dd>
              <a [href]="telUrl(phoneNumber)">{{ phoneNumber }}</a>
            </dd>
          </div>
          }

          @if (main?.whatsApp; as whatsApp) {
          <div>
            <dt>WhatsApp</dt>
            <dd>
              <a [href]="whatsAppUrl(whatsApp)" target="_blank" rel="noopener noreferrer">
                {{ whatsApp }}
              </a>
            </dd>
          </div>
          }
        </dl>
      </section>

      <section class="legal-panel">
        <h2>Comunicaciones de Casos</h2>
        <p>
          Las invitaciones, comentarios, actualizaciones y avisos de estado del portal Casos son
          comunicaciones transaccionales para usuarios invitados. Estos mensajes no son boletines,
          publicidad ni campañas masivas.
        </p>
        <p>
          Las notificaciones deben incluir solo resúmenes seguros y enlaces al portal autenticado;
          los documentos y detalles confidenciales se consultan dentro del caso privado.
        </p>
        <a routerLink="/aviso-de-privacidad" class="legal-link">Ver aviso de privacidad</a>
      </section>
    </main>
  `,
  styles: [
    `
      .legal-page {
        color: #29303b;
        margin: 0 auto;
        max-width: 980px;
        padding: 1rem clamp(1rem, 3vw, 2rem) 2.75rem;
      }

      .legal-page__hero {
        border-bottom: 1px solid rgba(41, 48, 59, 0.14);
        margin-bottom: 1rem;
        padding: 1rem 0 1.35rem;
      }

      .legal-page__eyebrow {
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

      .legal-page__hero p,
      .legal-panel p {
        color: rgba(41, 48, 59, 0.76);
        line-height: 1.72;
        margin: 1rem 0 0;
      }

      .legal-panel {
        background: rgba(255, 255, 255, 0.76);
        border: 1px solid rgba(41, 48, 59, 0.12);
        margin-top: 1rem;
        padding: clamp(1rem, 3vw, 1.35rem);
      }

      .legal-panel h2 {
        color: #202631;
        font-size: 1.25rem;
        line-height: 1.2;
        margin: 0 0 0.9rem;
      }

      .contact-list {
        display: grid;
        gap: 0.85rem;
        margin: 0;
      }

      .contact-list div {
        border-left: 3px solid #4b8ff5;
        padding-left: 0.85rem;
      }

      .contact-list dt {
        color: rgba(41, 48, 59, 0.62);
        font-size: 0.78rem;
        font-weight: 700;
        text-transform: uppercase;
      }

      .contact-list dd {
        margin: 0.25rem 0 0;
      }

      a,
      .legal-link {
        color: #1f5eb8;
        font-weight: 700;
        text-decoration: none;
      }

      a:hover,
      .legal-link:hover {
        color: #4b8ff5;
      }
    `,
  ],
})
export class ContactComponent implements OnInit {
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

  telUrl(value: string): string {
    return `tel:${this.onlyDigits(value)}`;
  }

  whatsAppUrl(value: string): string {
    return `https://wa.me/+521${this.onlyDigits(value)}`;
  }

  private onlyDigits(value: string): string {
    return String(value || '').replace(/\D+/g, '');
  }

  private setSeo(): void {
    const title = 'Contacto | Montaño & Reyes Arrazola S.C.';
    const description =
      'Canales oficiales de contacto de Montaño & Reyes Arrazola S.C. y comunicación transaccional del portal Casos.';

    this._title.setTitle(title);
    this._meta.updateTag({ name: 'description', content: description });
    this._meta.updateTag({ property: 'og:title', content: title });
    this._meta.updateTag({ property: 'og:description', content: description });
    this._meta.updateTag({ name: 'twitter:title', content: title });
    this._meta.updateTag({ name: 'twitter:description', content: description });
  }
}
