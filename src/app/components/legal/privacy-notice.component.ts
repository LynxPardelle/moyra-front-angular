import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

import { Main } from '../../models/main';
import { MainService } from '../../services/main.service';

@Component({
  selector: 'app-privacy-notice',
  imports: [CommonModule, RouterLink],
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

      <section class="privacy-section">
        <h2>Responsable y contacto</h2>
        <p>
          Montaño & Reyes Arrazola S.C. es responsable del tratamiento de los datos personales
          relacionados con sus servicios legales y canales digitales.
        </p>
        @if (main?.mail; as mail) {
        <p>
          Para ejercer derechos o realizar consultas de privacidad, escribe a
          <a [href]="'mailto:' + mail">{{ mail }}</a>.
        </p>
        }
      </section>

      <section class="privacy-section">
        <h2>Datos personales tratados</h2>
        <ul>
          <li>Datos de identificación y contacto proporcionados por clientes o interesados.</li>
          <li>Datos necesarios para prestar, documentar y dar seguimiento a servicios legales.</li>
          <li>
            Datos de acceso y actividad del portal Casos, incluyendo permisos, comentarios,
            archivos aportados por el usuario y acuses de lectura.
          </li>
          <li>Datos técnicos mínimos para seguridad, autenticación y operación del sitio.</li>
        </ul>
      </section>

      <section class="privacy-section">
        <h2>Finalidades</h2>
        <ul>
          <li>Atender solicitudes de contacto y prestación de servicios legales.</li>
          <li>Administrar usuarios, permisos y comunicación dentro del portal privado Casos.</li>
          <li>
            Enviar comunicaciones transaccionales relacionadas con invitaciones, comentarios,
            actualizaciones de caso, documentos visibles, estados y seguridad de la cuenta.
          </li>
          <li>Cumplir obligaciones legales, contractuales, administrativas y de seguridad.</li>
        </ul>
      </section>

      <section class="privacy-section">
        <h2>Comunicaciones transaccionales</h2>
        <p>
          Las notificaciones de Casos se envían únicamente a clientes, abogados, pasantes o
          personal autorizado dentro de un caso privado. No se usan listas compradas, envíos
          masivos, boletines ni campañas publicitarias.
        </p>
        <p>
          Los mensajes deben contener resúmenes seguros y enlaces al portal autenticado. Los
          documentos y detalles confidenciales se consultan dentro del caso con los permisos
          correspondientes.
        </p>
      </section>

      <section class="privacy-section">
        <h2>Transferencias y encargados</h2>
        <p>
          Podemos utilizar proveedores tecnológicos para alojamiento, autenticación, correo
          transaccional, almacenamiento y seguridad. Estos proveedores deben limitarse a prestar
          los servicios necesarios para operar el sitio y el portal privado.
        </p>
      </section>

      <section class="privacy-section">
        <h2>Derechos y actualizaciones</h2>
        <p>
          Puedes solicitar acceso, rectificación, cancelación u oposición respecto de tus datos
          personales a través del canal de contacto indicado. Este aviso puede actualizarse cuando
          cambien los servicios, obligaciones aplicables o controles de seguridad.
        </p>
        <a routerLink="/contacto" class="privacy-link">Ver canales de contacto</a>
      </section>
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

      .privacy-section {
        background: rgba(255, 255, 255, 0.76);
        border: 1px solid rgba(41, 48, 59, 0.12);
        margin-top: 1rem;
        padding: clamp(1rem, 3vw, 1.35rem);
      }

      .privacy-section h2 {
        color: #202631;
        font-size: 1.25rem;
        line-height: 1.2;
        margin: 0 0 0.9rem;
      }

      .privacy-section p {
        margin: 0.75rem 0 0;
      }

      .privacy-section ul {
        display: grid;
        gap: 0.65rem;
        margin: 0;
        padding-left: 1.1rem;
      }

      a,
      .privacy-link {
        color: #1f5eb8;
        font-weight: 700;
        text-decoration: none;
      }

      a:hover,
      .privacy-link:hover {
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
