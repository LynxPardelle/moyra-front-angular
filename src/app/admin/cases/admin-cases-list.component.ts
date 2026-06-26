import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import {
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
  attorneyEmail: string;
  attorneyName: string;
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
          <span>Push fallidos</span>
          <strong>{{ operationsSummary.notifications.webPush['failed'] || 0 }}</strong>
        </div>
      </section>
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
        <input
          name="attorneyName"
          [(ngModel)]="newCase.attorneyName"
          placeholder="Abogado responsable"
          aria-label="Abogado responsable"
        />
        <input
          name="attorneyEmail"
          [(ngModel)]="newCase.attorneyEmail"
          placeholder="Correo del abogado"
          aria-label="Correo del abogado"
          type="email"
        />
        <button type="submit" [disabled]="!canCreateCase()">Crear caso</button>
        @if (createCaseHint()) {
        <small>{{ createCaseHint() }}</small>
        }
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
    `,
  ],
})
export class AdminCasesListComponent implements OnInit {
  cases: CaseRecord[] = [];
  caseTypes: CaseType[] = [];
  operationsSummary: CaseOperationsSummary | null = null;
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
    attorneyEmail: '',
    attorneyName: '',
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
    }).subscribe({
      next: ({ cases, caseTypes, operations }) => {
        this.cases = cases.items || [];
        this.caseTypes = caseTypes.items || [];
        this.operationsSummary = operations.item;
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
    if (!this.canCreateCase()) {
      return;
    }

    this._caseService.createCase({
      title: this.newCase.title,
      reference: this.newCase.reference,
      description: this.newCase.description,
      caseTypeId: this.newCase.caseTypeId,
      statusId: this.newCase.statusId,
      initialAttorney: {
        email: this.newCase.attorneyEmail.trim().toLowerCase(),
        displayName: this.newCase.attorneyName.trim(),
      },
    }).subscribe((response) => {
      this.cases = [response.item, ...this.cases];
      this.newCase = {
        title: '',
        reference: '',
        description: '',
        caseTypeId: '',
        statusId: '',
        attorneyEmail: '',
        attorneyName: '',
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
      this.isValidEmail(this.newCase.attorneyEmail)
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
    if (!this.isValidEmail(this.newCase.attorneyEmail)) {
      return 'Agrega el correo del abogado responsable.';
    }
    return '';
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }
}
