import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { CaseEntry, CaseVisibility } from '../../models/case';
import { CaseService } from '../../services/case.service';
import { RichTextEditorComponent } from '../../components/web-utility/rich-text-editor/rich-text-editor.component';

@Component({
  selector: 'app-admin-case-entry-editor',
  imports: [CommonModule, FormsModule, RouterLink, RichTextEditorComponent],
  template: `
    <section class="admin-case-entry-editor">
      <a [routerLink]="['/admin/casos', caseId]" class="admin-case-entry-editor__back">
        Volver al caso
      </a>
      <header class="admin-case-entry-editor__header">
        <p>Entrada de caso</p>
        <h1>{{ entryId ? 'Editar entrada' : 'Nueva entrada' }}</h1>
      </header>

      @if (errorMessage) {
      <p class="admin-case-entry-editor__error">{{ errorMessage }}</p>
      }

      <form class="admin-case-entry-editor__form" (ngSubmit)="save()">
        <label>
          Título
          <input name="title" [(ngModel)]="entry.title" required />
        </label>

        <label>
          Visibilidad
          <select name="visibility" [(ngModel)]="visibilityMode">
            <option value="internal_only">Sólo interno</option>
            <option value="case_members">Visible para cliente</option>
          </select>
        </label>

        <app-rich-text-editor
          label="Contenido"
          help="Esta entrada es privada del caso; no se publica con SEO ni como página pública."
          [(value)]="entry.text"
          minHeight="320px"
        />

        <div class="admin-case-entry-editor__actions">
          <button type="submit" [disabled]="saving || !canSave()">
            {{ saving ? 'Guardando...' : 'Guardar entrada' }}
          </button>
          @if (entryId && entryVisibleInPortal()) {
          <a [routerLink]="['/casos', caseId, 'entrada', entryId]">Ver en portal</a>
          }
        </div>
      </form>
    </section>
  `,
  styles: [
    `
      .admin-case-entry-editor {
        width: min(980px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 24px 0;
        color: #29303b;
      }

      .admin-case-entry-editor__back,
      .admin-case-entry-editor__actions a {
        color: #4b8ff5;
        text-decoration: none;
      }

      .admin-case-entry-editor__header,
      .admin-case-entry-editor__form,
      .admin-case-entry-editor__error {
        border: 1px solid rgba(41, 48, 59, 0.18);
        background: #ffffff;
        padding: 16px;
      }

      .admin-case-entry-editor__header {
        margin: 12px 0 16px;
      }

      .admin-case-entry-editor__header p {
        margin: 0;
        color: #4b8ff5;
        text-transform: uppercase;
      }

      .admin-case-entry-editor__form {
        display: grid;
        gap: 16px;
      }

      .admin-case-entry-editor__form label {
        display: grid;
        gap: 6px;
        font-weight: 700;
      }

      input,
      select,
      button,
      .admin-case-entry-editor__actions a {
        border: 1px solid rgba(41, 48, 59, 0.35);
        min-height: 38px;
        padding: 8px 10px;
        background: #ffffff;
        color: #29303b;
      }

      button,
      .admin-case-entry-editor__actions a {
        border-color: #4b8ff5;
        color: #4b8ff5;
      }

      button:disabled {
        border-color: rgba(41, 48, 59, 0.22);
        color: rgba(41, 48, 59, 0.45);
      }

      .admin-case-entry-editor__actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
      }

      .admin-case-entry-editor__error {
        color: #b42318;
        margin-bottom: 16px;
      }
    `,
  ],
})
export class AdminCaseEntryEditorComponent implements OnInit {
  readonly caseId: string;
  readonly entryId: string;
  entry: Pick<CaseEntry, 'title' | 'text'> = { title: '', text: '' };
  visibilityMode = 'internal_only';
  saving = false;
  errorMessage = '';

  constructor(
    private _route: ActivatedRoute,
    private _router: Router,
    private _caseService: CaseService
  ) {
    this.caseId = this._route.snapshot.paramMap.get('caseId') || '';
    this.entryId = this._route.snapshot.paramMap.get('entryId') || '';
  }

  ngOnInit(): void {
    if (!this.entryId) {
      return;
    }

    this._caseService.getEntry(this.caseId, this.entryId).subscribe({
      next: (response) => {
        const item = response.item;
        this.entry = { title: item.title || '', text: item.text || '' };
        this.visibilityMode = this.visibilityModeFrom(item.visibility);
      },
      error: () => {
        this.errorMessage = 'No se pudo cargar la entrada.';
      },
    });
  }

  canSave(): boolean {
    return this.entry.title.trim().length > 0 && this.entry.text.trim().length > 0;
  }

  entryVisibleInPortal(): boolean {
    return this.visibilityMode !== 'internal_only';
  }

  save(): void {
    if (!this.canSave()) {
      return;
    }

    const payload = {
      title: this.entry.title.trim(),
      text: this.entry.text.trim(),
      visibility: { mode: this.visibilityMode } as CaseVisibility,
    };
    const request = this.entryId
      ? this._caseService.updateEntry(this.caseId, this.entryId, payload)
      : this._caseService.createEntry(this.caseId, payload);

    this.saving = true;
    this.errorMessage = '';
    request.subscribe({
      next: (response) => {
        this.saving = false;
        void this._router.navigate(['/admin/casos', this.caseId, 'entradas', response.item.id]);
      },
      error: () => {
        this.saving = false;
        this.errorMessage = 'No se pudo guardar la entrada.';
      },
    });
  }

  private visibilityModeFrom(visibility: CaseVisibility): string {
    return typeof visibility === 'object' ? visibility.mode : visibility || 'internal_only';
  }
}
