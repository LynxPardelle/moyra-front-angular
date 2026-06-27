import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  CaseNotificationPreferences,
  UpdateCaseNotificationPreferencesRequest,
} from '../../models/case';
import { CaseService } from '../../services/case.service';
import { CaseWebPushService } from './case-web-push.service';

@Component({
  selector: 'app-notification-preferences',
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="notification-preferences">
      <a routerLink="/notificaciones" class="notification-preferences__back">Notificaciones</a>
      <header class="notification-preferences__header">
        <p>Preferencias privadas</p>
        <h1>Preferencias de notificación</h1>
      </header>

      @if (loading) {
      <p class="notification-preferences__panel">Cargando preferencias...</p>
      } @else if (preferences) {
      <section class="notification-preferences__panel">
        <h2>Correo electrónico</h2>
        @if (!preferences.email.available) {
        <p>El canal de correo no está disponible todavía.</p>
        } @else {
        <label>
          <input type="checkbox" [(ngModel)]="preferences.email.enabled" />
          Recibir correos
        </label>
        <label>
          <input type="checkbox" [(ngModel)]="preferences.email.entryCreated" />
          Actualizaciones nuevas
        </label>
        <label>
          <input type="checkbox" [(ngModel)]="preferences.email.commentCreated" />
          Comentarios nuevos
        </label>
        <label>
          <input type="checkbox" [(ngModel)]="preferences.email.fileVisibilityApproved" />
          Documentos aprobados
        </label>
        <label>
          <input type="checkbox" [(ngModel)]="preferences.email.statusChanged" />
          Cambios de estado
        </label>
        }
      </section>

      <section class="notification-preferences__panel">
        <h2>Push del navegador</h2>
        @if (!preferences.webPush.available || !browserPushSupported()) {
        <p>Push del navegador no está disponible para este entorno.</p>
        } @else if (preferences.webPush.enabled) {
        <p>Push del navegador está activado.</p>
        <button type="button" (click)="disablePush()">Desactivar push</button>
        } @else {
        <p>El navegador pedirá permiso sólo cuando actives esta opción.</p>
        <button type="button" (click)="enablePush()">Activar push</button>
        }
      </section>

      @if (errorMessage) {
      <p class="notification-preferences__error">{{ errorMessage }}</p>
      }
      @if (successMessage) {
      <p class="notification-preferences__success">{{ successMessage }}</p>
      }
      <button type="button" (click)="savePreferences()" [disabled]="saving">
        Guardar preferencias
      </button>
      }
    </main>
  `,
  styles: [
    `
      .notification-preferences {
        width: min(920px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 24px 0;
        color: #29303b;
      }

      .notification-preferences__back {
        color: #4b8ff5;
        text-decoration: none;
      }

      .notification-preferences__header,
      .notification-preferences__panel {
        border: 1px solid rgba(41, 48, 59, 0.18);
        background: #ffffff;
        padding: 16px;
        margin-top: 12px;
      }

      .notification-preferences__header p {
        margin: 0;
        color: #4b8ff5;
        text-transform: uppercase;
        font-size: 0.82rem;
      }

      label {
        display: block;
        margin: 10px 0;
      }

      button {
        border: 1px solid #4b8ff5;
        background: #ffffff;
        color: #4b8ff5;
        margin-top: 12px;
        padding: 8px 12px;
      }

      button:not(:disabled):hover,
      button:not(:disabled):focus-visible,
      .notification-preferences__back:hover,
      .notification-preferences__back:focus-visible {
        background: #4b8ff5;
        color: #ffffff;
        outline: 0;
      }

      .notification-preferences__error {
        color: #b42318;
      }

      .notification-preferences__success {
        color: #26734d;
      }
    `,
  ],
})
export class NotificationPreferencesComponent implements OnInit {
  preferences: CaseNotificationPreferences | null = null;
  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private _caseService: CaseService,
    private _webPush: CaseWebPushService
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this._caseService.getNotificationPreferences().subscribe({
      next: (response) => {
        this.preferences = response.item;
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'No se pudieron cargar las preferencias.';
        this.loading = false;
      },
    });
  }

  browserPushSupported(): boolean {
    return this._webPush.isBrowserPushSupported();
  }

  savePreferences(): void {
    if (!this.preferences) {
      return;
    }
    this.save(this.preferenceRequest());
  }

  async enablePush(): Promise<void> {
    if (!this.preferences) {
      return;
    }
    this.errorMessage = '';
    try {
      await this._webPush.enableBrowserPush();
      this.preferences.webPush.enabled = true;
      this.save(this.preferenceRequest());
    } catch {
      this.errorMessage = 'No se pudo activar push del navegador.';
    }
  }

  async disablePush(): Promise<void> {
    if (!this.preferences) {
      return;
    }
    this.errorMessage = '';
    try {
      await this._webPush.disableBrowserPush();
      this.preferences.webPush.enabled = false;
      this.save(this.preferenceRequest());
    } catch {
      this.errorMessage = 'No se pudo desactivar push del navegador.';
    }
  }

  private save(body: UpdateCaseNotificationPreferencesRequest): void {
    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';
    this._caseService.updateNotificationPreferences(body).subscribe({
      next: (response) => {
        this.preferences = response.item;
        this.successMessage = 'Preferencias guardadas.';
        this.saving = false;
      },
      error: () => {
        this.errorMessage = 'No se pudieron guardar las preferencias.';
        this.saving = false;
      },
    });
  }

  private preferenceRequest(): UpdateCaseNotificationPreferencesRequest {
    const preferences = this.preferences!;
    return {
      email: {
        enabled: preferences.email.enabled,
        entryCreated: preferences.email.entryCreated,
        commentCreated: preferences.email.commentCreated,
        fileVisibilityApproved: preferences.email.fileVisibilityApproved,
        statusChanged: preferences.email.statusChanged,
      },
      webPush: {
        enabled: preferences.webPush.enabled,
      },
    };
  }
}
