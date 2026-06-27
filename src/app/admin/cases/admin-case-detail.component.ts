import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import {
  CaseAuditEvent,
  CaseEntry,
  CaseFile,
  CaseMembership,
  CasePermission,
  CaseRecord,
  CaseStatusDefinition,
  CaseType,
  InviteCaseMemberRequest,
  caseStatusLabel,
} from '../../models/case';
import { CaseService } from '../../services/case.service';
import { isVisibleToCaseClient } from '../../utils/case-visibility';
import { RichTextEditorComponent } from '../../components/web-utility/rich-text-editor/rich-text-editor.component';

type CaseDraft = {
  title: string;
  reference: string;
  description: string;
  statusId: string;
};

type MemberDraft = {
  displayName: string;
  memberType: string;
  rolePreset: string;
  permissions: CasePermission[];
};

@Component({
  selector: 'app-admin-case-detail',
  imports: [CommonModule, FormsModule, RouterLink, RichTextEditorComponent],
  template: `
    <section class="admin-case-detail">
      <a routerLink="/admin/casos" class="admin-case-detail__back">Casos</a>
      <header class="admin-case-detail__header">
        <div class="admin-case-detail__summary">
          <p class="admin-case-detail__eyebrow">Workspace</p>
          <h1>{{ caseRecord?.title || 'Caso' }}</h1>
          <p>{{ caseRecord?.reference || caseId }}</p>
        </div>
        <form class="admin-case-detail__case-form" (ngSubmit)="saveCaseDetails()">
          <label>
            Título
            <input name="caseTitle" [(ngModel)]="caseDraft.title" />
          </label>
          <label>
            Referencia
            <input name="caseReference" [(ngModel)]="caseDraft.reference" />
          </label>
          <div class="admin-case-rich-field">
            <app-rich-text-editor
              label="Descripción"
              help="Resumen interno del caso. Puedes usar listas, negritas y enlaces."
              placeholder="Descripción del caso"
              [(value)]="caseDraft.description"
              minHeight="180px"
            />
          </div>
          <label>
            Estado
            <select id="case-status" name="status" [(ngModel)]="selectedStatusId">
              @for (status of statusesForCurrentType(); track status.id) {
              <option [value]="status.id">{{ statusLabel(status) }}</option>
              }
            </select>
          </label>
          <button
            type="submit"
            class="admin-case-detail__save"
            [disabled]="caseSaving || !canSaveCaseDetails()"
          >
            {{ caseSaving ? 'Guardando...' : 'Guardar caso' }}
          </button>
        </form>
      </header>

      <div class="admin-case-workspace">
        <section>
          <div class="admin-case-section-title">
            <h2>Entradas</h2>
            <a [routerLink]="['/admin/casos', caseId, 'entradas', 'nueva']">Nueva entrada</a>
          </div>
          <div class="admin-case-table-wrap">
            <table class="admin-case-table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Visibilidad</th>
                  <th>Actualización</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (entry of entries; track entry.id) {
                <tr>
                  <td>{{ entry.title }}</td>
                  <td>{{ entryVisibilityLabel(entry) }}</td>
                  <td>{{ formatDate(entry.updatedAt || entry.createdAt) }}</td>
                  <td class="admin-case-actions">
                    @if (entryVisibleInPortal(entry)) {
                    <a [routerLink]="['/casos', caseId, 'entrada', entry.id]">Ver portal</a>
                    }
                    <a [routerLink]="['/admin/casos', caseId, 'entradas', entry.id]">
                      Editar
                    </a>
                  </td>
                </tr>
                }
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2>Miembros</h2>
          <form class="admin-case-form" (ngSubmit)="inviteMember()">
            <label>
              Correo
              <input name="inviteEmail" [(ngModel)]="invite.email" />
            </label>
            <label>
              Nombre
              <input name="inviteName" [(ngModel)]="invite.displayName" />
            </label>
            <label>
              Rol en el caso
              <select name="inviteRole" [(ngModel)]="invite.rolePreset">
                <option value="client">Cliente</option>
                <option value="attorney">Abogado</option>
                <option value="pasante">Pasante</option>
                <option value="external_observer">Observador</option>
              </select>
            </label>
            <button type="submit">Invitar</button>
            <small class="admin-case-help">
              Los permisos se asignan por rol del caso: clientes comentan y abren documentos,
              pasantes colaboran internamente y observadores sólo consultan. La relación indica si
              pertenece al equipo de Moyra o es cliente/invitado del caso.
            </small>
          </form>
          <div class="admin-case-table-wrap">
            <table class="admin-case-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Relación</th>
                  <th>Permisos</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (member of members; track member.id) {
                <tr>
                  <td>{{ member.displayName || 'Sin nombre' }}</td>
                  <td>{{ member.email || member.userId || member.id }}</td>
                  <td>{{ roleLabel(member.rolePreset) }}</td>
                  <td>{{ memberTypeLabel(member.memberType) }}</td>
                  <td>{{ permissionsSummary(member.permissions) }}</td>
                  <td>
                    <button type="button" (click)="startEditMember(member)">Editar</button>
                  </td>
                </tr>
                @if (editingMemberId === member.id) {
                <tr>
                  <td colspan="6">
                    <form class="admin-case-member-editor" (ngSubmit)="saveMember(member)">
                      <label>
                        Nombre
                        <input name="memberName" [(ngModel)]="memberDraft.displayName" />
                      </label>
                      <label>
                        Rol
                        <select name="memberRole" [(ngModel)]="memberDraft.rolePreset">
                          <option value="client">Cliente</option>
                          <option value="attorney">Abogado</option>
                          <option value="pasante">Pasante</option>
                          <option value="external_observer">Observador</option>
                        </select>
                      </label>
                      <label>
                        Relación
                        <select name="memberType" [(ngModel)]="memberDraft.memberType">
                          <option value="external">Cliente o invitado externo</option>
                          <option value="internal">Equipo Moyra</option>
                        </select>
                      </label>
                      <fieldset>
                        <legend>Permisos</legend>
                        @for (permission of permissionOptions; track permission.value) {
                        <label>
                          <input
                            type="checkbox"
                            [checked]="memberDraft.permissions.includes(permission.value)"
                            (change)="toggleMemberPermission(permission.value, $event)"
                          />
                          {{ permission.label }}
                        </label>
                        }
                      </fieldset>
                      <div class="admin-case-actions">
                        <button type="submit" [disabled]="memberSavingId === member.id">
                          {{ memberSavingId === member.id ? 'Guardando...' : 'Guardar miembro' }}
                        </button>
                        <button type="button" (click)="cancelEditMember()">Cancelar</button>
                      </div>
                    </form>
                  </td>
                </tr>
                }
                }
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2>Archivos</h2>
          <form class="admin-case-form admin-case-form--stack" (ngSubmit)="addOneDriveLink()">
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
                name="oneDriveUrl"
                [(ngModel)]="oneDriveLink.linkUrl"
                placeholder="https://...sharepoint.com/..."
                type="url"
              />
            </label>
            <small class="admin-case-help">
              Para Casos se guardan enlaces privados de OneDrive o SharePoint; los demás módulos
              siguen usando S3.
            </small>
            @if (oneDriveError) {
            <p class="admin-case-error">{{ oneDriveError }}</p>
            }
            <button type="submit" [disabled]="oneDriveBusy || !canCreateOneDriveLink()">
              {{ oneDriveBusy ? 'Guardando...' : 'Agregar enlace' }}
            </button>
          </form>
          <div class="admin-case-files">
            @for (file of files; track file.id) {
            <article class="admin-case-file">
              <strong>{{ displayFileName(file) }}</strong>
              <span>{{ file.externalVisibilityStatus }}</span>
              @if (canDownloadFile(file)) {
              <a [href]="downloadUrl(file.id)" target="_blank" rel="noopener noreferrer">
                {{ isOneDriveFile(file) ? 'Abrir documento' : 'Descargar' }}
              </a>
              }
              <button type="button" (click)="approveFile(file.id)" [disabled]="!canApproveFile(file)">
                Aprobar visibilidad
              </button>
            </article>
            }
          </div>
        </section>

        <section>
          <h2>Auditoría</h2>
          <div class="admin-case-table-wrap">
            <table class="admin-case-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Quién</th>
                  <th>Acción</th>
                  <th>Objetivo</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                @for (event of auditEvents; track event.id) {
                <tr>
                  <td>{{ formatDate(event.createdAt) }}</td>
                  <td>{{ auditActor(event) }}</td>
                  <td>{{ auditActionLabel(event.action) }}</td>
                  <td>
                    @if (auditTargetLink(event); as targetLink) {
                    <a [routerLink]="targetLink">{{ auditTargetLabel(event) }}</a>
                    } @else {
                    {{ auditTargetLabel(event) }}
                    }
                  </td>
                  <td>{{ auditDetails(event) }}</td>
                </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  `,
  styles: [
    `
      .admin-case-detail {
        width: min(1180px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 24px 0;
        color: #29303b;
      }

      .admin-case-detail__back {
        color: #4b8ff5;
        text-decoration: none;
      }

      .admin-case-detail__header,
      .admin-case-workspace section {
        border: 1px solid rgba(41, 48, 59, 0.18);
        padding: 16px;
        background: #ffffff;
      }

      .admin-case-detail__header {
        display: grid;
        grid-template-columns: minmax(220px, 0.34fr) minmax(0, 1fr);
        gap: 16px;
        margin: 12px 0 16px;
      }

      .admin-case-detail__summary {
        min-width: min(320px, 100%);
      }

      .admin-case-detail__eyebrow {
        margin: 0;
        color: #4b8ff5;
        text-transform: uppercase;
        font-size: 0.85rem;
      }

      .admin-case-workspace {
        display: grid;
        gap: 16px;
      }

      .admin-case-section-title,
      .admin-case-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
      }

      .admin-case-section-title {
        justify-content: space-between;
        margin-bottom: 12px;
      }

      .admin-case-section-title h2 {
        margin: 0;
      }

      .admin-case-form,
      .admin-case-detail__case-form,
      .admin-case-file {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
      }

      .admin-case-detail__case-form {
        display: grid;
        grid-template-columns: repeat(3, minmax(160px, 1fr)) auto;
        align-items: end;
        width: 100%;
      }

      .admin-case-detail__case-form label,
      .admin-case-form label,
      .admin-case-member-editor label {
        display: grid;
        gap: 4px;
        color: rgba(41, 48, 59, 0.72);
        font-size: 0.82rem;
        font-weight: 700;
      }

      .admin-case-rich-field {
        grid-column: 1 / -1;
      }

      .admin-case-detail__save {
        justify-self: end;
        min-width: 132px;
      }

      .admin-case-form {
        display: grid;
        grid-template-columns: minmax(220px, 1.1fr) minmax(180px, 0.9fr) minmax(160px, 220px) auto;
        align-items: end;
        margin-bottom: 16px;
      }

      .admin-case-form--stack {
        align-items: stretch;
        display: grid;
        grid-template-columns: 1fr;
        margin-bottom: 16px;
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

      .admin-case-help {
        color: rgba(41, 48, 59, 0.68);
        line-height: 1.45;
      }

      .admin-case-error {
        color: #b42318;
        margin: 0;
      }

      button {
        background: #ffffff;
        border: 1px solid #4b8ff5;
        border-color: #4b8ff5;
        color: #4b8ff5;
        min-height: 36px;
        padding: 6px 10px;
      }

      a {
        color: #4b8ff5;
        text-decoration: none;
      }

      button:not(:disabled):hover,
      button:not(:disabled):focus-visible,
      a:hover,
      a:focus-visible {
        background: #4b8ff5;
        color: #ffffff;
        outline: 0;
      }

      .admin-case-table-wrap {
        overflow-x: auto;
      }

      .admin-case-table {
        width: 100%;
        border-collapse: collapse;
      }

      .admin-case-table th,
      .admin-case-table td {
        border: 1px solid rgba(41, 48, 59, 0.18);
        padding: 9px 10px;
        text-align: left;
        vertical-align: top;
      }

      .admin-case-table th {
        background: #f5f7fa;
      }

      .admin-case-member-editor {
        display: grid;
        gap: 12px;
      }

      .admin-case-member-editor fieldset {
        border: 1px solid rgba(41, 48, 59, 0.18);
        display: grid;
        gap: 6px;
      }

      .admin-case-file {
        justify-content: space-between;
        border-top: 1px solid rgba(41, 48, 59, 0.12);
        padding: 10px 0;
      }

      @media (max-width: 920px) {
        .admin-case-detail__header,
        .admin-case-detail__case-form,
        .admin-case-form {
          grid-template-columns: 1fr;
        }

        .admin-case-detail__save {
          justify-self: stretch;
        }
      }
    `,
  ],
})
export class AdminCaseDetailComponent implements OnInit {
  readonly caseId: string;
  caseRecord: CaseRecord | null = null;
  caseTypes: CaseType[] = [];
  entries: CaseEntry[] = [];
  members: CaseMembership[] = [];
  files: CaseFile[] = [];
  auditEvents: CaseAuditEvent[] = [];
  selectedStatusId = '';
  caseDraft: CaseDraft = {
    title: '',
    reference: '',
    description: '',
    statusId: '',
  };
  caseSaving = false;
  invite: InviteCaseMemberRequest = {
    email: '',
    displayName: '',
    rolePreset: 'client',
  };
  readonly permissionOptions: Array<{ value: CasePermission; label: string }> = [
    { value: 'case.read', label: 'Ver caso' },
    { value: 'case.write_entry', label: 'Publicar entradas' },
    { value: 'case.comment', label: 'Comentar' },
    { value: 'case.upload_file', label: 'Agregar documentos' },
    { value: 'case.download_file', label: 'Abrir documentos' },
    { value: 'case.manage_members', label: 'Administrar miembros' },
    { value: 'case.manage_permissions', label: 'Administrar permisos' },
    { value: 'case.manage_status', label: 'Cambiar estado' },
    { value: 'case.approve_file_visibility', label: 'Aprobar documentos' },
    { value: 'case.read_audit', label: 'Ver auditoría' },
  ];
  editingMemberId = '';
  memberSavingId = '';
  memberDraft: MemberDraft = {
    displayName: '',
    memberType: 'external',
    rolePreset: 'client',
    permissions: [],
  };
  oneDriveLink = {
    fileName: '',
    linkUrl: '',
  };
  oneDriveBusy = false;
  oneDriveError = '';

