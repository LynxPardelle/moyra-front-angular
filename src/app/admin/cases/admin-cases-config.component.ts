import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { CaseStatusDefinition, CaseType, caseStatusLabel } from '../../models/case';
import { CaseService } from '../../services/case.service';
import { RichTextEditorComponent } from '../../components/web-utility/rich-text-editor/rich-text-editor.component';

type CaseStatusEditor = {
  id: string;
  label: string;
  color: string;
  order: number;
  active: boolean;
  isDefault: boolean;
};

type CaseTypeEditor = {
  id: string;
  name: string;
  description: string;
  active: boolean;
  statuses: CaseStatusEditor[];
};

@Component({
  selector: 'app-admin-cases-config',
  imports: [CommonModule, FormsModule, RouterLink, RichTextEditorComponent],
  template: `
    <section class="admin-cases-config">
      <a routerLink="/admin/casos" class="admin-cases-config__back">Casos</a>
      <header class="admin-cases-config__header">
        <div>
          <p class="admin-cases-config__eyebrow">Operación legal</p>
          <h1>Configuración de casos</h1>
          <p>Define los tipos de caso y sus estados internos sin publicar contenido al sitio público.</p>
        </div>
      </header>

      @if (loading) {
      <p class="admin-cases-config__state">Cargando configuración...</p>
      } @else if (errorMessage) {
      <section class="admin-cases-config__state">
        <p>{{ errorMessage }}</p>
        <button type="button" data-testid="cases-config-retry" (click)="load()">Reintentar</button>
      </section>
      } @else {
      <div class="admin-cases-config__layout">
        <section class="admin-cases-config__panel">
          <h2>Tipos</h2>
          <form class="admin-cases-config__form" (ngSubmit)="createCaseType()">
            <label>
              Nombre
              <input
                name="newTypeName"
                [(ngModel)]="newTypeName"
                maxlength="120"
                placeholder="Ej. Litigio civil"
              />
            </label>
            <div class="admin-cases-config__rich-field">
              <app-rich-text-editor
                label="Descripción"
                help="Uso interno del tipo de caso."
                placeholder="Uso interno del tipo de caso"
                [(value)]="newTypeDescription"
                minHeight="150px"
              />
            </div>
            <label>
              Primer estado
              <input
                name="newTypeStatus"
                [(ngModel)]="newTypeStatusLabel"
                maxlength="120"
                placeholder="Ej. En revisión"
              />
            </label>
            <button type="submit" [disabled]="creating">
              {{ creating ? 'Creando...' : 'Crear tipo' }}
            </button>
          </form>

          @if (caseTypes.length === 0) {
          <p class="admin-cases-config__empty">Aún no hay tipos de caso configurados.</p>
          } @else {
          <nav class="admin-cases-config__types" aria-label="Tipos de caso">
            @for (caseType of caseTypes; track caseType.id) {
            <button
              type="button"
              [class.is-selected]="caseType.id === selectedTypeId"
              (click)="selectCaseType(caseType)"
            >
              <span>{{ caseType.name }}</span>
              <small>{{ activeStatusCount(caseType) }} estados activos</small>
            </button>
            }
          </nav>
          }
        </section>

        <section class="admin-cases-config__panel admin-cases-config__editor">
          @if (!editForm) {
          <h2>Selecciona un tipo</h2>
          <p>Elige un tipo de caso para editar sus estados y disponibilidad.</p>
          } @else {
          <form class="admin-cases-config__form" (ngSubmit)="saveSelectedCaseType()">
            <div class="admin-cases-config__editor-head">
              <h2>Editar tipo</h2>
              <label class="admin-cases-config__toggle">
                <input name="typeActive" type="checkbox" [(ngModel)]="editForm.active" />
                Activo
              </label>
            </div>

            <label>
              Nombre
              <input name="typeName" [(ngModel)]="editForm.name" maxlength="120" />
            </label>
            <div class="admin-cases-config__rich-field">
              <app-rich-text-editor
                label="Descripción"
                help="Texto interno para orientar el uso de este tipo de caso."
                placeholder="Descripción"
                [(value)]="editForm.description"
                minHeight="150px"
              />
            </div>

            <div class="admin-cases-config__statuses">
              <div class="admin-cases-config__statuses-head">
                <h3>Estados</h3>
                <div class="admin-cases-config__add-status">
                  <input
                    name="newStatusLabel"
                    [(ngModel)]="newStatusLabel"
                    maxlength="120"
                    placeholder="Nuevo estado"
                  />
                  <button type="button" (click)="addStatus()">Agregar estado</button>
                </div>
              </div>

              @for (status of sortedEditableStatuses(); track status.id || $index; let index = $index) {
              <article class="admin-cases-config__status-row">
                <label>
                  Etiqueta
                  <input
                    [name]="'statusLabel' + index"
                    [(ngModel)]="status.label"
                    maxlength="120"
                  />
                </label>
                <label>
                  Color
                  <input [name]="'statusColor' + index" type="color" [(ngModel)]="status.color" />
                </label>
                <label>
                  Orden
                  <input [name]="'statusOrder' + index" type="number" [(ngModel)]="status.order" />
                </label>
                <label class="admin-cases-config__toggle">
                  <input [name]="'statusActive' + index" type="checkbox" [(ngModel)]="status.active" />
                  Activo
                </label>
                <label class="admin-cases-config__toggle">
                  <input
                    [name]="'statusDefault' + index"
                    type="radio"
                    [checked]="status.isDefault"
                    (change)="markDefaultStatus(status)"
                  />
                  Inicial
                </label>
              </article>
              }
            </div>

            @if (successMessage) {
            <p class="admin-cases-config__success">{{ successMessage }}</p>
            }
            @if (formError) {
            <p class="admin-cases-config__error">{{ formError }}</p>
            }
            <button type="submit" [disabled]="saving">
              {{ saving ? 'Guardando...' : 'Guardar configuración' }}
            </button>
          </form>
          }
        </section>
      </div>
      }
    </section>
  `,
  styles: [
    `
      .admin-cases-config {
        width: min(1180px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 24px 0;
        color: #29303b;
      }

      .admin-cases-config__back {
        color: #4b8ff5;
        text-decoration: none;
      }

      .admin-cases-config__header {
        border-bottom: 1px solid rgba(41, 48, 59, 0.18);
        margin: 12px 0 16px;
        padding-bottom: 12px;
      }

      .admin-cases-config__header h1,
      .admin-cases-config__panel h2,
      .admin-cases-config__panel h3 {
        margin-top: 0;
      }

      .admin-cases-config__eyebrow {
        margin: 0;
        color: #4b8ff5;
        font-size: 0.85rem;
        text-transform: uppercase;
      }

      .admin-cases-config__layout {
        display: grid;
        grid-template-columns: minmax(260px, 360px) minmax(0, 1fr);
        gap: 16px;
        align-items: start;
      }

      .admin-cases-config__panel,
      .admin-cases-config__state,
      .admin-cases-config__empty {
        border: 1px solid rgba(41, 48, 59, 0.18);
        padding: 16px;
        background: #ffffff;
      }

      .admin-cases-config__form,
      .admin-cases-config__types,
      .admin-cases-config__statuses {
        display: grid;
        gap: 12px;
      }

      .admin-cases-config__form label,
      .admin-cases-config__status-row label {
        display: grid;
        gap: 4px;
        color: rgba(41, 48, 59, 0.72);
        font-size: 0.82rem;
      }

      .admin-cases-config__rich-field {
        display: block;
      }

      input:not([type='checkbox']):not([type='radio']):not([type='color']),
      select,
      textarea {
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

      textarea {
        min-height: 120px;
        resize: vertical;
      }

      input[type='color'] {
        background: #ffffff;
        border: 1px solid rgba(41, 48, 59, 0.28);
        min-height: 42px;
        padding: 4px;
        width: 100%;
      }

      input:not([type='checkbox']):not([type='radio']):not([type='color']):hover,
      select:hover,
      textarea:hover,
      input:not([type='checkbox']):not([type='radio']):not([type='color']):focus,
      select:focus,
      textarea:focus {
        border-color: #4b8ff5;
        box-shadow:
          0 0 0 3px rgba(75, 143, 245, 0.22),
          0 12px 24px rgba(41, 48, 59, 0.08),
          inset 4px 0 0 #4b8ff5;
        outline: 0;
      }

      button {
        background: #ffffff;
        border: 1px solid #4b8ff5;
        border-color: #4b8ff5;
        color: #4b8ff5;
        min-height: 38px;
        padding: 7px 10px;
      }

      button:disabled {
        border-color: rgba(41, 48, 59, 0.24);
        color: rgba(41, 48, 59, 0.48);
      }

      button:not(:disabled):hover,
      button:not(:disabled):focus-visible,
      .admin-cases-config__back:hover,
      .admin-cases-config__back:focus-visible {
        background: #4b8ff5;
        color: #ffffff;
        outline: 0;
      }

      .admin-cases-config__types button {
        display: grid;
        gap: 2px;
        justify-items: start;
        text-align: left;
      }

      .admin-cases-config__types button.is-selected {
        border-color: #29303b;
        color: #29303b;
      }

      .admin-cases-config__types small {
        color: rgba(41, 48, 59, 0.62);
      }

      .admin-cases-config__editor-head,
      .admin-cases-config__statuses-head,
      .admin-cases-config__add-status {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
        justify-content: space-between;
      }

      .admin-cases-config__add-status {
        justify-content: flex-start;
      }

      .admin-cases-config__status-row {
        display: grid;
        grid-template-columns: minmax(180px, 1fr) 96px 88px 96px 96px;
        gap: 10px;
        align-items: end;
        border-top: 1px solid rgba(41, 48, 59, 0.14);
        padding-top: 12px;
      }

      .admin-cases-config__toggle {
        display: flex !important;
        grid-template-columns: none !important;
        flex-direction: row;
        align-items: center;
      }

      .admin-cases-config__toggle input {
        min-height: 0;
      }

      .admin-cases-config__success {
        color: #1f7a4d;
      }

      .admin-cases-config__error {
        color: #b42318;
      }

      @media (max-width: 900px) {
        .admin-cases-config__layout,
        .admin-cases-config__status-row {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class AdminCasesConfigComponent implements OnInit {
  caseTypes: CaseType[] = [];
  selectedTypeId = '';
  editForm: CaseTypeEditor | null = null;
  loading = true;
  saving = false;
  creating = false;
  errorMessage = '';
  formError = '';
  successMessage = '';
  newTypeName = '';
  newTypeDescription = '';
  newTypeStatusLabel = 'En revisión';
  newStatusLabel = '';

  constructor(private _caseService: CaseService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.formError = '';
    this.successMessage = '';

    this._caseService.listCaseTypes().subscribe({
      next: (response) => {
        this.caseTypes = response.items || [];
        this.loading = false;
        if (this.caseTypes.length > 0) {
          const selected =
            this.caseTypes.find((caseType) => caseType.id === this.selectedTypeId) ||
            this.caseTypes[0];
          this.selectCaseType(selected);
        } else {
          this.selectedTypeId = '';
          this.editForm = null;
        }
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'No se pudo cargar la configuración de casos.';
      },
    });
  }

  createCaseType(): void {
    const name = this.newTypeName.trim();
    const statusLabel = this.newTypeStatusLabel.trim();
    if (!name || !statusLabel) {
      this.formError = 'Captura el nombre del tipo y al menos un estado.';
      return;
    }

    this.creating = true;
    this.formError = '';
    this.successMessage = '';
    this._caseService
      .createCaseType({
        name,
        description: this.newTypeDescription.trim(),
        active: true,
        statuses: [
          {
            label: statusLabel,
            color: '#334155',
            order: 1,
            active: true,
            isDefault: true,
          },
        ],
      })
      .subscribe({
        next: (response) => {
          this.caseTypes = [...this.caseTypes, response.item];
          this.newTypeName = '';
          this.newTypeDescription = '';
          this.newTypeStatusLabel = 'En revisión';
          this.creating = false;
          this.successMessage = 'Tipo de caso creado.';
          this.selectCaseType(response.item);
        },
        error: () => {
          this.creating = false;
          this.formError = 'No se pudo crear el tipo de caso.';
        },
      });
  }

  selectCaseType(caseType: CaseType): void {
    this.selectedTypeId = caseType.id;
    this.editForm = {
      id: caseType.id,
      name: caseType.name,
      description: caseType.description || '',
      active: caseType.active !== false,
      statuses: [...(caseType.statuses || [])]
        .sort((left, right) => (left.order || 0) - (right.order || 0))
        .map((status, index) => this.toEditableStatus(status, index)),
    };
    if (this.editForm.statuses.length === 0) {
      this.editForm.statuses = [
        {
          id: '',
          label: 'En revisión',
          color: '#334155',
          order: 1,
          active: true,
          isDefault: true,
        },
      ];
    }
    if (!this.editForm.statuses.some((status) => status.isDefault)) {
      this.editForm.statuses[0].isDefault = true;
    }
    this.formError = '';
    this.successMessage = '';
  }

  saveSelectedCaseType(): void {
    if (!this.editForm) {
      return;
    }

    const name = this.editForm.name.trim();
    const statuses = this.normalizedStatuses();
    if (!name || statuses.length === 0) {
      this.formError = 'El tipo debe tener nombre y al menos un estado.';
      return;
    }
    if (!statuses.some((status) => status.active !== false)) {
      this.formError = 'Deja al menos un estado activo.';
      return;
    }

    this.saving = true;
    this.formError = '';
    this.successMessage = '';
    this._caseService
      .updateCaseType(this.editForm.id, {
        name,
        description: this.editForm.description.trim(),
        active: this.editForm.active,
        statuses,
      })
      .subscribe({
        next: (response) => {
          this.caseTypes = this.caseTypes.map((caseType) =>
            caseType.id === response.item.id ? response.item : caseType
          );
          this.saving = false;
          this.successMessage = 'Configuración guardada.';
          this.selectCaseType(response.item);
        },
        error: () => {
          this.saving = false;
          this.formError = 'No se pudo guardar la configuración.';
        },
      });
  }

  addStatus(): void {
    if (!this.editForm) {
      return;
    }
    const label = this.newStatusLabel.trim();
    if (!label) {
      this.formError = 'Captura la etiqueta del nuevo estado.';
      return;
    }
    const nextOrder =
      Math.max(0, ...this.editForm.statuses.map((status) => Number(status.order) || 0)) + 1;
    this.editForm.statuses = [
      ...this.editForm.statuses,
      {
        id: this.newStatusId(label),
        label,
        color: '#334155',
        order: nextOrder,
        active: true,
        isDefault: false,
      },
    ];
    this.newStatusLabel = '';
    this.formError = '';
  }

  markDefaultStatus(status: CaseStatusEditor): void {
    if (!this.editForm) {
      return;
    }
    this.editForm.statuses = this.editForm.statuses.map((candidate) => ({
      ...candidate,
      isDefault: candidate === status,
    }));
  }

  sortedEditableStatuses(): CaseStatusEditor[] {
    return [...(this.editForm?.statuses || [])].sort(
      (left, right) => (Number(left.order) || 0) - (Number(right.order) || 0)
    );
  }

  activeStatusCount(caseType: CaseType): number {
    return (caseType.statuses || []).filter((status) => status.active !== false).length;
  }

  private toEditableStatus(status: CaseStatusDefinition, index: number): CaseStatusEditor {
    return {
      id: status.id,
      label: caseStatusLabel(status),
      color: status.color || '#334155',
      order: Number.isFinite(Number(status.order)) ? Number(status.order) : index + 1,
      active: status.active !== false,
      isDefault: status.isDefault === true,
    };
  }

  private normalizedStatuses(): CaseStatusDefinition[] {
    const statuses = this.sortedEditableStatuses()
      .map((status, index) => ({
        id: status.id || this.newStatusId(status.label),
        label: status.label.trim(),
        color: status.color || '#334155',
        order: Number.isFinite(Number(status.order)) ? Number(status.order) : index + 1,
        active: status.active !== false,
        isDefault: status.isDefault === true,
      }))
      .filter((status) => status.label);

    if (!statuses.some((status) => status.isDefault) && statuses.length > 0) {
      statuses[0].isDefault = true;
    }
    return statuses;
  }

  private newStatusId(label: string): string {
    const base = label
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
    const suffix = this.editForm ? this.editForm.statuses.length + 1 : 1;
    return `${this.editForm?.id || 'case-type'}:status:${base || 'estado'}-${suffix}`;
  }
}
