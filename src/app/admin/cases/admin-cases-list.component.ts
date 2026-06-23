import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import {
  CaseMalwareProtectionStatus,
  CaseOperationsSummary,
  CaseRecord,
  CaseStatusDefinition,
  CaseType,
  caseStatusLabel,
} from '../../models/case';
import { CaseService } from '../../services/case.service';

type NewCaseForm = {
  title: string;
  reference: string;
  description: string;
  caseTypeId: string;
  statusId: string;
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
          <span>Escaneo pendiente</span>
          <strong>{{ operationsSummary.files.malwareScanPending }}</strong>
        </div>
        <div [class.admin-cases-ops__risk]="operationsSummary.files.malwareScanBlocked > 0">
          <span>Bloqueados</span>
          <strong>{{ operationsSummary.files.malwareScanBlocked }}</strong>
        </div>
        <div>
          <span>Push fallidos</span>
          <strong>{{ operationsSummary.notifications.webPush['failed'] || 0 }}</strong>
        </div>
      </section>

      @if (malwareProtection) {
      <section class="admin-cases-protection" aria-label="Protección de archivos de casos">
        <div class="admin-cases-protection__copy">
          <p class="admin-cases-protection__eyebrow">GuardDuty para archivos</p>
          <h2>{{ malwareProtectionTitle() }}</h2>
          <p>{{ malwareProtection.costNotice }}</p>
          <p>
            Estado:
            <strong>{{ malwareProtectionStatusLabel() }}</strong>
          </p>
        </div>
        <div class="admin-cases-protection__actions">
          @if (!malwareProtection.infrastructureAvailable) {
          <p class="admin-cases-protection__note">
            No disponible en este ambiente.
          </p>
          } @else if (malwareProtection.enabled) {
          <button
            type="button"
            class="admin-cases-protection__secondary"
            [disabled]="malwareProtectionBusy"
            (click)="disableMalwareProtection()"
          >
            Desactivar
          </button>
          } @else {
          <label class="admin-cases-protection__check">
            <input
              type="checkbox"
              [(ngModel)]="malwareProtectionCostAccepted"
              name="malwareProtectionCostAccepted"
            />
            Acepto el costo
          </label>
          <button
            type="button"
            [disabled]="!malwareProtectionCostAccepted || malwareProtectionBusy"
            (click)="launchMalwareProtection()"
          >
            Lanzar protección
          </button>
          }
          @if (malwareProtectionMessage) {
          <p class="admin-cases-protection__note">{{ malwareProtectionMessage }}</p>
          }
        </div>
      </section>
      }

      @if (operationsSummary.queues.malwareBlockedFiles.length > 0) {
      <section class="admin-cases-queue">
        <h2>Archivos bloqueados por seguridad</h2>
        <ul>
          @for (file of operationsSummary.queues.malwareBlockedFiles; track file.id) {
          <li>
            <a [routerLink]="['/admin/casos', file.caseId]">{{ file.fileName }}</a>
            <span>{{ malwareScanLabel(file.malwareScan?.status || '') }}</span>
          </li>
          }
        </ul>
      </section>
      }
      }

      <form class="admin-cases-create" (ngSubmit)="createCase()">
        <input
          name="title"
          [(ngModel)]="newCase.title"
          placeholder="Título del caso"
          aria-label="Título del caso"
        />
        <input
          name="reference"
          [(ngModel)]="newCase.reference"
          placeholder="Referencia"
          aria-label="Referencia"
        />
        <select name="caseTypeId" [(ngModel)]="newCase.caseTypeId" aria-label="Tipo de caso">
          <option value="">Tipo</option>
          @for (caseType of caseTypes; track caseType.id) {
          <option [value]="caseType.id">{{ caseType.name }}</option>
          }
        </select>
        <select name="statusId" [(ngModel)]="newCase.statusId" aria-label="Estado inicial">
          <option value="">Estado</option>
          @for (status of statusesForType(newCase.caseTypeId); track status.id) {
          <option [value]="status.id">{{ statusLabel(status) }}</option>
          }
        </select>
        <button type="submit">Crear caso</button>
      </form>

      <div class="admin-cases-filters">
        <select [(ngModel)]="caseTypeFilter" aria-label="Filtrar por tipo">
          <option value="">Todos los tipos</option>
          @for (caseType of caseTypes; track caseType.id) {
          <option [value]="caseType.id">{{ caseType.name }}</option>
          }
        </select>
        <select [(ngModel)]="statusFilter" aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          @for (status of allStatuses(); track $index) {
          <option [value]="status.id">{{ statusLabel(status) }}</option>
          }
        </select>
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
            @for (caseItem of filteredCases(); track caseItem.id) {
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
      .admin-cases-protection,
      .admin-cases-queue,
      .admin-cases-filters,
      .admin-cases-create {
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
      .admin-cases-protection,
      .admin-cases-queue,
      .admin-cases-create,
      .admin-cases-filters {
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

      .admin-cases-ops__risk {
        border-left-color: #b42318 !important;
      }

      .admin-cases-protection {
        align-items: flex-start;
        justify-content: space-between;
      }

      .admin-cases-protection__copy {
        min-width: min(100%, 420px);
        flex: 1 1 420px;
      }

      .admin-cases-protection__copy h2,
      .admin-cases-protection__copy p {
        margin: 0 0 8px;
      }

      .admin-cases-protection__eyebrow {
        color: #4b8ff5;
        font-size: 0.78rem;
        text-transform: uppercase;
      }

      .admin-cases-protection__actions {
        display: flex;
        flex: 1 1 260px;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
        justify-content: flex-end;
      }

      .admin-cases-protection__check {
        display: inline-flex;
        gap: 8px;
        align-items: center;
        min-height: 36px;
      }

      .admin-cases-protection__check input {
        min-height: auto;
      }

      .admin-cases-protection__note {
        flex-basis: 100%;
        margin: 0;
        color: rgba(41, 48, 59, 0.72);
        text-align: right;
      }

      .admin-cases-protection__secondary {
        border-color: rgba(41, 48, 59, 0.35);
        color: #29303b;
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

      input,
      select,
      button {
        border: 1px solid rgba(41, 48, 59, 0.35);
        min-height: 36px;
        padding: 6px 10px;
        background: #ffffff;
        color: #29303b;
      }

      button,
      .admin-cases-page__action {
        border-color: #4b8ff5;
        color: #4b8ff5;
        text-decoration: none;
      }

      button:disabled {
        border-color: rgba(41, 48, 59, 0.22);
        color: rgba(41, 48, 59, 0.45);
        cursor: not-allowed;
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
        .admin-cases-protection__actions {
          justify-content: flex-start;
        }

        .admin-cases-protection__note {
          text-align: left;
        }
      }
    `,
  ],
})
export class AdminCasesListComponent implements OnInit {
  cases: CaseRecord[] = [];
  caseTypes: CaseType[] = [];
  operationsSummary: CaseOperationsSummary | null = null;
  malwareProtection: CaseMalwareProtectionStatus | null = null;
  malwareProtectionBusy = false;
  malwareProtectionCostAccepted = false;
  malwareProtectionMessage = '';
  loading = true;
  errorMessage = '';
  statusFilter = '';
  caseTypeFilter = '';
  newCase: NewCaseForm = {
    title: '',
    reference: '',
    description: '',
    caseTypeId: '',
    statusId: '',
  };

  constructor(private _caseService: CaseService) {}

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
      malwareProtection: this._caseService.getMalwareProtectionStatus(),
    }).subscribe({
      next: ({ cases, caseTypes, operations, malwareProtection }) => {
        this.cases = cases.items || [];
        this.caseTypes = caseTypes.items || [];
        this.operationsSummary = operations.item;
        this.malwareProtection = malwareProtection.item;
        this.malwareProtectionCostAccepted = false;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'No se pudieron cargar los casos.';
      },
    });
  }

  filteredCases(): CaseRecord[] {
    return this.cases.filter((caseItem) => {
      if (this.caseTypeFilter && caseItem.caseTypeId !== this.caseTypeFilter) {
        return false;
      }
      if (this.statusFilter && caseItem.statusId !== this.statusFilter) {
        return false;
      }
      return true;
    });
  }

  createCase(): void {
    if (!this.newCase.title || !this.newCase.caseTypeId || !this.newCase.statusId) {
      return;
    }

    this._caseService.createCase({ ...this.newCase }).subscribe((response) => {
      this.cases = [response.item, ...this.cases];
      this.newCase = {
        title: '',
        reference: '',
        description: '',
        caseTypeId: '',
        statusId: '',
      };
    });
  }

  statusesForType(caseTypeId: string): CaseStatusDefinition[] {
    return (
      this.caseTypes
        .find((caseType) => caseType.id === caseTypeId)
        ?.statuses?.filter((status) => status.active !== false) || []
    );
  }

  launchMalwareProtection(): void {
    if (!this.malwareProtectionCostAccepted || this.malwareProtectionBusy) {
      return;
    }
    this.malwareProtectionBusy = true;
    this.malwareProtectionMessage = '';
    this._caseService.launchMalwareProtection().subscribe({
      next: (response) => {
        this.malwareProtection = response.item;
        this.malwareProtectionCostAccepted = false;
        this.malwareProtectionBusy = false;
        this.malwareProtectionMessage = 'Protección lanzada para nuevos archivos.';
        this.load();
      },
      error: () => {
        this.malwareProtectionBusy = false;
        this.malwareProtectionMessage = 'No se pudo lanzar GuardDuty.';
      },
    });
  }

  disableMalwareProtection(): void {
    if (this.malwareProtectionBusy) {
      return;
    }
    this.malwareProtectionBusy = true;
    this.malwareProtectionMessage = '';
    this._caseService.disableMalwareProtection().subscribe({
      next: (response) => {
        this.malwareProtection = response.item;
        this.malwareProtectionBusy = false;
        this.malwareProtectionMessage = 'Protección desactivada para nuevos archivos.';
        this.load();
      },
      error: () => {
        this.malwareProtectionBusy = false;
        this.malwareProtectionMessage = 'No se pudo desactivar GuardDuty.';
      },
    });
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

  malwareScanLabel(status: string): string {
    return {
      blocked: 'Amenaza detectada',
      failed: 'Escaneo fallido',
      unsupported: 'No soportado',
      access_denied: 'Sin acceso de escaneo',
      pending: 'Pendiente',
      clean: 'Limpio',
      not_required: 'Sin escaneo',
    }[status] || status || 'Sin estado';
  }

  malwareProtectionTitle(): string {
    if (!this.malwareProtection?.infrastructureAvailable) {
      return 'Protección no disponible';
    }
    return this.malwareProtection.enabled ? 'Protección activa' : 'Protección opcional';
  }

  malwareProtectionStatusLabel(): string {
    if (!this.malwareProtection) {
      return 'Sin estado';
    }
    if (!this.malwareProtection.infrastructureAvailable) {
      return 'No disponible';
    }
    if (this.malwareProtection.enabled) {
      return 'Activo';
    }
    if (this.malwareProtection.status === 'pending_infrastructure') {
      return 'Pendiente de infraestructura';
    }
    return 'Apagado';
  }
}