  constructor(
    private _route: ActivatedRoute,
    private _caseService: CaseService
  ) {
    this.caseId = this._route.snapshot.paramMap.get('caseId') || '';
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    forkJoin({
      caseRecord: this._caseService.getCase(this.caseId),
      caseTypes: this._caseService.listCaseTypes(),
      entries: this._caseService.listEntries(this.caseId),
      members: this._caseService.listMembers(this.caseId),
      files: this._caseService.listFiles(this.caseId),
      auditEvents: this._caseService.listAuditEvents(this.caseId),
    }).subscribe(({ caseRecord, caseTypes, entries, members, files, auditEvents }) => {
      this.caseRecord = caseRecord.item;
      this.caseTypes = caseTypes.items || [];
      this.entries = entries.items || [];
      this.members = members.items || [];
      this.files = files.items || [];
      this.auditEvents = auditEvents.items || [];
      this.selectedStatusId = this.caseRecord.statusId;
      this.caseDraft = {
        title: this.caseRecord.title || '',
        reference: this.caseRecord.reference || '',
        description: this.caseRecord.description || '',
        statusId: this.caseRecord.statusId || '',
      };
    });
  }

  canSaveCaseDetails(): boolean {
    return this.caseDraft.title.trim().length > 0 && Boolean(this.selectedStatusId);
  }

