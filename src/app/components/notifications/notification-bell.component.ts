import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';

import { CaseService } from '../../services/case.service';

@Component({
  selector: 'app-notification-bell',
  imports: [CommonModule, RouterLink],
  template: `
    <a
      routerLink="/notificaciones"
      href="/notificaciones"
      class="notification-bell"
      [attr.data-bs-dismiss]="dismissOffcanvas ? 'offcanvas' : null"
    >
      <span class="notification-bell__label">Notificaciones</span>
      @if (unreadCount !== null && unreadCount > 0) {
      <span class="notification-bell__badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
      }
    </a>
  `,
  styles: [
    `
      .notification-bell {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: inherit;
        text-decoration: none;
      }

      .notification-bell__badge {
        align-items: center;
        background: #4b8ff5;
        border: 2px solid #ffffff;
        border-radius: 999px !important;
        box-shadow: 0 6px 14px rgba(41, 48, 59, 0.18);
        color: #ffffff;
        display: inline-flex;
        font-size: 0.76rem;
        font-weight: 800;
        justify-content: center;
        line-height: 1;
        min-height: 22px;
        min-width: 22px;
        padding: 2px 6px;
        text-align: center;
      }
    `,
  ],
})
export class NotificationBellComponent implements OnInit {
  @Input() dismissOffcanvas = false;

  unreadCount: number | null = null;

  constructor(private _caseService: CaseService) {}

  ngOnInit(): void {
    this._caseService
      .getUnreadNotificationCount()
      .pipe(catchError(() => of({ status: 'error', count: 0 })))
      .subscribe((response) => {
        this.unreadCount = response.status === 'success' ? response.count : null;
      });
  }
}
