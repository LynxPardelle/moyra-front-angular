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
import { apiUrl } from '../../services/global';
import { UserService } from '../../services/user.service';
import { caseVisibilityMode } from '../../utils/case-visibility';
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
  rolePreset: string;
  permissions: CasePermission[];
};

type ExistingMemberDraft = {
  userKey: string;
  rolePreset: CaseRolePreset;
};

type CaseFileDraft = {
  fileName: string;
  linkUrl: string;
  entryIds: string[];
  visibilityMode: 'case_members' | 'internal_only';
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
            <input
              name="caseTitle"
              [(ngModel)]="caseDraft.title"
              [disabled]="!canEditCaseMetadata()"
            />
          </label>
          <label>
            Referencia
            <input
              name="caseReference"
              [(ngModel)]="caseDraft.reference"
              [disabled]="!canEditCaseMetadata()"
            />
          </label>
          <div class="admin-case-rich-field">
            <app-rich-text-editor
              label="Descripción"
              help="Resumen interno del caso. Puedes usar listas, negritas y enlaces."
              placeholder="Descripción del caso"
              [(value)]="caseDraft.description"
              minHeight="180px"
              [disabled]="!canEditCaseMetadata()"
            />
          </div>
          <label>
            Estado
            <select
              id="case-status"
              name="status"
              [(ngModel)]="selectedStatusId"
              [disabled]="!canEditCaseStatus()"
            >
              @for (status of statusesForCurrentType(); track status.id) {
              <option [value]="status.id">{{ statusLabel(status) }}</option>
              }
            </select>
          </label>
          <button
            type="submit"
            class="admin-case-detail__save"
            [disabled]="caseSaving || !canEditCaseDetails() || !canSaveCaseDetails()"
          >
            {{ caseSaving ? 'Guardando...' : 'Guardar caso' }}
          </button>
        </form>
      </header>

      <div class="admin-case-workspace">
        <section>
          <div class="admin-case-section-title">
            <h2>Entradas</h2>
            @if (canCreateEntries()) {
            <a [routerLink]="['/admin/casos', caseId, 'entradas', 'nueva']">Nueva entrada</a>
            }
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
                  <td data-label="Título">{{ entry.title }}</td>
                  <td data-label="Visibilidad">{{ entryVisibilityLabel(entry) }}</td>
                  <td data-label="Actualización">{{ formatDate(entry.updatedAt || entry.createdAt) }}</td>
                  <td data-label="Acciones" class="admin-case-actions">
                    <a [routerLink]="entryViewLink(entry)">Ver la entrada</a>
                    @if (canEditEntries()) {
                    <a [routerLink]="['/admin/casos', caseId, 'entradas', entry.id]">
                      Editar
                    </a>
                    }
                    @if (canManageEntryVisibility()) {
                    <label class="admin-case-inline-control">
                      Visibilidad
                      <select
                        [attr.name]="'entryVisibility-' + entry.id"
                        [ngModel]="entryVisibilityDraft(entry)"
                        (ngModelChange)="entryVisibilityDrafts[entry.id] = $event"
                      >
                        <option value="internal_only">Sólo interno</option>
                        <option value="case_members">Visible para cliente</option>
                      </select>
                    </label>
                    <button
                      type="button"
                      [disabled]="entryVisibilitySavingId === entry.id || !entryVisibilityChanged(entry)"
                      (click)="updateEntryVisibility(entry)"
                    >
                      {{
                        entryVisibilitySavingId === entry.id
                          ? 'Guardando...'
                          : 'Cambiar visibilidad'
                      }}
                    </button>
                    }
                  </td>
                </tr>
                }
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2>Miembros</h2>
          <div class="admin-case-table-wrap">
            <table class="admin-case-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Permisos</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (member of members; track member.id) {
                <tr>
                  <td data-label="Nombre">
                    @if (memberProfileLink(member); as profileLink) {
                    <a [routerLink]="profileLink">{{ memberName(member) }}</a>
                    } @else {
                    {{ memberName(member) }}
                    }
                  </td>
                  <td data-label="Correo">{{ member.email || 'Sin correo' }}</td>
                  <td data-label="Rol">{{ roleLabel(member.rolePreset) }}</td>
                  <td data-label="Permisos">{{ permissionsSummary(member.permissions) }}</td>
                  <td data-label="Acciones">
                    <div class="admin-case-actions">
                      @if (canEditMembers()) {
                      <button type="button" (click)="startEditMember(member)">Editar</button>
                      }
                      @if (canManageMembers()) {
                      <button
                        type="button"
                        class="admin-case-button-danger"
                        [disabled]="memberRemovingId === member.id"
                        (click)="removeMember(member)"
                      >
                        {{ memberRemovingId === member.id ? 'Quitando...' : 'Quitar' }}
                      </button>
                      }
                    </div>
                  </td>
                </tr>
                @if (editingMemberId === member.id) {
                <tr>
                  <td colspan="5">
                    <form class="admin-case-member-editor" (ngSubmit)="saveMember(member)">
                      <label>
                        Nombre
                        <input
                          name="memberName"
                          [(ngModel)]="memberDraft.displayName"
                          [disabled]="!canManageMembers()"
                        />
                      </label>
                      <label>
                        Rol
                        <select
                          name="memberRole"
                          [(ngModel)]="memberDraft.rolePreset"
                          [disabled]="!canManageMembers()"
                        >
                          <option value="client">Cliente</option>
                          <option value="attorney">Abogado</option>
                          <option value="pasante">Pasante</option>
                          <option value="external_observer">Observador</option>
                        </select>
                      </label>
                      @if (canManagePermissions()) {
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
                      }
                      <div class="admin-case-actions">
                        <button
                          type="submit"
                          [disabled]="memberSavingId === member.id || !canEditMembers()"
                        >
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
          @if (canManageMembers()) {
          <div class="admin-case-member-tools">
            <article class="admin-case-member-card">
              <h3>Agregar usuario existente</h3>
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
                <button type="submit" [disabled]="memberAdding || !canAddExistingMember()">
                  {{ memberAdding ? 'Agregando...' : 'Agregar miembro' }}
                </button>
              </form>
            </article>
            <hr />
            <article class="admin-case-member-card">
              <h3>Invitar usuario nuevo</h3>
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
                <button type="submit" [disabled]="inviteBusy || !invite.email">
                  {{ inviteBusy ? 'Invitando...' : 'Invitar' }}
                </button>
              </form>
            </article>
            <small class="admin-case-help">
              Los permisos se asignan por rol del caso: clientes suben y abren documentos,
              pasantes colaboran internamente y observadores sólo consultan. Los comentarios se
              habilitan desde permisos del miembro.
            </small>
          </div>
          }
        </section>

        <section>
          <h2>Archivos</h2>
          @if (canManageFiles()) {
          <form class="admin-case-form admin-case-form--stack" (ngSubmit)="addOneDriveLink()">
            <label>
              Entradas relacionadas
              <select
                name="oneDriveEntryIds"
                multiple
                [ngModel]="oneDriveLink.entryIds"
                (ngModelChange)="oneDriveLink.entryIds = normalizeSelection($event)"
              >
                @for (entry of entries; track entry.id) {
                <option [value]="entry.id">{{ entry.title }}</option>
                }
              </select>
              <small class="admin-case-help">
                Puedes seleccionar una o más entradas; el documento aparecerá dentro de ellas.
              </small>
            </label>
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
            <label>
              Visibilidad
              <select name="oneDriveVisibility" [(ngModel)]="oneDriveLink.visibilityMode">
                <option value="case_members">Visible para el cliente</option>
                <option value="internal_only">Sólo interno</option>
              </select>
            </label>
            <small class="admin-case-help">
              Para Casos se guardan enlaces privados de OneDrive o SharePoint; los demás módulos
              siguen usando S3.
            </small>
            @if (oneDriveError) {
            <p class="admin-case-error">{{ oneDriveError }}</p>
            }
            <button type="submit" [disabled]="oneDriveBusy || !hasOneDriveInputs()">
              {{ oneDriveBusy ? 'Guardando...' : 'Agregar enlace' }}
            </button>
          </form>
          }
          <div class="admin-case-files">
            @for (file of files; track file.id) {
            <article class="admin-case-file">
              @if (canManageExistingFiles()) {
              <label>
                Nombre
                <input
                  [attr.name]="'fileName-' + file.id"
                  [ngModel]="fileDraft(file).fileName"
                  (ngModelChange)="fileDraft(file).fileName = $event"
                />
              </label>
              <label>
                Enlace
                <input
                  [attr.name]="'fileUrl-' + file.id"
                  [ngModel]="fileDraft(file).linkUrl"
                  (ngModelChange)="fileDraft(file).linkUrl = $event"
                  type="url"
                />
              </label>
              <label>
                Entradas
                <select
                  [attr.name]="'fileEntries-' + file.id"
                  multiple
                  [ngModel]="fileDraft(file).entryIds"
                  (ngModelChange)="fileDraft(file).entryIds = normalizeSelection($event)"
                >
                  @for (entry of entries; track entry.id) {
                  <option [value]="entry.id">{{ entry.title }}</option>
                  }
                </select>
              </label>
              <label>
                Visibilidad
                <select
                  [attr.name]="'fileVisibility-' + file.id"
                  [ngModel]="fileDraft(file).visibilityMode"
                  (ngModelChange)="fileDraft(file).visibilityMode = $event"
                >
                  <option value="case_members">Visible para el cliente</option>
                  <option value="internal_only">Sólo interno</option>
                </select>
              </label>
              } @else {
              <strong>{{ displayFileName(file) }}</strong>
              <span>{{ fileTypeLabel(file) }}</span>
              <span>Entradas: {{ fileEntryLabel(file) }}</span>
              <span>{{ fileVisibilityStatusLabel(file.externalVisibilityStatus || '') }}</span>
              }
              @if (canManageExistingFiles()) {
              <span>{{ fileTypeLabel(file) }}</span>
              <span>Entradas: {{ fileEntryLabel(file) }}</span>
              }
              @if (canDownloadFile(file)) {
              <a [href]="fileHref(file)" target="_blank" rel="noopener noreferrer">
                {{ isOneDriveFile(file) ? 'Abrir documento' : 'Descargar' }}
              </a>
              }
              @if (canManageExistingFiles()) {
              <button
                type="button"
                [disabled]="fileSavingId === file.id || !canSaveFile(file)"
                (click)="saveFile(file)"
              >
                {{ fileSavingId === file.id ? 'Guardando...' : 'Guardar archivo' }}
              </button>
              }
              @if (canApproveFiles()) {
              <button type="button" (click)="approveFile(file.id)" [disabled]="!canApproveFile(file)">
                Aprobar visibilidad
              </button>
              }
              @if (canManageExistingFiles()) {
              <button
                type="button"
                class="admin-case-button-danger"
                [disabled]="fileRemovingId === file.id"
                (click)="removeFile(file)"
              >
                {{ fileRemovingId === file.id ? 'Eliminando...' : 'Eliminar' }}
              </button>
              }
            </article>
            }
          </div>
        </section>

        @if (canReadAudit()) {
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
                  <td data-label="Fecha">{{ formatDate(event.createdAt) }}</td>
                  <td data-label="Quién">
                    @if (auditActorLink(event); as actorLink) {
                    <a [routerLink]="actorLink">{{ auditActor(event) }}</a>
                    } @else {
                    {{ auditActor(event) }}
                    }
                  </td>
                  <td data-label="Acción">{{ auditActionLabel(event.action) }}</td>
                  <td data-label="Objetivo">
                    @if (auditTargetLink(event); as targetLink) {
                    <a [routerLink]="targetLink">{{ auditTargetLabel(event) }}</a>
                    } @else {
                    {{ auditTargetLabel(event) }}
                    }
                  </td>
                  <td data-label="Detalle">{{ auditDetails(event) }}</td>
                </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
        }
      </div>
    </section>
  `,
  styles: [
    `
      .admin-case-detail {
        box-sizing: border-box;
        max-width: 1180px;
        width: 100%;
        margin: 0 auto;
        padding: 24px 16px;
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
        grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr));
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

      .admin-case-inline-control {
        display: inline-grid;
        gap: 4px;
        min-width: 150px;
      }

      .admin-case-inline-control select {
        min-height: 36px;
        padding: 0.45rem 0.65rem 0.45rem 0.85rem;
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
        grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr));
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
        min-height: 44px;
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
        min-width: 760px;
        width: 100%;
        border-collapse: collapse;
      }

      .admin-case-table th,
      .admin-case-table td {
        border: 1px solid rgba(41, 48, 59, 0.18);
        padding: 9px 10px;
        text-align: left;
        vertical-align: top;
        overflow-wrap: anywhere;
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

        .admin-case-table {
          min-width: 0;
        }

        .admin-case-table thead {
          display: none;
        }

        .admin-case-table,
        .admin-case-table tbody,
        .admin-case-table tr,
        .admin-case-table td {
          display: block;
          width: 100%;
        }

        .admin-case-table tr {
          border: 1px solid rgba(41, 48, 59, 0.18);
          margin-bottom: 12px;
        }

        .admin-case-table td {
          border: 0;
          display: grid;
          gap: 8px;
          grid-template-columns: minmax(112px, 34%) 1fr;
        }

        .admin-case-table td::before {
          color: rgba(41, 48, 59, 0.68);
          content: attr(data-label);
          font-size: 0.78rem;
          font-weight: 800;
        }

        .admin-case-table td[colspan] {
          display: block;
        }

        .admin-case-table td[colspan]::before {
          content: '';
          display: none;
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
  inviteBusy = false;
  existingMember: ExistingMemberDraft = {
    userKey: '',
    rolePreset: 'attorney',
  };
  readonly permissionOptions: Array<{ value: CasePermission; label: string }> = [
    { value: 'case.read', label: 'Ver caso' },
    { value: 'case.write_entry', label: 'Publicar entradas' },
    { value: 'case.manage_entry_visibility', label: 'Cambiar visibilidad de entradas' },
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
    rolePreset: 'client',
    permissions: [],
  };
  entryVisibilityDrafts: Record<string, string> = {};
  entryVisibilitySavingId = '';
  fileSavingId = '';
  fileDrafts: Record<string, CaseFileDraft> = {};
  fileRemovingId = '';
  oneDriveLink = {
    entryIds: [] as string[],
    fileName: '',
    linkUrl: '',
    visibilityMode: 'case_members',
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
      users: this._userService.getUsers(0, 200, '-create_at').pipe(catchError(() => of([]))),
      knownCaseUsers: this.caseMemberUsers(),
    }).subscribe(({ caseRecord, caseTypes, entries, members, files, users, knownCaseUsers }) => {
      this.caseRecord = caseRecord.item;
      this.caseTypes = caseTypes.items || [];
      this.entries = entries.items || [];
      this.members = members.items || [];
      this.files = files.items || [];
      this.auditEvents = [];
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
      if (this.canReadAudit()) {
        this.loadAuditEvents();
      }
    });
  }

  loadAuditEvents(): void {
    this._caseService.listAuditEvents(this.caseId).subscribe({
      next: (response) => {
        this.auditEvents = response.items || [];
      },
      error: () => {
        this.auditEvents = [];
      },
    });
  }

  canSaveCaseDetails(): boolean {
    return this.caseDraft.title.trim().length > 0 && Boolean(this.selectedStatusId);
  }

  canEditCaseDetails(): boolean {
    return this.canEditCaseMetadata() || this.canEditCaseStatus();
  }

  canEditCaseMetadata(): boolean {
    return this.hasCasePermission('case.manage_permissions');
  }

  canEditCaseStatus(): boolean {
    return this.hasCasePermission('case.manage_status');
  }

  canCreateEntries(): boolean {
    return this.hasCasePermission('case.write_entry');
  }

  canEditEntries(): boolean {
    return this.hasCasePermission('case.write_entry');
  }

  canManageMembers(): boolean {
    return this.hasCasePermission('case.manage_members');
  }

  canManagePermissions(): boolean {
    return this.hasCasePermission('case.manage_permissions');
  }

  canEditMembers(): boolean {
    return this.canManageMembers() || this.canManagePermissions();
  }

  canManageFiles(): boolean {
    return this.hasCasePermission('case.upload_file');
  }

  canManageExistingFiles(): boolean {
    return this.canApproveFiles();
  }

  canApproveFiles(): boolean {
    return this.hasCasePermission('case.approve_file_visibility');
  }

  canReadAudit(): boolean {
    return this.hasCasePermission('case.read_audit');
  }

  saveCaseDetails(): void {
    if (!this.canEditCaseDetails()) {
      this.showWarning(
        'Permiso insuficiente',
        'Tu usuario no tiene permisos para editar los datos del caso.'
      );
      return;
    }

    if (!this.canSaveCaseDetails()) {
      return;
    }
    if (!this.caseRecord) {
      this.showError('No se pudo guardar el caso', 'Carga el caso nuevamente antes de editarlo.');
      return;
    }
    const saveStatusIfNeeded = (baseCase: CaseRecord) => {
      if (!this.canEditCaseStatus() || !this.selectedStatusId || this.selectedStatusId === baseCase.statusId) {
        this.caseRecord = baseCase;
        this.caseSaving = false;
        this.showSuccess('Caso guardado', 'Los datos del caso se actualizaron.');
        return;
      }

      this._caseService.updateCaseStatus(this.caseId, { statusId: this.selectedStatusId }).subscribe({
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
    };

    this.caseSaving = true;
    if (!this.canEditCaseMetadata()) {
      saveStatusIfNeeded(this.caseRecord);
      return;
    }

    this._caseService
      .updateCase(this.caseId, {
        title: this.caseDraft.title.trim(),
        reference: this.caseDraft.reference.trim(),
        description: this.caseDraft.description.trim(),
      })
      .subscribe({
        next: (response) => saveStatusIfNeeded(response.item),
        error: (error) => {
          this.caseSaving = false;
          this.showError('No se pudo guardar el caso', 'Intenta nuevamente.', error);
        },
      });
  }

  inviteMember(): void {
    if (!this.canManageMembers()) {
      this.showWarning(
        'Permiso insuficiente',
        'Tu usuario no tiene permisos para invitar miembros a este caso.'
      );
      return;
    }

    if (!this.invite.email) {
      return;
    }
    const payload = this.cleanInvitePayload();
    this.inviteBusy = true;
    this._caseService.inviteMember(this.caseId, payload).subscribe({
      next: (response) => {
        this.finishAddedMember(
          response.item,
          () => {
            this.invite = {
              email: '',
              displayName: '',
              rolePreset: 'client',
            };
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
    if (!this.canManageMembers()) {
      this.showWarning(
        'Permiso insuficiente',
        'Tu usuario no tiene permisos para agregar miembros a este caso.'
      );
      return;
    }

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
            () => {
              this.existingMember = {
                userKey: '',
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
    if (!this.canManageFiles()) {
      this.showWarning(
        'Permiso insuficiente',
        'Tu usuario no tiene permisos para agregar documentos a este caso.'
      );
      return;
    }

    if (!this.canCreateOneDriveLink()) {
      this.oneDriveError =
        'Selecciona una entrada, captura el nombre y usa un enlace de OneDrive o SharePoint válido.';
      return;
    }

    this.oneDriveBusy = true;
    this.oneDriveError = '';
    this._caseService.createOneDriveLink(this.caseId, {
      entryId: this.oneDriveLink.entryIds[0],
      entryIds: this.oneDriveLink.entryIds,
      fileName: this.oneDriveLink.fileName.trim(),
      linkUrl: this.oneDriveLink.linkUrl.trim(),
      visibility: { mode: this.oneDriveLink.visibilityMode },
    }).subscribe({
      next: (response) => {
        this.files = [response.item, ...this.files];
        this.oneDriveLink = {
          entryIds: [],
          fileName: '',
          linkUrl: '',
          visibilityMode: 'case_members',
        };
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
    if (!this.canApproveFiles()) {
      this.showWarning(
        'Permiso insuficiente',
        'Tu usuario no tiene permisos para aprobar la visibilidad de documentos.'
      );
      return;
    }

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

  updateFileAccess(file: CaseFile, visibilityMode: string): void {
    if (!this.canApproveFiles()) {
      this.showWarning(
        'Permiso insuficiente',
        'Tu usuario no tiene permisos para cambiar la visibilidad de documentos.'
      );
      return;
    }

    const mode = visibilityMode === 'internal_only' ? 'internal_only' : 'case_members';
    this._caseService
      .updateFileVisibility(this.caseId, file.id, {
        externalVisibilityStatus: 'approved',
        visibility: { mode },
      })
      .subscribe({
        next: (response) => {
          this.files = this.files.map((item) => (item.id === file.id ? response.item : item));
          this.showSuccess('Documento actualizado', 'La visibilidad del documento se actualizó.');
        },
        error: (error) => {
          this.showError('No se pudo actualizar el documento', 'Intenta nuevamente.', error);
        },
      });
  }

  fileDraft(file: CaseFile): CaseFileDraft {
    if (!this.fileDrafts[file.id]) {
      this.fileDrafts[file.id] = {
        fileName: this.displayFileName(file),
        linkUrl: String(file.webUrl || file.linkUrl || '').trim(),
        entryIds: this.fileEntryIds(file),
        visibilityMode: this.fileVisibilityMode(file),
      };
    }
    return this.fileDrafts[file.id];
  }

  canSaveFile(file: CaseFile): boolean {
    const draft = this.fileDraft(file);
    return (
      this.canManageExistingFiles() &&
      draft.fileName.trim().length > 0 &&
      draft.linkUrl.trim().length > 0 &&
      draft.entryIds.length > 0 &&
      this.looksLikeMicrosoftLink(draft.linkUrl)
    );
  }

  saveFile(file: CaseFile): void {
    if (!this.canManageExistingFiles()) {
      this.showWarning(
        'Permiso insuficiente',
        'Tu usuario no tiene permisos para editar documentos de este caso.'
      );
      return;
    }

    if (!this.canSaveFile(file)) {
      this.showWarning(
        'Archivo incompleto',
        'Captura nombre, enlace de OneDrive o SharePoint y al menos una entrada.'
      );
      return;
    }

    const draft = this.fileDraft(file);
    this.fileSavingId = file.id;
    this._caseService
      .updateFile(this.caseId, file.id, {
        fileName: draft.fileName.trim(),
        title: draft.fileName.trim(),
        linkUrl: draft.linkUrl.trim(),
        entryId: draft.entryIds[0],
        entryIds: draft.entryIds,
        externalVisibilityStatus: 'approved',
        visibility: { mode: draft.visibilityMode },
      })
      .subscribe({
        next: (response) => {
          this.files = this.files.map((item) => (item.id === file.id ? response.item : item));
          delete this.fileDrafts[file.id];
          this.fileSavingId = '';
          this.showSuccess('Archivo guardado', 'Los datos del archivo se actualizaron.');
        },
        error: (error) => {
          this.fileSavingId = '';
          this.showError('No se pudo guardar el archivo', 'Intenta nuevamente.', error);
        },
      });
  }

  startEditMember(member: CaseMembership): void {
    if (!this.canEditMembers()) {
      this.showWarning(
        'Permiso insuficiente',
        'Tu usuario no tiene permisos para editar miembros de este caso.'
      );
      return;
    }

    this.editingMemberId = member.id;
    this.memberDraft = {
      displayName: member.displayName || '',
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
    if (!this.canEditMembers()) {
      this.showWarning(
        'Permiso insuficiente',
        'Tu usuario no tiene permisos para editar miembros de este caso.'
      );
      return;
    }

    this.memberSavingId = member.id;
    if (!this.canManageMembers() && this.canManagePermissions()) {
      this._caseService
        .updateMemberPermissions(this.caseId, member.id, {
          permissions: this.memberDraft.permissions,
        })
        .subscribe({
          next: (permissionsResponse) => {
            const updated = { ...member, ...permissionsResponse.item };
            this.members = this.members.map((item) => (item.id === updated.id ? updated : item));
            this.cancelEditMember();
            this.showSuccess('Permisos guardados', 'Los permisos del miembro quedaron actualizados.');
          },
          error: (error) => {
            this.memberSavingId = '';
            this.showError('No se pudieron guardar los permisos', 'Intenta nuevamente.', error);
          },
        });
      return;
    }

    this._caseService
      .updateMember(this.caseId, member.id, {
        displayName: this.memberDraft.displayName.trim(),
        rolePreset: this.memberDraft.rolePreset,
      })
      .subscribe({
        next: (memberResponse) => {
          if (!this.canManagePermissions()) {
            this.members = this.members.map((item) =>
              item.id === memberResponse.item.id ? memberResponse.item : item
            );
            this.cancelEditMember();
            this.showSuccess('Miembro guardado', 'Los datos del miembro quedaron actualizados.');
            return;
          }

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
                this.showSuccess('Miembro guardado', 'Rol y permisos quedaron actualizados.');
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
    if (!this.canManageMembers()) {
      this.showWarning(
        'Permiso insuficiente',
        'Tu usuario no tiene permisos para quitar miembros de este caso.'
      );
      return;
    }

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
    return this.canManageMembers() && Boolean(this.selectedExistingUser()?.email);
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
    return caseVisibilityMode(entry.visibility) !== 'internal_only';
  }

  entryVisibilityLabel(entry: CaseEntry): string {
    return this.visibilityLabel(entry.visibility);
  }

  entryVisibilityDraft(entry: CaseEntry): 'case_members' | 'internal_only' {
    const draft = this.entryVisibilityDrafts[entry.id];
    if (draft === 'case_members' || draft === 'internal_only') {
      return draft;
    }
    return this.entryVisibleInPortal(entry) ? 'case_members' : 'internal_only';
  }

  entryVisibilityChanged(entry: CaseEntry): boolean {
    const current = this.entryVisibleInPortal(entry) ? 'case_members' : 'internal_only';
    return this.entryVisibilityDraft(entry) !== current;
  }

  canManageEntryVisibility(): boolean {
    return this.hasCasePermission('case.manage_entry_visibility');
  }

  updateEntryVisibility(entry: CaseEntry): void {
    if (!this.canManageEntryVisibility() || !this.entryVisibilityChanged(entry)) {
      return;
    }

    const mode = this.entryVisibilityDraft(entry);
    this.entryVisibilitySavingId = entry.id;
    this._caseService.updateEntry(this.caseId, entry.id, { visibility: { mode } }).subscribe({
      next: (response) => {
        this.entries = this.entries.map((item) => (item.id === entry.id ? response.item : item));
        delete this.entryVisibilityDrafts[entry.id];
        this.entryVisibilitySavingId = '';
        this.showSuccess('Visibilidad actualizada', 'La visibilidad de la entrada se guardó.');
      },
      error: (error) => {
        this.entryVisibilitySavingId = '';
        this.showError('No se pudo cambiar la visibilidad', 'Intenta nuevamente.', error);
      },
    });
  }

  entryViewLink(entry: CaseEntry): string[] {
    if (this.entryVisibleInPortal(entry)) {
      return ['/casos', this.caseId, 'entrada', entry.id];
    }
    return ['/admin/casos', this.caseId, 'entradas', entry.id];
  }

  fileEntryLabel(file: CaseFile): string {
    const entryIds = this.fileEntryIds(file);
    if (entryIds.length === 0) {
      return 'Sin entrada relacionada';
    }
    return entryIds
      .map((entryId) => this.entries.find((entry) => entry.id === entryId)?.title || entryId)
      .join(', ');
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
        'case.entry.visibility_updated': 'Cambió visibilidad de entrada',
        'case.entry.removed': 'Eliminó una entrada',
        'case.member.created': 'Agregó miembro',
        'case.member.invited': 'Invitó miembro',
        'case.member.invite_resent': 'Reenvió invitación',
        'case.member.invite_canceled': 'Canceló invitación',
        'case.member.updated': 'Editó miembro',
        'case.member.permissions_updated': 'Cambió permisos',
        'case.member.removed': 'Quitó miembro',
        'case.comment.created': 'Agregó comentario',
        'case.comment.updated': 'Editó comentario',
        'case.comment.removed': 'Eliminó comentario',
        'case.file.upload_initialized': 'Inició carga de archivo',
        'case.file.upload_completed': 'Completó carga de archivo',
        'case.file.onedrive_link_added': 'Agregó enlace OneDrive',
        'case.file.updated': 'Editó archivo',
        'case.file.visibility_updated': 'Cambió visibilidad de archivo',
        'case.file.downloaded': 'Abrió archivo',
        'case.file.removed': 'Eliminó archivo',
        'case.notification.created': 'Creó notificación',
        'case.notification.read': 'Marcó notificación como leída',
        'case.notification.unread': 'Marcó notificación como no leída',
      }[action] || action
    );
  }

  auditDetails(event: CaseAuditEvent): string {
    const source = event.after || event.before;
    if (!source) {
      return 'Sin detalle';
    }
    const details = Object.entries(source)
      .filter(([key, value]) => key !== 'memberType' && value !== undefined && value !== null && value !== '')
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
    if (event.targetType === 'file' || event.targetType === 'case-file') {
      const file = this.files.find((item) => item.id === event.targetId);
      return file ? this.displayFileName(file) : 'Documento del caso';
    }
    if (event.targetType === 'case-comment') {
      return 'Comentario del caso';
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
    return this.canApproveFiles() && file.uploadStatus !== 'pending_upload';
  }

  canDownloadFile(file: CaseFile): boolean {
    return file.uploadStatus !== 'pending_upload' && this.hasCasePermission('case.download_file');
  }

  async removeFile(file: CaseFile): Promise<void> {
    if (!this.canManageExistingFiles()) {
      this.showWarning(
        'Permiso insuficiente',
        'Tu usuario no tiene permisos para eliminar documentos de este caso.'
      );
      return;
    }

    const confirmation = await Swal.fire({
      title: 'Eliminar documento',
      text: `¿Eliminar ${this.displayFileName(file)} del caso?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    this.fileRemovingId = file.id;
    this._caseService.deleteFile(this.caseId, file.id).subscribe({
      next: () => {
        this.files = this.files.filter((item) => item.id !== file.id);
        this.fileRemovingId = '';
        this.showSuccess('Documento eliminado', 'El documento se quitó del caso.');
      },
      error: (error) => {
        this.fileRemovingId = '';
        this.showError('No se pudo eliminar el documento', 'Intenta nuevamente.', error);
      },
    });
  }

  downloadUrl(fileId: string): string {
    return apiUrl(`/cases/${encodeURIComponent(this.caseId)}/files/${encodeURIComponent(
      fileId
    )}/download`);
  }

  fileHref(file: CaseFile): string {
    const linkUrl = String(file.webUrl || file.linkUrl || '').trim();
    if (this.isOneDriveFile(file) && linkUrl) {
      return linkUrl;
    }
    return this.downloadUrl(file.id);
  }

  canCreateOneDriveLink(): boolean {
    return (
      this.canManageFiles() &&
      this.hasOneDriveInputs() &&
      this.looksLikeMicrosoftLink(this.oneDriveLink.linkUrl)
    );
  }

  hasOneDriveInputs(): boolean {
    return (
      this.oneDriveLink.entryIds.length > 0 &&
      this.oneDriveLink.fileName.trim().length > 0 &&
      this.oneDriveLink.linkUrl.trim().length > 0
    );
  }

  normalizeSelection(value: unknown): string[] {
    const values = Array.isArray(value) ? value : [value];
    return Array.from(
      new Set(values.map((item) => String(item || '').trim()).filter(Boolean))
    );
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

  fileVisibilityMode(file: CaseFile): 'case_members' | 'internal_only' {
    return file.externalVisibilityStatus === 'approved' &&
      caseVisibilityMode(file.visibility) !== 'internal_only'
      ? 'case_members'
      : 'internal_only';
  }

  isOneDriveFile(file: CaseFile): boolean {
    return file.storageProvider === 'onedrive' || file.type === 'onedrive-link';
  }

  private fileEntryIds(file: CaseFile): string[] {
    const ids = Array.isArray(file.entryIds) ? file.entryIds : [];
    return this.normalizeSelection([...ids, file.entryId]);
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
    resetForm: () => void,
    successTitle: string
  ): void {
    this.upsertMember(member);
    resetForm();
    this.showSuccess(successTitle, 'La membresía quedó registrada.');
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

  private hasCasePermission(permission: CasePermission): boolean {
    if (this._authFacade.isAdmin()) {
      return true;
    }
    const identity = this._authFacade.identity?.();
    const userId = identity?.id || identity?.sub || identity?.userId;
    const email = String(identity?.email || '').toLowerCase();
    const membership = this.members.find(
      (member) =>
        (userId && member.userId === userId) ||
        (email && member.email?.toLowerCase() === email)
    );
    return membership?.permissions?.includes(permission) === true;
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
        'case-file': 'Documento del caso',
        'case-comment': 'Comentario del caso',
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

  fileVisibilityStatusLabel(status: string): string {
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