  saveCaseDetails(): void {
    if (!this.canSaveCaseDetails()) {
      return;
    }
    this.caseSaving = true;
    this._caseService
      .updateCase(this.caseId, {
        title: this.caseDraft.title.trim(),
        reference: this.caseDraft.reference.trim(),
        description: this.caseDraft.description.trim(),
      })
      .subscribe({
        next: (response) => {
          this.caseRecord = response.item;
          if (this.selectedStatusId && this.selectedStatusId !== response.item.statusId) {
            this._caseService
              .updateCaseStatus(this.caseId, { statusId: this.selectedStatusId })
              .subscribe({
                next: (statusResponse) => {
                  this.caseRecord = statusResponse.item;
                  this.caseSaving = false;
                },
                error: () => {
                  this.caseSaving = false;
                },
              });
            return;
          }
          this.caseSaving = false;
        },
        error: () => {
          this.caseSaving = false;
        },
      });
  }

  inviteMember(): void {
    if (!this.invite.email) {
      return;
    }
    const payload = this.cleanInvitePayload();
    this._caseService.inviteMember(this.caseId, payload).subscribe((response) => {
      this.members = [response.item, ...this.members];
      this.invite = {
        email: '',
        displayName: '',
        rolePreset: 'client',
      };
    });
  }

