import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';

import { CaseNotification, CaseRecord, CaseType, caseStatusLabel } from '../../models/case';
import { CaseService } from '../../services/case.service';
import { MainService } from '../../services/main.service';

@Component({
  selector: 'app-cases-list',
  imports: [CommonModule, RouterLink],
  template: `
    <main class="cases-page">
      <header class="cases-page__header">
        <div>
          <p class="cases-page__eyebrow">Portal privado</p>
          <h1>{{ text('casesListTitle', 'Casos') }}</h1>
        </div>
        <a routerLink="/notificaciones" class="cases-page__notifications">
          {{ text('casesNotificationsButtonLabel', 'Notificaciones') }}
        </a>
      </header>

      @if (loading) {
      <p class="cases-page__state">{{ text('casesListLoadingLabel', 'Cargando casos...') }}</p>
      } @else if (errorMessage) {
      <section class="cases-page__state">
        <p>{{ errorMessage }}</p>
        <button type="button" data-testid="cases-retry" (click)="load()">
          {{ text('casesRetryButtonLabel', 'Reintentar') }}
        </button>
      </section>
      } @else if (cases.length === 0) {
      <section class="cases-page__state">
        <h2>{{ text('casesEmptyTitle', 'No tienes casos asignados') }}</h2>
        <p>
          {{
            text(
              'casesEmptyMessage',
              'Cuando el despacho te agregue a un caso, aparecerá en esta sección.'
            )
          }}
        </p>
      </section>
      } @else {
      <section class="cases-list" [attr.aria-label]="text('casesAssignedLabel', 'Casos asignados')">
        @for (caseRecord of sortedCases(); track caseRecord.id) {
        <article class="case-row">
          <div>
            <p class="case-row__reference">{{ caseRecord.reference || caseRecord.id }}</p>
            <h2>{{ caseRecord.title }}</h2>
            <dl class="case-row__meta">
              <div>
                <dt>{{ text('casesStatusLabel', 'Estado') }}</dt>
                <dd>{{ statusName(caseRecord.statusId) }}</dd>
              </div>
              <div>
                <dt>{{ text('casesLastActivityLabel', 'Última actividad') }}</dt>
                <dd>{{ lastActivity(caseRecord) | date : 'dd/MM/yyyy HH:mm' }}</dd>
              </div>
              <div>
                <dt>{{ text('casesUnreadLabel', 'Novedades') }}</dt>
                <dd>
                  {{ unreadCount(caseRecord.id) }}
                  {{ text('casesUnreadSuffix', 'sin leer') }}
                </dd>
              </div>
            </dl>
          </div>
          <a [routerLink]="['/casos', caseRecord.id]">
            {{
              unreadCount(caseRecord.id) > 0
                ? text('casesReviewUpdatesButtonLabel', 'Revisar novedades')
                : text('casesOpenCaseButtonLabel', 'Abrir caso')
            }}
          </a>
        </article>
        }
      </section>
      }
    </main>
  `,
  styles: [
    `
      .cases-page {
        width: min(1120px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 24px 0 calc(var(--site-footer-offset, 76px) + 24px);
        color: #29303b;
      }

      .cases-page__header {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 16px;
        border-bottom: 1px solid rgba(41, 48, 59, 0.18);
        margin-bottom: 16px;
        padding-bottom: 12px;
      }

      .cases-page__eyebrow,
      .case-row__reference {
        margin: 0;
        color: #4b8ff5;
        font-size: 0.82rem;
        text-transform: uppercase;
      }

      .cases-page__notifications,
      .case-row a,
      button {
        border: 1px solid #4b8ff5;
        color: #4b8ff5;
        background: #ffffff;
        text-decoration: none;
        padding: 8px 12px;
      }

      .cases-page__state,
      .case-row {
        border: 1px solid rgba(41, 48, 59, 0.18);
        padding: 16px;
        background: #ffffff;
      }

      .cases-list {
        display: grid;
        gap: 12px;
      }

      .case-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      .case-row h2 {
        font-size: 1.2rem;
        margin: 4px 0 10px;
      }

      .case-row__meta {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        margin: 0;
      }

      .case-row__meta dt {
        color: rgba(41, 48, 59, 0.68);
        font-size: 0.76rem;
      }

      .case-row__meta dd {
        margin: 0;
      }

      @media (max-width: 720px) {
        .cases-page__header,
        .case-row {
          align-items: stretch;
          flex-direction: column;
        }
      }
    `,
  ],
})
export class CasesListComponent implements OnInit {
  cases: CaseRecord[] = [];
  caseTypes: CaseType[] = [];
  notifications: CaseNotification[] = [];
  main: any = null;
  loading = false;
  errorMessage = '';

  constructor(
    private _caseService: CaseService,
    private _mainService: MainService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      main: this._mainService
        .getMain()
        .pipe(catchError(() => of({ main: null }))),
      cases: this._caseService.listCases(),
      caseTypes: this._caseService
        .listCaseTypes()
        .pipe(catchError(() => of({ status: 'success', items: [], nextToken: null }))),
      notifications: this._caseService
        .listNotifications()
        .pipe(catchError(() => of({ status: 'success', items: [], nextToken: null }))),
    }).subscribe({
      next: ({ main, cases, caseTypes, notifications }) => {
        this.main = main?.main || null;
        this.cases = cases.items || [];
        this.caseTypes = caseTypes.items || [];
        this.notifications = notifications.items || [];
        this.loading = false;
      },
      error: () => {
        this.cases = [];
        this.caseTypes = [];
        this.notifications = [];
        this.loading = false;
        this.errorMessage = this.text('casesListErrorMessage', 'No se pudieron cargar tus casos');
      },
    });
  }

  sortedCases(): CaseRecord[] {
    return [...this.cases].sort(
      (left, right) =>
        Date.parse(this.lastActivity(right)) - Date.parse(this.lastActivity(left))
    );
  }

  unreadCount(caseId: string): number {
    return this.notifications.filter(
      (notification) => notification.caseId === caseId && !notification.readAt
    ).length;
  }

  lastActivity(caseRecord: CaseRecord): string {
    return caseRecord.lastActivityAt || caseRecord.updatedAt || caseRecord.createdAt || '';
  }

  statusName(statusId: string): string {
    const status = this.caseTypes
      .flatMap((caseType) => caseType.statuses || [])
      .find((candidate) => candidate.id === statusId);
    return status ? caseStatusLabel(status) : statusId;
  }

  text(key: string, fallback: string): string {
    const value = this.main?.pageTexts?.[key];
    return typeof value === 'string' && value.trim() ? value : fallback;
  }
}
