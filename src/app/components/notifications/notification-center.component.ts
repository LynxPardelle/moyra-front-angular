import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CaseNotification } from '../../models/case';
import { CaseService } from '../../services/case.service';

@Component({
  selector: 'app-notification-center',
  imports: [CommonModule, RouterLink],
  template: `
    <main class="notification-center">
      <header class="notification-center__header">
        <div>
          <p>Centro privado</p>
          <h1>Notificaciones</h1>
        </div>
        <div class="notification-center__actions">
          <a routerLink="/notificaciones/preferencias" href="/notificaciones/preferencias">
            Preferencias
          </a>
          <button type="button" (click)="markAllRead()" [disabled]="notifications.length === 0">
            Marcar todas como leídas
          </button>
        </div>
      </header>

      @if (loading) {
      <p class="notification-center__state">Cargando notificaciones...</p>
      } @else if (notifications.length === 0) {
      <p class="notification-center__state">No tienes notificaciones.</p>
      } @else {
      <section class="notification-list">
        @for (notification of notifications; track notification.id) {
        <article class="notification-item" [class.notification-item--unread]="!notification.readAt">
          <div>
            <span>{{ notification.readAt ? 'Leída' : 'Sin leer' }}</span>
            <h2>{{ notification.title }}</h2>
            <p>{{ notification.body }}</p>
          </div>
          <div class="notification-item__actions">
            <a [routerLink]="safePath(notification)" [href]="safePath(notification)">
              Ir al caso
            </a>
            @if (!notification.readAt) {
            <button type="button" (click)="markRead(notification.id)">Marcar leída</button>
            }
          </div>
        </article>
        }
      </section>
      }
    </main>
  `,
  styles: [
    `
      .notification-center {
        width: min(1120px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 24px 0;
        color: #29303b;
      }

      .notification-center__header,
      .notification-center__state,
      .notification-item {
        border: 1px solid rgba(41, 48, 59, 0.18);
        background: #ffffff;
        padding: 16px;
      }

      .notification-center__header {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 16px;
      }

      .notification-center__header p,
      .notification-item span {
        margin: 0;
        color: #4b8ff5;
        text-transform: uppercase;
        font-size: 0.82rem;
      }

      .notification-list {
        display: grid;
        gap: 12px;
      }

      .notification-item {
        display: flex;
        justify-content: space-between;
        gap: 16px;
      }

      .notification-item--unread {
        border-left: 4px solid #4b8ff5;
      }

      .notification-item h2 {
        margin: 4px 0 8px;
        font-size: 1.1rem;
      }

      .notification-center__actions,
      .notification-item__actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-content: start;
      }

      button,
      a {
        border: 1px solid #4b8ff5;
        background: #ffffff;
        color: #4b8ff5;
        padding: 8px 12px;
        text-decoration: none;
      }

      @media (max-width: 760px) {
        .notification-center__header,
        .notification-item {
          align-items: stretch;
          flex-direction: column;
        }
      }
    `,
  ],
})
export class NotificationCenterComponent implements OnInit {
  notifications: CaseNotification[] = [];
  loading = false;

  constructor(private _caseService: CaseService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this._caseService.listNotifications().subscribe({
      next: (response) => {
        this.notifications = response.items || [];
        this.loading = false;
      },
      error: () => {
        this.notifications = [];
        this.loading = false;
      },
    });
  }

  markRead(notificationId: string): void {
    this._caseService.markNotificationRead(notificationId).subscribe((response) => {
      this.notifications = this.notifications.map((notification) =>
        notification.id === notificationId ? response.item : notification
      );
    });
  }

  markAllRead(): void {
    this._caseService.markAllNotificationsRead().subscribe(() => {
      const readAt = new Date().toISOString();
      this.notifications = this.notifications.map((notification) => ({
        ...notification,
        readAt: notification.readAt || readAt,
      }));
    });
  }

  safePath(notification: CaseNotification): string {
    const path = notification.link?.path || '';
    if (path.startsWith('/casos/')) {
      return path;
    }
    return `/casos/${encodeURIComponent(notification.caseId)}`;
  }
}