  addOneDriveLink(): void {
    if (!this.canCreateOneDriveLink()) {
      this.oneDriveError = 'Revisa el nombre y usa un enlace de OneDrive o SharePoint válido.';
      return;
    }

    this.oneDriveBusy = true;
    this.oneDriveError = '';
    this._caseService.createOneDriveLink(this.caseId, {
      fileName: this.oneDriveLink.fileName.trim(),
      linkUrl: this.oneDriveLink.linkUrl.trim(),
      visibility: { mode: 'case_members' },
    }).subscribe({
      next: (response) => {
        this.files = [response.item, ...this.files];
        this.oneDriveLink = { fileName: '', linkUrl: '' };
        this.oneDriveBusy = false;
      },
      error: () => {
        this.oneDriveBusy = false;
        this.oneDriveError = 'No se pudo agregar el enlace de OneDrive.';
      },
    });
  }

  approveFile(fileId: string): void {
    this._caseService
      .updateFileVisibility(this.caseId, fileId, {
        externalVisibilityStatus: 'approved',
        visibility: { mode: 'case_members' },
      })
      .subscribe();
  }

  startEditMember(member: CaseMembership): void {
    this.editingMemberId = member.id;
    this.memberDraft = {
      displayName: member.displayName || '',
      memberType: member.memberType || 'external',
      rolePreset: member.rolePreset || 'client',
      permissions: [...(member.permissions || [])],
    };
  }

