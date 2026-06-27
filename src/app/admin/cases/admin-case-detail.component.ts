import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, map, Observable, of, switchMap } from 'rxjs';
import Swal from 'sweetalert2';

import {
  CaseAuditEvent,
  CaseEntry,
  CaseFile,
  CaseMemberType,
  CaseMembership,
  CasePermission,
  CaseRecord,
  CaseRolePreset,
  CaseStatusDefinition,
  CaseType,
  InviteCaseMemberRequest,
  caseStatusLabel,
} from '../../models/case';
import { SafeRichHtmlPipe } from '../../pipes/safe-rich-html';
import { CaseService } from '../../services/case.service';
import { UserService } from '../../services/user.service';
import { isVisibleToCaseClient } from '../../utils/case-visibility';
import { RichTextEditorComponent } from '../../components/web-utility/rich-text-editor/rich-text-editor.component';
import { AuthFacade } from '../../store/auth/auth.facade';

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

type ExistingMemberDraft = {
  userKey: string;
  memberType: CaseMemberType;
  rolePreset: CaseRolePreset;
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
  selector: 'app-admin-case-detail',
  imports: [CommonModule, FormsModule, RouterLink, RichTextEditorComponent, SafeRichHtmlPipe],
  template: `
    <section class="admin-case-detail">
      <a routerLink="/admin/casos" class="admin-case-detail__back">Casos</a>
      <header class="admin-case-detail__header">
        <div class="admin-case-detail__summary">
          <p class="admin-case-detail__eyebrow">Workspace</p>
          <h1>{{ caseRecord?.title || 'Caso' }}</h1>
          <p>{{ caseRecord?.reference || caseId }}</p>
          <div class="admin-case-detail__description">
            <strong>Descripción</strong>
            <div [innerHTML]="summaryDescription() | safeRichHtml"></div>
          </div>
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
                    <a [routerLink]="['/casos', caseId, 'entrada', entry.id]">Ver la entrada</a>
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
          <div class="admin-case-member-tools">
            <form class="admin-case-form" (ngSubmit)="addExistingMember()">
              <label>
                Usuario existente
                <select name="existingMemberUser" [(ngModel)]="existingMember.userKey">
                  <option value="">Selecciona usuario</option>
                  @for (user of availableUsersForCase(); track userKey(user)) {
                  <option [value]="userKey(user)">{{ userOptionLabel(user) }}</option>
                  }
                </select>
              </label>
              <label>
                Rol en el caso
                <select name="existingMemberRole" [(ngModel)]="existingMember.rolePreset">
                  <option value="client">Cliente</option>
                  <option value="attorney">Abogado</option>
                  <option value="pasante">Pasante</option>
                  <option value="external_observer">Observador</option>
                </select>
              </label>
              <label>
                Relación
                <select name="existingMemberType" [(ngModel)]="existingMember.memberType">
                  <option value="external">Cliente o invitado externo</option>
                  <option value="internal">Equipo Moyra</option>
                </select>
              </label>
              <button type="submit" [disabled]="memberAdding || !canAddExistingMember()">
                {{ memberAdding ? 'Agregando...' : 'Agregar miembro' }}
              </button>
            </form>
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
              <label>
                Relación
                <select name="inviteMemberType" [(ngModel)]="inviteMemberType">
                  <option value="external">Cliente o invitado externo</option>
                  <option value="internal">Equipo Moyra</option>
                </select>
              </label>
              <button type="submit" [disabled]="inviteBusy || !invite.email">
                {{ inviteBusy ? 'Invitando...' : 'Invitar' }}
              </button>
            </form>
            <small class="admin-case-help">
              Los permisos se asignan por rol del caso: clientes comentan y abren documentos,
              pasantes colaboran internamente y observadores sólo consultan. La relación indica si
              pertenece al equipo de Moyra o es cliente/invitado del caso.
            </small>
          </div>
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
                  <td>
                    @if (memberProfileLink(member); as profileLink) {
                    <a [routerLink]="profileLink">{{ memberName(member) }}</a>
                    } @else {
                    {{ memberName(member) }}
                    }
                  </td>
                  <td>{{ member.email || 'Sin correo' }}</td>
                  <td>{{ roleLabel(member.rolePreset) }}</td>
                  <td>{{ memberTypeLabel(member.memberType) }}</td>
                  <td>{{ permissionsSummary(member.permissions) }}</td>
                  <td>
                    <div class="admin-case-actions">
                      <button type="button" (click)="startEditMember(member)">Editar</button>
                      <button
                        type="button"
                        class="admin-case-button-danger"
                        [disabled]="memberRemovingId === member.id"
                        (click)="removeMember(member)"
                      >
                        {{ memberRemovingId === member.id ? 'Quitando...' : 'Quitar' }}
                      </button>
                    </div>
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
                  <td>
                    @if (auditActorLink(event); as actorLink) {
                    <a [routerLink]="actorLink">{{ auditActor(event) }}</a>
                    } @else {
                    {{ auditActor(event) }}
                    }
                  </td>
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
        grid-template-columns: 1fr;
        gap: 16px;
        margin: 12px 0 16px;
      }

      .admin-case-detail__summary {
        width: 100%;
      }

      .admin-case-detail__eyebrow {
        margin: 0;
        color: #4b8ff5;
        text-transform: uppercase;
        font-size: 0.85rem;
      }

      .admin-case-detail__description {
        border-top: 1px solid rgba(41, 48, 59, 0.12);
        margin-top: 12px;
        padding-top: 12px;
      }

      .admin-case-detail__description strong {
        display: block;
        margin-bottom: 6px;
      }

      .admin-case-detail__description :where(em, i) {
        font-style: italic;
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

      .admin-case-member-tools {
        display: grid;
        gap: 12px;
        margin-bottom: 16px;
      }

      .admin-case-member-tools .admin-case-form {
        margin-bottom: 0;
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
        color: #4b8ff5;
        min-height: 36px;
        padding: 6px 10px;
      }

      .admin-case-button-danger {
        border-color: #b42318;
        color: #b42318;
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
        grid-template-columns: repeat(2, minmax(180px, 1fr));
        padding: 12px 12px 12px 16px;
      }

      .admin-case-member-editor fieldset legend {
        grid-column: 1 / -1;
        font-weight: 800;
        margin-bottom: 8px;
        padding: 0 6px;
        width: 100%;
      }

      .admin-case-member-editor fieldset label {
        align-items: center;
        display: flex;
        flex-direction: row;
        gap: 8px;
        margin-left: 8px;
      }

      .admin-case-file {
        justify-content: space-between;
        border-top: 1px solid rgba(41, 48, 59, 0.12);
        padding: 10px 0;
      }

      @media (max-width: 920px) {
        .admin-case-detail__header,
        .admin-case-detail__case-form,
        .admin-case-form,
        .admin-case-member-editor fieldset {
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
  users: PlatformUser[] = [];
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
  inviteMemberType: CaseMemberType = 'external';
  inviteBusy = false;
  existingMember: ExistingMemberDraft = {
    userKey: '',
    memberType: 'internal',
    rolePreset: 'attorney',
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
    { value: 'case.manage_notifications', label: 'Administrar notificaciones' },
  ];
  editingMemberId = '';
  memberSavingId = '';
  memberRemovingId = '';
  memberAdding = false;
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
    private _caseService: CaseService,
    private _userService: UserService,
    private _authFacade: AuthFacade
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
      users: this._userService.getUsers(0, 200, '-create_at').pipe(catchError(() => of([]))),
      knownCaseUsers: this.caseMemberUsers(),
    }).subscribe(({ caseRecord, caseTypes, entries, members, files, auditEvents, users, knownCaseUsers }) => {
      this.caseRecord = caseRecord.item;
      this.caseTypes = caseTypes.items || [];
      this.entries = entries.items || [];
      this.members = members.items || [];
      this.files = files.items || [];
      this.auditEvents = auditEvents.items || [];
      this.users = this.withCurrentUser(
        this.mergeUsers([...this.normalizeUsers(users), ...knownCaseUsers])
      );
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
                  this.showSuccess('Caso guardado', 'Los datos del caso se actualizaron.');
                },
                error: (error) => {
                  this.caseSaving = false;
                  this.showError(
                    'No se pudo actualizar el estado',
                    'Los datos principales se guardaron, pero el estado no se pudo actualizar.',
                    error
                  );
                },
              });
            return;
          }
          this.caseSaving = false;
          this.showSuccess('Caso guardado', 'Los datos del caso se actualizaron.');
        },
        error: (error) => {
          this.caseSaving = false;
          this.showError('No se pudo guardar el caso', 'Intenta nuevamente.', error);
        },
      });
  }

  inviteMember(): void {
    if (!this.invite.email) {
      return;
    }
    const payload = this.cleanInvitePayload();
    this.inviteBusy = true;
    this._caseService.inviteMember(this.caseId, payload).subscribe({
      next: (response) => {
        this.finishAddedMember(
          response.item,
          this.inviteMemberType,
          () => {
            this.invite = {
              email: '',
              displayName: '',
              rolePreset: 'client',
            };
            this.inviteMemberType = 'external';
            this.inviteBusy = false;
          },
          'Invitación enviada'
        );
      },
      error: (error) => {
        this.inviteBusy = false;
        this.showError('No se pudo invitar al miembro', 'Revisa el correo e intenta nuevamente.', error);
      },
    });
  }

  addExistingMember(): void {
    if (!this.canAddExistingMember()) {
      return;
    }

    const user = this.selectedExistingUser();
    if (!user?.email) {
      return;
    }

    this.memberAdding = true;
    this._caseService
      .inviteMember(this.caseId, {
        email: user.email.trim().toLowerCase(),
        displayName: this.userName(user) || user.email,
        rolePreset: this.existingMember.rolePreset,
      })
      .subscribe({
        next: (response) => {
          this.finishAddedMember(
            response.item,
            this.existingMember.memberType,
            () => {
              this.existingMember = {
                userKey: '',
                memberType: 'internal',
                rolePreset: 'attorney',
              };
              this.memberAdding = false;
            },
            'Miembro agregado'
          );
        },
        error: (error) => {
          this.memberAdding = false;
          this.showError(
            'No se pudo agregar el miembro',
            'Revisa que el usuario no esté ya asignado a este caso.',
            error
          );
        },
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
        this.showSuccess('Enlace agregado', 'El documento de OneDrive quedó registrado.');
      },
      error: (error) => {
        this.oneDriveBusy = false;
        this.oneDriveError = 'No se pudo agregar el enlace de OneDrive.';
        this.showError('No se pudo agregar el enlace', this.oneDriveError, error);
      },
    });
  }

  approveFile(fileId: string): void {
    this._caseService
      .updateFileVisibility(this.caseId, fileId, {
        externalVisibilityStatus: 'approved',
        visibility: { mode: 'case_members' },
      })
      .subscribe({
        next: (response) => {
          this.files = this.files.map((file) => (file.id === fileId ? response.item : file));
          this.showSuccess('Documento aprobado', 'El documento ya puede verse según sus permisos.');
        },
        error: (error) => {
          this.showError('No se pudo aprobar el documento', 'Intenta nuevamente.', error);
        },
      });
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
                this.showSuccess('Miembro guardado', 'Rol, relación y permisos quedaron actualizados.');
              },
              error: (error) => {
                this.memberSavingId = '';
                this.showError(
                  'No se pudieron guardar los permisos',
                  'El miembro se actualizó, pero sus permisos no pudieron guardarse.',
                  error
                );
              },
            });
        },
        error: (error) => {
          this.memberSavingId = '';
          this.showError('No se pudo guardar el miembro', 'Intenta nuevamente.', error);
        },
      });
  }

  async removeMember(member: CaseMembership): Promise<void> {
    if (!member.id) {
      return;
    }

    const confirmation = await Swal.fire({
      title: 'Quitar miembro',
      text: `¿Quitar a ${this.memberName(member)} del caso? El usuario no será eliminado.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Quitar',
      cancelButtonText: 'Cancelar',
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    this.memberRemovingId = member.id;
    this._caseService.removeMember(this.caseId, member.id).subscribe({
      next: () => {
        this.members = this.members.filter((item) => item.id !== member.id);
        if (this.editingMemberId === member.id) {
          this.cancelEditMember();
        }
        this.memberRemovingId = '';
        this.showSuccess('Miembro quitado', 'El usuario dejó de estar asignado a este caso.');
      },
      error: (error) => {
        this.memberRemovingId = '';
        this.showError('No se pudo quitar el miembro', 'Intenta nuevamente.', error);
      },
    });
  }

  availableUsersForCase(): PlatformUser[] {
    const assigned = new Set<string>();
    this.members.forEach((member) => {
      if (member.userId) {
        assigned.add(member.userId.toLowerCase());
      }
      if (member.email) {
        assigned.add(member.email.toLowerCase());
      }
    });
    return this.users.filter((user) => {
      const key = this.userKey(user).toLowerCase();
      const email = String(user.email || '').toLowerCase();
      return Boolean(email) && !assigned.has(key) && !assigned.has(email);
    });
  }

  canAddExistingMember(): boolean {
    return Boolean(this.selectedExistingUser()?.email);
  }

  userOptionLabel(user: PlatformUser): string {
    const name = this.userName(user) || user.email || 'Usuario';
    return user.email && name !== user.email ? `${name} - ${user.email}` : name;
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

  memberName(member: CaseMembership): string {
    return this.humanName(member.displayName, member.userId || member.id) || member.email || 'Sin nombre';
  }

  summaryDescription(): string {
    return this.caseRecord?.description?.trim() || '<p>Sin descripción.</p>';
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
    const user = this.auditActorUser(event);
    const member = this.auditActorMember(event);
    const name =
      this.humanName(event.actorDisplayName, event.actorUserId) ||
      this.userName(user) ||
      this.humanName(member?.displayName, member?.userId) ||
      user?.email ||
      member?.email ||
      event.actorEmail ||
      'Usuario';
    const email = event.actorEmail || user?.email || member?.email || '';
    if (name === 'Usuario' && !email && !event.actorUserId) {
      return 'Sistema';
    }
    return email && name !== email ? `${name} (${email})` : name;
  }

  auditActorLink(event: CaseAuditEvent): string[] | null {
    const user = this.auditActorUser(event);
    const member = this.auditActorMember(event);
    const key = this.userKey(user) || member?.userId || event.actorUserId || member?.email || event.actorEmail;
    return key ? ['/admin/usuarios', key] : null;
  }

  memberProfileLink(member: CaseMembership): string[] | null {
    const key = member.userId || member.email;
    return key ? ['/admin/usuarios', key] : null;
  }

  userProfileLink(userIdOrEmail: string): string[] | null {
    return userIdOrEmail ? ['/admin/usuarios', userIdOrEmail] : null;
  }

  private auditActorUser(event: CaseAuditEvent): PlatformUser | undefined {
    return this.findUser(event.actorUserId || event.actorEmail || '');
  }

  private auditActorMember(event: CaseAuditEvent): CaseMembership | undefined {
    const actorId = event.actorUserId || '';
    return (
      this.members.find(
        (candidate) =>
          (actorId && candidate.userId === actorId) ||
          (event.actorEmail && candidate.email === event.actorEmail)
      )
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
        'case.member.removed': 'Quitó miembro',
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
    if (event.targetType === 'case-entry') {
      const entry = this.entries.find((item) => item.id === event.targetId);
      return entry?.title || 'Entrada del caso';
    }
    if (event.targetType === 'member') {
      const member = this.members.find((item) => item.id === event.targetId || item.userId === event.targetId);
      return member ? this.memberName(member) : 'Miembro del caso';
    }
    if (event.targetType === 'case-membership') {
      const member = this.members.find((item) => item.id === event.targetId || item.userId === event.targetId);
      return member ? this.memberName(member) : 'Miembro del caso';
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
    if ((event.targetType === 'entry' || event.targetType === 'case-entry') && event.targetId) {
      return ['/admin/casos', this.caseId, 'entradas', event.targetId];
    }
    if ((event.targetType === 'member' || event.targetType === 'case-membership') && event.targetId) {
      const member = this.members.find((item) => item.id === event.targetId || item.userId === event.targetId);
      return this.memberProfileLink(member || ({ userId: event.targetId } as CaseMembership));
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

  userKey(user?: PlatformUser): string {
    return String(user?.id || user?._id || user?.sub || user?.email || '').trim();
  }

  private selectedExistingUser(): PlatformUser | undefined {
    return this.availableUsersForCase().find(
      (user) => this.userKey(user) === this.existingMember.userKey
    );
  }

  private finishAddedMember(
    member: CaseMembership,
    memberType: CaseMemberType,
    resetForm: () => void,
    successTitle: string
  ): void {
    if (!member.id) {
      this.upsertMember(member);
      resetForm();
      this.showSuccess(successTitle, 'La membresía quedó registrada.');
      return;
    }

    this._caseService.updateMember(this.caseId, member.id, { memberType }).subscribe({
      next: (response) => {
        this.upsertMember(response.item);
        resetForm();
        this.showSuccess(successTitle, 'La membresía quedó registrada.');
      },
      error: (error) => {
        this.upsertMember(member);
        resetForm();
        this.showWarning(
          successTitle,
          'El miembro se agregó, pero no se pudo actualizar su relación. Edita el miembro para corregirlo.',
          error
        );
      },
    });
  }

  private upsertMember(member: CaseMembership): void {
    const exists = this.members.some((item) => item.id === member.id);
    this.members = exists
      ? this.members.map((item) => (item.id === member.id ? member : item))
      : [member, ...this.members];
  }

  private caseMemberUsers(): Observable<PlatformUser[]> {
    return this._caseService.listCases().pipe(
      catchError(() => of({ status: 'error', items: [] as CaseRecord[] })),
      switchMap((casesResponse) => {
        const cases = casesResponse.items || [];
        if (cases.length === 0) {
          return of([]);
        }
        return forkJoin(
          cases.map((caseItem) =>
            this._caseService.listMembers(caseItem.id).pipe(
              catchError(() => of({ status: 'error', items: [] as CaseMembership[] })),
              map((membersResponse) =>
                (membersResponse.items || []).map((member) => this.userFromMember(member))
              )
            )
          )
        ).pipe(map((items) => items.flat()));
      })
    );
  }

  private userFromMember(member: CaseMembership): PlatformUser {
    const isLegalTeam =
      member.memberType === 'internal' ||
      member.rolePreset === 'attorney' ||
      member.rolePreset === 'pasante';
    return {
      id: member.userId || member.email || member.id,
      name: this.humanName(member.displayName, member.userId) || member.email || 'Usuario',
      displayName: this.humanName(member.displayName, member.userId),
      email: member.email,
      role: isLegalTeam ? 'ROLE_LEGAL_STAFF' : 'ROLE_USER',
    };
  }

  private mergeUsers(users: PlatformUser[]): PlatformUser[] {
    const seen = new Set<string>();
    return users.filter((user) => {
      const key = (this.userKey(user) || user.email || '').toLowerCase();
      if (!key || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private showSuccess(title: string, text: string): void {
    void Swal.fire({ title, text, icon: 'success' });
  }

  private showWarning(title: string, text: string, error?: unknown): void {
    void Swal.fire({ title, text: this.errorMessageFrom(error, text), icon: 'warning' });
  }

  private showError(title: string, fallback: string, error?: unknown): void {
    void Swal.fire({ title, text: this.errorMessageFrom(error, fallback), icon: 'error' });
  }

  private errorMessageFrom(error: any, fallback: string): string {
    return String(error?.error?.message || error?.message || fallback);
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
        id: 'Identificador',
        caseId: 'Caso',
        authorUserId: 'Autor',
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
    if (key === 'id' || key === 'caseId') {
      return this.auditReferenceLabel(String(value));
    }
    if (key === 'authorUserId') {
      return this.userDisplayName(String(value));
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
    if (key === 'description' || key === 'text') {
      return this.plainRichText(String(value));
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
        'case-entry': 'Entrada del caso',
        member: 'Miembro del caso',
        'case-membership': 'Miembro del caso',
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

  private auditReferenceLabel(id: string): string {
    if (!id) {
      return 'Sin referencia';
    }
    if (id === this.caseId || id === this.caseRecord?.id) {
      return this.caseRecord?.title || this.caseRecord?.reference || 'Caso';
    }
    const entry = this.entries.find((item) => item.id === id);
    if (entry) {
      return entry.title;
    }
    const member = this.members.find((item) => item.id === id || item.userId === id);
    if (member) {
      return this.memberName(member);
    }
    return 'Referencia interna';
  }

  private userDisplayName(idOrEmail: string): string {
    const user = this.findUser(idOrEmail);
    const member = this.members.find((item) => item.userId === idOrEmail || item.email === idOrEmail);
    const name =
      this.userName(user) ||
      this.humanName(member?.displayName, member?.userId) ||
      member?.email ||
      'Usuario';
    const email = user?.email || member?.email || '';
    return email ? `${name} (${email})` : name;
  }

  private findUser(idOrEmail: string): PlatformUser | undefined {
    if (!idOrEmail) {
      return undefined;
    }
    return this.users.find((user) => this.userKey(user) === idOrEmail || user.email === idOrEmail);
  }

  private userName(user?: PlatformUser): string {
    return (
      this.humanName(user?.displayName, this.userKey(user)) ||
      this.humanName(user?.name, this.userKey(user))
    );
  }

  private humanName(value?: string, id?: string): string {
    const name = String(value || '').trim();
    if (!name || name === id || /^[0-9a-f-]{24,}$/i.test(name)) {
      return '';
    }
    return name;
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

  private currentIdentity(): PlatformUser | null {
    return (this._authFacade.identity() || this._userService.getIdentity()) as PlatformUser | null;
  }

  private plainRichText(value: string): string {
    const text = value
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
    return text || 'Sin contenido';
  }
}
