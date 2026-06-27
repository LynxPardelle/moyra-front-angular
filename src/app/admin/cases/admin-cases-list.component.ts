import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';

import {
  CaseOperationsSummary,
  CaseRecord,
  CaseStatusDefinition,
  CaseType,
  caseStatusLabel,
} from '../../models/case';
import { CaseService } from '../../services/case.service';
import { roleFromIdentity } from '../../services/global';
import { UserService } from '../../services/user.service';
import { AuthFacade } from '../../store/auth/auth.facade';

type NewCaseForm = {
  title: string;
  reference: string;
  description: string;
  caseTypeId: string;
  statusId: string;
  attorneyUserId: string;
  newAttorneyEmail: string;
  newAttorneyName: string;
};

type PlatformUser = {
  id?: string;
  _id?: string;
  sub?: string;
  name?: string;
  displayName?: string;
  email?: string;
  role?: string;
};

@Component({
  selector: 'app-admin-cases-list',
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="admin-cases-page">
      <header class="admin-cases-page__header">
        <div>
          <p class="admin-cases-page__eyebrow">Operación legal</p>
          <h1>Casos</h1>
        </div>
        <a routerLink="/admin/casos/configuracion" class="admin-cases-page__action">
          Configuración
        </a>
      </header>

      @if (operationsSummary) {
      <section class="admin-cases-ops" aria-label="Resumen operativo de casos">
        <div>
          <span>Activos</span>
          <strong>{{ operationsSummary.cases.active }}</strong>
        </div>
        <div>
          <span>Archivo pendiente</span>
          <strong>{{ operationsSummary.files.pendingExternalReview }}</strong>
        </div>
        <div>
          <span>Carga pendiente</span>
          <strong>{{ operationsSummary.files.pendingUpload }}</strong>
        </div>
        <div>
          <span>Notificaciones móviles fallidas</span>
          <strong>{{ operationsSummary.notifications.webPush['failed'] || 0 }}</strong>
        </div>
      </section>
      }

      <form class="admin-cases-create" (ngSubmit)="createCase()">
        <label>
          Título del caso
          <input name="title" [(ngModel)]="newCase.title" />
        </label>
        <label>
          Referencia
          <input name="reference" [(ngModel)]="newCase.reference" />
          <small class="admin-cases-create__field-help">
            Identificador interno del despacho: expediente, cliente, folio o clave que ayude a ubicar
            el caso.
          </small>
        </label>
        <label>
          Tipo
          <select name="caseTypeId" [(ngModel)]="newCase.caseTypeId">
            <option value="">Selecciona un tipo</option>
            @for (caseType of caseTypes; track caseType.id) {
            <option [value]="caseType.id">{{ caseType.name }}</option>
            }
          </select>
        </label>
        <label>
          Estado inicial
          <select name="statusId" [(ngModel)]="newCase.statusId">
            <option value="">Selecciona un estado</option>
            @for (status of statusesForType(newCase.caseTypeId); track status.id) {
            <option [value]="status.id">{{ statusLabel(status) }}</option>
            }
          </select>
        </label>
        <label>
          Abogado responsable
          <select name="attorneyUserId" [(ngModel)]="newCase.attorneyUserId">
            <option value="">Selecciona un abogado o administrador</option>
            @for (attorney of availableAttorneys; track userKey(attorney)) {
            <option [value]="userKey(attorney)">
              {{ userLabel(attorney) }}
            </option>
            }
          </select>
        </label>

        <fieldset class="admin-cases-invite-attorney">
          <legend>Invitar nuevo abogado</legend>
          <p>Usa esta opción sólo si el abogado todavía no aparece en la lista.</p>
          <label>
            Nombre
            <input name="newAttorneyName" [(ngModel)]="newCase.newAttorneyName" />
          </label>
          <label>
            Correo
            <input name="newAttorneyEmail" [(ngModel)]="newCase.newAttorneyEmail" type="email" />
          </label>
        </fieldset>

        <div class="admin-cases-create__actions">
          <button type="submit" [disabled]="createBusy || !canCreateCase()">
            {{ createBusy ? 'Creando...' : 'Crear caso' }}
          </button>
        </div>
        @if (createError) {
        <small class="admin-cases-create__error">{{ createError }}</small>
        }
        @if (createCaseHint()) {
        <small class="admin-cases-create__hint">{{ createCaseHint() }}</small>
        }
      </form>

      <div class="admin-cases-filters">
        <label>
          Buscar
          <input
            name="caseSearch"
            [(ngModel)]="searchTerm"
            (ngModelChange)="resetPage()"
            placeholder="Título, referencia, tipo o estado"
          />
        </label>
        <label>
          Tipo de caso
          <select
            [(ngModel)]="caseTypeFilter"
            (ngModelChange)="resetPage()"
            aria-label="Filtrar por tipo"
          >
            <option value="">Todos los tipos</option>
            @for (caseType of caseTypes; track caseType.id) {
            <option [value]="caseType.id">{{ caseType.name }}</option>
            }
          </select>
        </label>
        <label>
          Estado
          <select
            [(ngModel)]="statusFilter"
            (ngModelChange)="resetPage()"
            aria-label="Filtrar por estado"
          >
            <option value="">Todos los estados</option>
            @for (status of allStatuses(); track $index) {
            <option [value]="status.id">{{ statusLabel(status) }}</option>
            }
          </select>
        </label>
      </div>

      @if (loading) {
      <p class="admin-cases-page__state">Cargando casos...</p>
      } @else if (errorMessage) {
      <div class="admin-cases-page__state">
        <p>{{ errorMessage }}</p>
        <button type="button" data-testid="admin-cases-retry" (click)="load()">Reintentar</button>
      </div>
      } @else if (filteredCases().length === 0) {
      <p class="admin-cases-page__empty">Aún no hay casos para mostrar.</p>
      } @else {
      <div class="admin-cases-table-wrap">
        <table class="admin-cases-table">
          <thead>
            <tr>
              <th>Referencia</th>
              <th>Caso</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Actividad</th>
            </tr>
          </thead>
          <tbody>
            @for (caseItem of pagedCases(); track caseItem.id) {
            <tr>
              <td>{{ caseItem.reference || 'Sin referencia' }}</td>
              <td>
                <a [routerLink]="['/admin/casos', caseItem.id]">{{ caseItem.title }}</a>
              </td>
              <td>{{ caseTypeName(caseItem.caseTypeId) }}</td>
              <td>{{ statusName(caseItem.statusId) }}</td>
              <td>{{ caseItem.lastActivityAt || caseItem.updatedAt || 'Sin actividad' }}</td>
            </tr>
            }
          </tbody>
        </table>
      </div>
      @if (filteredCases().length > pageSize) {
      <nav class="admin-cases-pagination" aria-label="Paginación de casos">
        <button type="button" (click)="setPage(currentPage - 1)" [disabled]="boundedPage() <= 1">
          Anterior
        </button>
        <span>Página {{ boundedPage() }} de {{ totalPages() }}</span>
        <button
          type="button"
          (click)="setPage(currentPage + 1)"
          [disabled]="boundedPage() >= totalPages()"
        >
          Siguiente
        </button>
      </nav>
      }
      }
    </section>
  `,
  styles: [
    `
      .admin-cases-page {
        width: min(1180px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 24px 0;
        color: #29303b;
      }

      .admin-cases-page__header,
      .admin-cases-ops,
      .admin-cases-queue,
      .admin-cases-filters,
      .admin-cases-pagination {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: end;
        margin-bottom: 16px;
      }

      .admin-cases-page__header {
        justify-content: space-between;
        border-bottom: 1px solid rgba(41, 48, 59, 0.18);
      }

      .admin-cases-page__eyebrow {
        margin: 0;
        color: #4b8ff5;
        font-size: 0.85rem;
        text-transform: uppercase;
      }

      .admin-cases-page__action,
      .admin-cases-page__empty,
      .admin-cases-page__state,
      .admin-cases-ops,
      .admin-cases-queue,
      .admin-cases-create,
      .admin-cases-filters,
      .admin-cases-pagination {
        border: 1px solid rgba(41, 48, 59, 0.18);
        padding: 12px 16px;
        background: #ffffff;
      }

      .admin-cases-ops {
        align-items: stretch;
      }

      .admin-cases-ops div {
        min-width: 132px;
        border-left: 3px solid rgba(75, 143, 245, 0.45);
        padding-left: 10px;
      }

      .admin-cases-ops span,
      .admin-cases-queue span {
        display: block;
        color: rgba(41, 48, 59, 0.68);
        font-size: 0.82rem;
      }

      .admin-cases-ops strong {
        display: block;
        margin-top: 4px;
        font-size: 1.4rem;
      }

      .admin-cases-queue {
        display: block;
      }

      .admin-cases-queue h2 {
        margin: 0 0 8px;
        font-size: 1rem;
      }

      .admin-cases-queue ul {
        margin: 0;
        padding-left: 18px;
      }

      .admin-cases-create {
        display: grid;
        grid-template-columns: repeat(2, minmax(220px, 1fr));
        gap: 12px;
        margin-bottom: 16px;
      }

      .admin-cases-create label,
      .admin-cases-filters label {
        color: rgba(41, 48, 59, 0.72);
        display: grid;
        font-size: 0.82rem;
        font-weight: 700;
        gap: 4px;
      }

      .admin-cases-invite-attorney {
        border: 1px solid rgba(41, 48, 59, 0.18);
        display: grid;
        grid-column: 1 / -1;
        gap: 10px;
        grid-template-columns: repeat(2, minmax(180px, 1fr));
        margin: 0;
        padding: 12px;
      }

      .admin-cases-invite-attorney legend {
        font-weight: 800;
        padding: 0 6px;
      }

      .admin-cases-invite-attorney p {
        color: rgba(41, 48, 59, 0.68);
        grid-column: 1 / -1;
        margin: 0;
      }

      .admin-cases-create__actions {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        grid-column: 1 / -1;
      }

      .admin-cases-create__hint {
        color: rgba(41, 48, 59, 0.68);
        grid-column: 1 / -1;
      }

      .admin-cases-create__field-help {
        color: rgba(41, 48, 59, 0.62);
        font-weight: 500;
        line-height: 1.35;
      }

      .admin-cases-create__error {
        color: #b42318;
        grid-column: 1 / -1;
      }

      .admin-cases-filters label {
        min-width: min(260px, 100%);
      }

      .admin-cases-pagination {
        align-items: center;
        justify-content: flex-end;
        margin-top: 12px;
      }

      input:not([type='checkbox']):not([type='radio']):not([type='color']),
      select {
        background: #ffffff;
        border: 1px solid rgba(41, 48, 59, 0.28);
        border-radius: 0;
        box-shadow:
          0 8px 18px rgba(41, 48, 59, 0.06),
          inset 4px 0 0 rgba(75, 143, 245, 0.62);
        color: #29303b;
        font-size: 1rem;
        font-weight: 650;
        line-height: 1.45;
        min-height: 42px;
        padding: 0.8rem 0.9rem 0.8rem 1rem;
        width: 100%;
      }

      input:not([type='checkbox']):not([type='radio']):not([type='color']):hover,
      select:hover,
      input:not([type='checkbox']):not([type='radio']):not([type='color']):focus,
      select:focus {
        border-color: #4b8ff5;
        box-shadow:
          0 0 0 3px rgba(75, 143, 245, 0.22),
          0 12px 24px rgba(41, 48, 59, 0.08),
          inset 4px 0 0 #4b8ff5;
        outline: 0;
      }

      button,
      .admin-cases-page__action {
        background: #ffffff;
        border: 1px solid #4b8ff5;
        border-color: #4b8ff5;
        color: #4b8ff5;
        min-height: 36px;
        padding: 6px 10px;
        text-decoration: none;
      }

      button:disabled {
        border-color: rgba(41, 48, 59, 0.22);
        color: rgba(41, 48, 59, 0.45);
        cursor: not-allowed;
      }

      button:not(:disabled):hover,
      button:not(:disabled):focus-visible,
      .admin-cases-page__action:hover,
      .admin-cases-page__action:focus-visible,
      .admin-cases-table a:hover,
      .admin-cases-table a:focus-visible {
        background: #4b8ff5;
        color: #ffffff;
        outline: 0;
      }

      .admin-cases-table-wrap {
        overflow-x: auto;
      }

      .admin-cases-table {
        width: 100%;
        border-collapse: collapse;
        background: #ffffff;
      }

      .admin-cases-table th,
      .admin-cases-table td {
        border: 1px solid rgba(41, 48, 59, 0.18);
        padding: 10px;
        text-align: left;
        vertical-align: top;
      }

      @media (max-width: 720px) {
        .admin-cases-create,
        .admin-cases-invite-attorney {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class AdminCasesListComponent implements OnInit {
  cases: CaseRecord[] = [];
  caseTypes: CaseType[] = [];
  users: PlatformUser[] = [];
  operationsSummary: CaseOperationsSummary | null = null;
  loading = true;
  errorMessage = '';
  statusFilter = '';
  caseTypeFilter = '';
  searchTerm = '';
  currentPage = 1;
  createBusy = false;
  createError = '';
  readonly pageSize = 10;
  newCase: NewCaseForm = {
    title: '',
    reference: '',
    description: '',
    caseTypeId: '',
    statusId: '',
    attorneyUserId: '',
    newAttorneyEmail: '',
    newAttorneyName: '',
  };

  constructor(
    private _caseService: CaseService,
    private _userService: UserService,
    private _authFacade: AuthFacade
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    forkJoin({
      cases: this._caseService.listCases(),
      caseTypes: this._caseService.listCaseTypes(),
      operations: this._caseService.getOperationsSummary(),
      users: this._userService.getUsers(0, 100, '-create_at').pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ cases, caseTypes, operations, users }) => {
        this.cases = cases.items || [];
        this.caseTypes = caseTypes.items || [];
        this.operationsSummary = operations.item;
        this.users = this.withCurrentUser(this.normalizeUsers(users));
        this.setDefaultAttorneySelection();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'No se pudieron cargar los casos.';
      },
    });
  }

  filteredCases(): CaseRecord[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.cases.filter((caseItem) => {
      if (this.caseTypeFilter && caseItem.caseTypeId !== this.caseTypeFilter) {
        return false;
      }
      if (this.statusFilter && caseItem.statusId !== this.statusFilter) {
        return false;
      }
      if (term) {
        const haystack = [
          caseItem.title,
          caseItem.reference,
          this.caseTypeName(caseItem.caseTypeId),
          this.statusName(caseItem.statusId),
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(term);
      }
      return true;
    });
  }

  pagedCases(): CaseRecord[] {
    const page = this.boundedPage();
    return this.filteredCases().slice((page - 1) * this.pageSize, page * this.pageSize);
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredCases().length / this.pageSize));
  }

  boundedPage(): number {
    return Math.min(Math.max(1, this.currentPage), this.totalPages());
  }

  setPage(page: number): void {
    this.currentPage = Math.min(Math.max(1, page), this.totalPages());
  }

  resetPage(): void {
    this.currentPage = 1;
  }

  createCase(): void {
    if (!this.canCreateCase()) {
      return;
    }

    const attorney = this.selectedAttorney();
    const newAttorneyEmail = this.newCase.newAttorneyEmail.trim().toLowerCase();
    const initialAttorney = attorney
      ? {
          email: attorney.email || '',
          displayName: this.userName(attorney),
          userId: this.userKey(attorney),
        }
      : {
          email: newAttorneyEmail,
          displayName: this.newCase.newAttorneyName.trim(),
        };

    this.createBusy = true;
    this.createError = '';
    this._caseService
      .createCase({
        title: this.newCase.title.trim(),
        reference: this.newCase.reference.trim(),
        description: this.newCase.description.trim(),
        caseTypeId: this.newCase.caseTypeId,
        statusId: this.newCase.statusId,
        leadUserId: attorney ? this.userKey(attorney) : undefined,
        initialAttorney,
      })
      .subscribe({
        next: (response) => {
          this.cases = [response.item, ...this.cases];
          this.newCase = {
            title: '',
            reference: '',
            description: '',
            caseTypeId: '',
            statusId: '',
            attorneyUserId: '',
            newAttorneyEmail: '',
            newAttorneyName: '',
          };
          this.setDefaultAttorneySelection();
          this.createBusy = false;
        },
        error: (error) => {
          this.createBusy = false;
          this.createError = this.errorMessageFrom(error, 'No se pudo crear el caso.');
        },
      });
  }

  statusesForType(caseTypeId: string): CaseStatusDefinition[] {
    return (
      this.caseTypes
        .find((caseType) => caseType.id === caseTypeId)
        ?.statuses?.filter((status) => status.active !== false) || []
    );
  }

  allStatuses(): CaseStatusDefinition[] {
    return this.caseTypes.flatMap((caseType) => caseType.statuses || []);
  }

  caseTypeName(caseTypeId: string): string {
    return this.caseTypes.find((caseType) => caseType.id === caseTypeId)?.name || caseTypeId;
  }

  statusName(statusId: string): string {
    const status = this.allStatuses().find((status) => status.id === statusId);
    return status ? this.statusLabel(status) : statusId;
  }

  statusLabel(status: CaseStatusDefinition): string {
    return caseStatusLabel(status);
  }

  canCreateCase(): boolean {
    return (
      this.newCase.title.trim().length > 0 &&
      Boolean(this.newCase.caseTypeId) &&
      Boolean(this.newCase.statusId) &&
      this.hasAttorneySelection()
    );
  }

  createCaseHint(): string {
    if (!this.newCase.title.trim()) {
      return 'Agrega un título para el caso.';
    }
    if (!this.newCase.caseTypeId) {
      return 'Selecciona un tipo de caso.';
    }
    if (!this.newCase.statusId) {
      return 'Selecciona un estado inicial.';
    }
    if (!this.hasAttorneySelection()) {
      return 'Selecciona un abogado responsable o captura el correo para invitar uno nuevo.';
    }
    return '';
  }

  get availableAttorneys(): PlatformUser[] {
    return this.users.filter((user) =>
      ['ROLE_ADMIN', 'ROLE_LEGAL_STAFF'].includes(roleFromIdentity(user))
    );
  }

  userKey(user: PlatformUser): string {
    return String(user.id || user._id || user.sub || user.email || '').trim();
  }

  userLabel(user: PlatformUser): string {
    const name = this.userName(user);
    const email = user.email ? ` - ${user.email}` : '';
    return `${name}${email}`.trim();
  }

  private userName(user: PlatformUser): string {
    return String(user.displayName || user.name || user.email || 'Usuario').trim();
  }

  private selectedAttorney(): PlatformUser | undefined {
    return this.availableAttorneys.find((user) => this.userKey(user) === this.newCase.attorneyUserId);
  }

  private hasAttorneySelection(): boolean {
    const attorney = this.selectedAttorney();
    return (
      Boolean(attorney?.email && this.isValidEmail(attorney.email)) ||
      this.isValidEmail(this.newCase.newAttorneyEmail)
    );
  }

  private normalizeUsers(response: any): PlatformUser[] {
    const list = Array.isArray(response)
      ? response
      : response?.users || response?.items || response?.data || [];
    return Array.isArray(list) ? list : [];
  }

  private withCurrentUser(users: PlatformUser[]): PlatformUser[] {
    const current = this.currentIdentity();
    if (!current || !this.userKey(current)) {
      return users;
    }
    return [
      current,
      ...users.filter(
        (user) => this.userKey(user) !== this.userKey(current) && user.email !== current.email
      ),
    ];
  }

  private setDefaultAttorneySelection(): void {
    const current = this.currentIdentity();
    if (
      this.newCase.attorneyUserId ||
      !current ||
      !this.availableAttorneys.some((user) => this.userKey(user) === this.userKey(current))
    ) {
      return;
    }
    this.newCase.attorneyUserId = this.userKey(current);
  }

  private currentIdentity(): PlatformUser | null {
    return (this._authFacade.identity() || this._userService.getIdentity()) as PlatformUser | null;
  }

  private errorMessageFrom(error: any, fallback: string): string {
    return String(error?.error?.message || error?.message || fallback);
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }
}