  cancelEditMember(): void {
    this.editingMemberId = '';
    this.memberSavingId = '';
  }

  toggleMemberPermission(permission: CasePermission, event: Event): void {
    const checked = (event.target as HTMLInputElement | null)?.checked === true;
    const permissions = new Set(this.memberDraft.permissions);
    if (checked) {
      permissions.add(permission);
    } else {
      permissions.delete(permission);
    }
    this.memberDraft.permissions = Array.from(permissions);
  }

  saveMember(member: CaseMembership): void {
    this.memberSavingId = member.id;
    this._caseService
      .updateMember(this.caseId, member.id, {
        displayName: this.memberDraft.displayName.trim(),
        memberType: this.memberDraft.memberType,
        rolePreset: this.memberDraft.rolePreset,
      })
      .subscribe({
        next: (memberResponse) => {
          this._caseService
            .updateMemberPermissions(this.caseId, member.id, {
              permissions: this.memberDraft.permissions,
            })
            .subscribe({
              next: (permissionsResponse) => {
                const updated = { ...memberResponse.item, ...permissionsResponse.item };
                this.members = this.members.map((item) =>
                  item.id === updated.id ? updated : item
                );
                this.cancelEditMember();
              },
              error: () => {
                this.memberSavingId = '';
              },
            });
        },
        error: () => {
          this.memberSavingId = '';
        },
      });
  }

