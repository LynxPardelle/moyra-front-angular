import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';

import { CaseService } from '../../services/case.service';

@Component({
  selector: 'app-notification-bell',
  imports: [CommonModule, RouterLink],
  template: `
    <a routerLink="/notificaciones" href="/notificaciones" class="notification-bell">
      Notificaciones
      @if (unreadCount !== null && unreadCount > 0) {
      <span>{{ unreadCount }}</span>
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

      .notification-bell span {
        min-width: 22px;
        border: 1px solid currentColor;
        padding: 1px 6px;
        text-align: center;
        font-size: 0.82rem;
      }
    `,
  ],
})
export class NotificationBellComponent implements OnInit {
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
