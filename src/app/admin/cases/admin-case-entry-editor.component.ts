import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { CaseEntry, CaseFile, CaseMembership, CaseVisibility } from '../../models/case';
import { CaseService } from '../../services/case.service';
import { apiUrl } from '../../services/global';
import { AuthFacade } from '../../store/auth/auth.facade';
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

        @if (canManageVisibility) {
        <label>
          Visibilidad
          <select name="visibility" [(ngModel)]="visibilityMode">
            <option value="internal_only">Sólo interno</option>
            <option value="case_members">Visible para cliente</option>
          </select>
        </label>
        } @else {
        <p class="admin-case-entry-editor__note">
          La entrada se guardará como interna hasta que un abogado apruebe la visibilidad.
        </p>
        }

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

      <section class="admin-case-entry-editor__files">
        <h2>Archivos</h2>
        @if (!entryId) {
        <p class="admin-case-entry-editor__note">
          Guarda la entrada antes de adjuntar documentos.
        </p>
        } @else {
        <form class="admin-case-entry-editor__file-form" (ngSubmit)="addOneDriveLink()">
          <label>
            Nombre del documento
            <input
              name="oneDriveFileName"
              [(ngModel)]="oneDriveLink.fileName"
              placeholder="Ej. Contrato firmado"
            />
          </label>
          <label>
            Enlace de OneDrive
            <input
              name="oneDriveLinkUrl"
              [(ngModel)]="oneDriveLink.linkUrl"
              placeholder="https://...sharepoint.com/..."
              type="url"
            />
          </label>
          <label>
            Visibilidad
            <select
              name="oneDriveVisibility"
              [(ngModel)]="oneDriveLink.visibilityMode"
              [disabled]="!canApproveFileVisibility"
            >
              <option value="internal_only">Sólo interno</option>
              <option value="case_members">Visible para cliente</option>
            </select>
          </label>
          @if (!canApproveFileVisibility) {
          <p class="admin-case-entry-editor__note">
            El documento se guardará como interno hasta que un abogado apruebe su visibilidad.
          </p>
          }
          <button type="submit" [disabled]="oneDriveBusy || !canCreateOneDriveLink()">
            {{ oneDriveBusy ? 'Agregando...' : 'Agregar enlace' }}
          </button>
        </form>
        <p class="admin-case-entry-editor__help">
          Para Casos se guardan enlaces privados de OneDrive o SharePoint; los demás módulos siguen usando S3.
        </p>
        @if (oneDriveError) {
        <p class="admin-case-entry-editor__error">{{ oneDriveError }}</p>
        }
        <div class="admin-case-entry-editor__file-list">
          @if (filesForEntry(entryId).length === 0) {
          <p>No hay documentos ligados a esta entrada.</p>
          } @for (file of filesForEntry(entryId); track file.id) {
          <article class="admin-case-entry-editor__file">
            <div>
              <strong>{{ displayFileName(file) }}</strong>
              <span>{{ fileTypeLabel(file) }}</span>
              <span>{{ fileReviewLabel(file) }}</span>
            </div>
            @if (canDownloadFile(file)) {
            <a [href]="fileHref(file)" target="_blank" rel="noopener noreferrer">
              Abrir documento
            </a>
            }
          </article>
          }
        </div>
        }
      </section>
    </section>
  `,
  styles: [
    `
      .admin-case-entry-editor {
        box-sizing: border-box;
        max-width: 980px;
        width: 100%;
        margin: 0 auto;
        padding: 24px 16px;
        color: #29303b;
      }

      .admin-case-entry-editor__back,
      .admin-case-entry-editor__actions a {
        color: #4b8ff5;
        text-decoration: none;
      }

      .admin-case-entry-editor__header,
      .admin-case-entry-editor__form,
      .admin-case-entry-editor__files,
      .admin-case-entry-editor__error {
        border: 1px solid rgba(41, 48, 59, 0.18);
        background: #ffffff;
        padding: 16px;
      }

      .admin-case-entry-editor__files {
        margin-top: 16px;
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

      .admin-case-entry-editor__form label,
      .admin-case-entry-editor__file-form label {
        display: grid;
        gap: 6px;
        font-weight: 700;
      }

      .admin-case-entry-editor__file-form {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr));
        align-items: end;
        gap: 10px;
      }

      .admin-case-entry-editor__help {
        color: rgba(41, 48, 59, 0.68);
        margin: 10px 0;
      }

      .admin-case-entry-editor__note {
        border-left: 4px solid #4b8ff5;
        color: rgba(41, 48, 59, 0.68);
        margin: 0;
        padding: 10px 12px;
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
      .admin-case-entry-editor__actions a,
      .admin-case-entry-editor__file a {
        background: #ffffff;
        border: 1px solid #4b8ff5;
        border-color: #4b8ff5;
        color: #4b8ff5;
        min-height: 38px;
        padding: 8px 10px;
      }

      button:disabled {
        border-color: rgba(41, 48, 59, 0.22);
        color: rgba(41, 48, 59, 0.45);
      }

      button:not(:disabled):hover,
      button:not(:disabled):focus-visible,
      .admin-case-entry-editor__actions a:hover,
      .admin-case-entry-editor__actions a:focus-visible,
      .admin-case-entry-editor__file a:hover,
      .admin-case-entry-editor__file a:focus-visible {
        background: #4b8ff5;
        color: #ffffff;
        outline: 0;
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

      .admin-case-entry-editor__file-list {
        display: grid;
        gap: 10px;
        margin-top: 12px;
      }

      .admin-case-entry-editor__file {
        align-items: center;
        border: 1px solid rgba(41, 48, 59, 0.14);
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        justify-content: space-between;
        padding: 12px;
      }

      .admin-case-entry-editor__file div {
        display: grid;
        gap: 4px;
      }

      .admin-case-entry-editor__file span {
        color: rgba(41, 48, 59, 0.68);
      }

      @media (max-width: 760px) {
        .admin-case-entry-editor__file-form {
          grid-template-columns: 1fr;
        }
      }

    `,
  ],
})
export class AdminCaseEntryEditorComponent implements OnInit {
  readonly caseId: string;
  readonly entryId: string;
  entry: Pick<CaseEntry, 'title' | 'text'> = { title: '', text: '' };
  visibilityMode = 'internal_only';
  files: CaseFile[] = [];
  oneDriveLink = {
    fileName: '',
    linkUrl: '',
    visibilityMode: 'internal_only',
  };
  oneDriveBusy = false;
  oneDriveError = '';
  canWriteEntries = false;
  canUploadFiles = false;
  canManageVisibility = false;
  canApproveFileVisibility = false;
  canDownloadFiles = false;
  saving = false;
  errorMessage = '';

  constructor(
    private _route: ActivatedRoute,
    private _router: Router,
    private _caseService: CaseService,
    private _authFacade: AuthFacade
  ) {
    this.caseId = this._route.snapshot.paramMap.get('caseId') || '';
    this.entryId = this._route.snapshot.paramMap.get('entryId') || '';
  }

  ngOnInit(): void {
    this.loadVisibilityAccess();
    if (!this.entryId) {
      return;
    }

    this.loadFiles();
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
    return (
      this.canWriteEntries &&
      this.entry.title.trim().length > 0 &&
      this.entry.text.trim().length > 0
    );
  }

  entryVisibleInPortal(): boolean {
    return this.visibilityMode !== 'internal_only';
  }

  canCreateOneDriveLink(): boolean {
    return (
      this.entryId.length > 0 &&
      this.canUploadFiles &&
      this.oneDriveLink.fileName.trim().length > 0 &&
      this.oneDriveLink.linkUrl.trim().length > 0 &&
      this.looksLikeMicrosoftLink(this.oneDriveLink.linkUrl)
    );
  }

  save(): void {
    if (!this.canSave()) {
      if (!this.canWriteEntries) {
        this.errorMessage = 'Tu usuario no tiene permisos para crear o editar entradas.';
      }
      return;
    }

    const payload: {
      title: string;
      text: string;
      visibility?: CaseVisibility;
    } = {
      title: this.entry.title.trim(),
      text: this.entry.text.trim(),
    };
    if (this.canManageVisibility) {
      payload.visibility = { mode: this.visibilityMode } as CaseVisibility;
    } else if (!this.entryId) {
      payload.visibility = { mode: 'internal_only' } as CaseVisibility;
    }
    const request = this.entryId
      ? this._caseService.updateEntry(this.caseId, this.entryId, payload)
      : this._caseService.createEntry(this.caseId, payload);

    this.saving = true;
    this.errorMessage = '';
    request.subscribe({
      next: (response) => {
        this.saving = false;
        void Swal.fire({
          title: 'Entrada guardada',
          text: 'La entrada del caso quedó actualizada.',
          icon: 'success',
        });
        void this._router.navigate(['/admin/casos', this.caseId, 'entradas', response.item.id]);
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = 'No se pudo guardar la entrada.';
        void Swal.fire({
          title: 'No se pudo guardar la entrada',
          text: String(error?.error?.message || error?.message || this.errorMessage),
          icon: 'error',
        });
      },
    });
  }

  addOneDriveLink(): void {
    if (!this.canCreateOneDriveLink()) {
      this.oneDriveError = !this.canUploadFiles
        ? 'Tu usuario no tiene permisos para agregar documentos a esta entrada.'
        : 'Revisa el nombre y usa un enlace válido de OneDrive o SharePoint.';
      return;
    }

    this.oneDriveBusy = true;
    this.oneDriveError = '';
    this._caseService
      .createOneDriveLink(this.caseId, {
        entryId: this.entryId,
        entryIds: [this.entryId],
        fileName: this.oneDriveLink.fileName.trim(),
        linkUrl: this.oneDriveLink.linkUrl.trim(),
        visibility: {
          mode: this.canApproveFileVisibility
            ? this.oneDriveLink.visibilityMode
            : 'internal_only',
        } as CaseVisibility,
      })
      .subscribe({
        next: (response) => {
          this.files = [response.item, ...this.files.filter((file) => file.id !== response.item.id)];
          this.oneDriveLink = {
            fileName: '',
            linkUrl: '',
            visibilityMode: 'internal_only',
          };
          this.oneDriveBusy = false;
          void Swal.fire({
            title: 'Documento agregado',
            text: 'El enlace quedó ligado a esta entrada.',
            icon: 'success',
          });
        },
        error: (error) => {
          this.oneDriveBusy = false;
          this.oneDriveError = String(
            error?.error?.message || error?.message || 'No se pudo agregar el documento.'
          );
          void Swal.fire({
            title: 'No se pudo agregar el documento',
            text: this.oneDriveError,
            icon: 'error',
          });
        },
      });
  }

  filesForEntry(entryId: string): CaseFile[] {
    return this.files.filter((file) => this.fileEntryIds(file).includes(entryId));
  }

  displayFileName(file: CaseFile): string {
    return file.title || file.originalName || file.fileName;
  }

  fileTypeLabel(file: CaseFile): string {
    if (this.isOneDriveFile(file)) {
      return 'Enlace de OneDrive o SharePoint';
    }
    return file.contentType || file.type || 'Documento';
  }

  fileReviewLabel(file: CaseFile): string {
    return file.externalVisibilityStatus === 'approved'
      ? 'Visible para el cliente'
      : 'En revisión interna';
  }

  fileHref(file: CaseFile): string {
    const linkUrl = String(file.webUrl || file.linkUrl || '').trim();
    if (this.isOneDriveFile(file) && linkUrl) {
      return linkUrl;
    }
    return apiUrl(`/cases/${encodeURIComponent(this.caseId)}/files/${encodeURIComponent(
      file.id
    )}/download`);
  }

  canDownloadFile(file: CaseFile): boolean {
    return file.uploadStatus !== 'pending_upload' && this.canDownloadFiles;
  }

  private visibilityModeFrom(visibility: CaseVisibility): string {
    return typeof visibility === 'object' ? visibility.mode : visibility || 'internal_only';
  }

  private loadFiles(): void {
    this._caseService.listFiles(this.caseId).subscribe({
      next: (response) => {
        this.files = response.items || [];
      },
      error: () => {
        this.files = [];
      },
    });
  }

  private loadVisibilityAccess(): void {
    if (this._authFacade.isAdmin()) {
      this.canWriteEntries = true;
      this.canUploadFiles = true;
      this.canManageVisibility = true;
      this.canApproveFileVisibility = true;
      this.canDownloadFiles = true;
      return;
    }
    this._caseService.listMembers(this.caseId).subscribe({
      next: (response) => {
        const membership = this.currentMembership(response.items || []);
        this.canWriteEntries = membership?.permissions?.includes('case.write_entry') === true;
        this.canUploadFiles = membership?.permissions?.includes('case.upload_file') === true;
        this.canManageVisibility =
          membership?.permissions?.includes('case.manage_entry_visibility') === true;
        this.canApproveFileVisibility =
          membership?.permissions?.includes('case.approve_file_visibility') === true;
        this.canDownloadFiles = membership?.permissions?.includes('case.download_file') === true;
      },
      error: () => {
        this.canWriteEntries = false;
        this.canUploadFiles = false;
        this.canManageVisibility = false;
        this.canApproveFileVisibility = false;
        this.canDownloadFiles = false;
      },
    });
  }

  private currentMembership(members: CaseMembership[]): CaseMembership | undefined {
    const identity = this._authFacade.identity?.();
    const userId = identity?.id || identity?.sub || identity?.userId;
    const email = String(identity?.email || '').toLowerCase();
    return members.find(
      (member) =>
        (userId && member.userId === userId) ||
        (email && member.email?.toLowerCase() === email)
    );
  }

  private fileEntryIds(file: CaseFile): string[] {
    const ids = Array.isArray(file.entryIds) ? file.entryIds : [];
    return Array.from(
      new Set(
        [...ids, file.entryId]
          .map((entryId) => String(entryId || '').trim())
          .filter(Boolean)
      )
    );
  }

  private isOneDriveFile(file: CaseFile): boolean {
    return file.storageProvider === 'onedrive' || file.type === 'onedrive-link';
  }

  private looksLikeMicrosoftLink(value: string): boolean {
    try {
      const url = new URL(value.trim());
      const hostname = url.hostname.toLowerCase();
      return (
        url.protocol === 'https:' &&
        (hostname === '1drv.ms' ||
          hostname.endsWith('.1drv.ms') ||
          hostname === 'onedrive.live.com' ||
          hostname.endsWith('.onedrive.live.com') ||
          hostname === 'sharepoint.com' ||
          hostname.endsWith('.sharepoint.com'))
      );
    } catch {
      return false;
    }
  }
}