  statusesForCurrentType(): CaseStatusDefinition[] {
    const caseTypeId = this.caseRecord?.caseTypeId || '';
    const currentStatusId = this.caseRecord?.statusId || this.selectedStatusId;
    return (
      this.caseTypes
        .find((caseType) => caseType.id === caseTypeId)
        ?.statuses?.filter((status) => status.active !== false || status.id === currentStatusId) ||
      []
    );
  }

  statusLabel(status: CaseStatusDefinition): string {
    return caseStatusLabel(status);
  }

  entryVisibleInPortal(entry: CaseEntry): boolean {
    return isVisibleToCaseClient(entry.visibility);
  }

  entryVisibilityLabel(entry: CaseEntry): string {
    return this.entryVisibleInPortal(entry) ? 'Visible para cliente' : 'Sólo interno';
  }

  roleLabel(role: string): string {
    return (
      {
        attorney: 'Abogado',
        pasante: 'Pasante',
        client: 'Cliente',
        external_observer: 'Observador',
        observer: 'Observador',
      }[role] || role
    );
  }

  memberTypeLabel(type: string): string {
    return type === 'internal' ? 'Equipo Moyra' : 'Cliente o invitado externo';
  }

  permissionsSummary(permissions: CasePermission[]): string {
    if (!permissions?.length) {
      return 'Sin permisos';
    }
    return permissions
      .map((permission) =>
        this.permissionOptions.find((option) => option.value === permission)?.label || permission
      )
      .join(', ');
  }

  auditActor(event: CaseAuditEvent): string {
    const actorId = event.actorUserId || '';
    const member = this.members.find(
      (candidate) =>
        (actorId && candidate.userId === actorId) ||
        (event.actorEmail && candidate.email === event.actorEmail)
    );
    return (
      event.actorDisplayName ||
      member?.displayName ||
      event.actorEmail ||
      member?.email ||
      (actorId ? 'Usuario del caso' : 'Sistema')
    );
  }

  auditActionLabel(action: string): string {
    return (
      {
        'case.created': 'Creó el caso',
        'case.updated': 'Editó el caso',
        'case.status.updated': 'Cambió el estado',
        'case.entry.created': 'Creó una entrada',
        'case.entry.updated': 'Editó una entrada',
        'case.member.created': 'Agregó miembro',
        'case.member.invited': 'Invitó miembro',
        'case.member.updated': 'Editó miembro',
        'case.member.permissions_updated': 'Cambió permisos',
        'case.file.onedrive_link_added': 'Agregó enlace OneDrive',
        'case.file.visibility_updated': 'Cambió visibilidad de archivo',
      }[action] || action
    );
  }

  auditDetails(event: CaseAuditEvent): string {
    const source = event.after || event.before;
    if (!source) {
      return 'Sin detalle';
    }
    const details = Object.entries(source)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => `${this.auditFieldLabel(key)}: ${this.auditValueLabel(key, value)}`);
    return details.length ? details.join('; ') : 'Sin detalle';
  }

  auditTargetLabel(event: CaseAuditEvent): string {
    if (event.targetType === 'case') {
      return this.caseRecord?.title || this.caseRecord?.reference || 'Caso';
    }
    if (event.targetType === 'entry') {
      const entry = this.entries.find((item) => item.id === event.targetId);
      return entry?.title || 'Entrada del caso';
    }
    if (event.targetType === 'member') {
      const member = this.members.find((item) => item.id === event.targetId || item.userId === event.targetId);
      return member?.displayName || member?.email || 'Miembro del caso';
    }
    if (event.targetType === 'file') {
      const file = this.files.find((item) => item.id === event.targetId);
      return file ? this.displayFileName(file) : 'Documento del caso';
    }
    return this.auditTargetTypeLabel(event.targetType);
  }

  auditTargetLink(event: CaseAuditEvent): string[] | null {
    if (event.targetType === 'case') {
      return ['/admin/casos', this.caseId];
    }
    if (event.targetType === 'entry' && event.targetId) {
      return ['/admin/casos', this.caseId, 'entradas', event.targetId];
    }
    return null;
  }

  formatDate(value?: string): string {
    if (!value) {
      return 'Sin fecha';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Mexico_City',
    }).format(date);
  }

  canApproveFile(file: CaseFile): boolean {
    return file.uploadStatus !== 'pending_upload';
  }

  canDownloadFile(file: CaseFile): boolean {
    return file.uploadStatus !== 'pending_upload';
  }

  downloadUrl(fileId: string): string {
    return `/api/v2/cases/${encodeURIComponent(this.caseId)}/files/${encodeURIComponent(
      fileId
    )}/download`;
  }

  canCreateOneDriveLink(): boolean {
    return (
      this.oneDriveLink.fileName.trim().length > 0 &&
      this.oneDriveLink.linkUrl.trim().length > 0 &&
      this.looksLikeMicrosoftLink(this.oneDriveLink.linkUrl)
    );
  }

  displayFileName(file: CaseFile): string {
    return file.title || file.originalName || file.fileName;
  }

  isOneDriveFile(file: CaseFile): boolean {
    return file.storageProvider === 'onedrive' || file.type === 'onedrive-link';
  }

  private cleanInvitePayload(): InviteCaseMemberRequest {
    return {
      email: this.invite.email.trim().toLowerCase(),
      displayName: this.invite.displayName?.trim(),
      rolePreset: this.invite.rolePreset,
    };
  }

  private auditFieldLabel(key: string): string {
    return (
      {
        title: 'Título',
        reference: 'Referencia',
        description: 'Descripción',
        statusId: 'Estado',
        caseTypeId: 'Tipo de caso',
        visibility: 'Visibilidad',
        rolePreset: 'Rol en el caso',
        memberType: 'Relación',
        permissions: 'Permisos',
        displayName: 'Nombre',
        email: 'Correo',
        fileName: 'Documento',
        linkUrl: 'Enlace',
        externalVisibilityStatus: 'Visibilidad del documento',
        text: 'Contenido',
      }[key] || key
    );
  }

  private auditValueLabel(key: string, value: unknown): string {
    if (key === 'statusId') {
      return this.statusName(String(value));
    }
    if (key === 'caseTypeId') {
      return this.caseTypeName(String(value));
    }
    if (key === 'rolePreset') {
      return this.roleLabel(String(value));
    }
    if (key === 'memberType') {
      return this.memberTypeLabel(String(value));
    }
    if (key === 'permissions' && Array.isArray(value)) {
      return this.permissionsSummary(value as CasePermission[]);
    }
    if (key === 'visibility') {
      return this.visibilityLabel(value);
    }
    if (key === 'externalVisibilityStatus') {
      return this.fileVisibilityStatusLabel(String(value));
    }
    if (typeof value === 'boolean') {
      return value ? 'Sí' : 'No';
    }
    if (typeof value === 'object' && value !== null) {
      return this.visibilityLabel(value);
    }
    return String(value);
  }

  private auditTargetTypeLabel(type: string): string {
    return (
      {
        case: 'Caso',
        entry: 'Entrada del caso',
        member: 'Miembro del caso',
        file: 'Documento del caso',
      }[type] || type
    );
  }

  private visibilityLabel(value: unknown): string {
    const mode =
      typeof value === 'object' && value !== null
        ? String((value as { mode?: string }).mode || '')
        : String(value || '');
    return (
      {
        case_members: 'Visible para miembros del caso',
        internal_only: 'Sólo equipo Moyra',
        selected_members: 'Miembros seleccionados',
        selected_parties: 'Partes seleccionadas',
      }[mode] || mode || 'Sin visibilidad'
    );
  }

  private fileVisibilityStatusLabel(status: string): string {
    return (
      {
        pending: 'Pendiente de revisión',
        approved: 'Visible para cliente',
        restricted: 'Restringido',
        rejected: 'Rechazado',
      }[status] || status
    );
  }

  private caseTypeName(caseTypeId: string): string {
    return this.caseTypes.find((caseType) => caseType.id === caseTypeId)?.name || caseTypeId;
  }

  private statusName(statusId: string): string {
    const status = this.caseTypes
      .flatMap((caseType) => caseType.statuses || [])
      .find((candidate) => candidate.id === statusId);
    return status ? this.statusLabel(status) : statusId;
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
