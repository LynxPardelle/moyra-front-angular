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
  CaseRecord,
  CaseStatusDefinition,
  CaseType,
  CreateCaseEntryRequest,
  InviteCaseMemberRequest,
  caseStatusLabel,
} from '../../models/case';
import { CaseService } from '../../services/case.service';

@Component({
  selector: 'app-admin-case-detail',
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="admin-case-detail">
      <a routerLink="/admin/casos" class="admin-case-detail__back">Casos</a>
      <header class="admin-case-detail__header">
        <div>
          <p class="admin-case-detail__eyebrow">Workspace</p>
          <h1>{{ caseRecord?.title || 'Caso' }}</h1>
          <p>{{ caseRecord?.reference || caseId }}</p>
        </div>
        <form class="admin-case-detail__status" (ngSubmit)="updateStatus()">
          <label for="case-status">Estado</label>
          <select id="case-status" name="status" [(ngModel)]="selectedStatusId">
            @for (status of statusesForCurrentType(); track status.id) {
            <option [value]="status.id">{{ statusLabel(status) }}</option>
            }
          </select>
          <button type="submit">Actualizar</button>
        </form>
      </header>

      <div class="admin-case-workspace">
        <section>
          <h2>Entradas</h2>
          <form class="admin-case-form" (ngSubmit)="createEntry()">
            <input name="entryTitle" [(ngModel)]="newEntry.title" placeholder="Título" />
            <textarea name="entryText" [(ngModel)]="newEntry.text" placeholder="Contenido"></textarea>
            <select name="entryVisibility" [(ngModel)]="newEntry.visibility">
              <option [ngValue]="{ mode: 'internal_only' }">Sólo interno</option>
              <option [ngValue]="{ mode: 'case_members' }">Visible para cliente</option>
            </select>
            <button type="submit">Publicar entrada</button>
          </form>
          <ul>
            @for (entry of entries; track entry.id) {
            <li>{{ entry.title }}</li>
            }
          </ul>
        </section>

        <section>
          <h2>Miembros</h2>
          <form class="admin-case-form" (ngSubmit)="inviteMember()">
            <input name="inviteEmail" [(ngModel)]="invite.email" placeholder="Correo" />
            <input name="inviteName" [(ngModel)]="invite.displayName" placeholder="Nombre" />
            <select name="inviteRole" [(ngModel)]="invite.rolePreset">
              <option value="client">Cliente</option>
              <option value="attorney">Abogado</option>
              <option value="pasante">Pasante</option>
              <option value="external_observer">Observador</option>
            </select>
            <button type="submit">Invitar</button>
          </form>
          <ul>
            @for (member of members; track member.id) {
            <li>{{ member.displayName || member.email || member.id }}</li>
            }
          </ul>
        </section>

        <section>
          <h2>Archivos</h2>
          <div class="admin-case-files">
            @for (file of files; track file.id) {
            <article class="admin-case-file">
              <strong>{{ file.fileName }}</strong>
              <span>{{ file.externalVisibilityStatus }}</span>
              @if (canDownloadFile(file)) {
              <a [href]="downloadUrl(file.id)">Descargar</a>
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
          <ul>
            @for (event of auditEvents; track event.id) {
            <li>{{ event.action }}</li>
            }
          </ul>
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
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: 16px;
        margin: 12px 0 16px;
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

      .admin-case-form,
      .admin-case-detail__status,
      .admin-case-file {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
      }

      input,
      textarea,
      select,
      button {
        border: 1px solid rgba(41, 48, 59, 0.35);
        min-height: 36px;
        padding: 6px 10px;
        background: #ffffff;
        color: #29303b;
      }

      textarea {
        min-width: min(420px, 100%);
        min-height: 88px;
      }

      button {
        border-color: #4b8ff5;
        color: #4b8ff5;
      }

      .admin-case-file {
        justify-content: space-between;
        border-top: 1px solid rgba(41, 48, 59, 0.12);
        padding: 10px 0;
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
  newEntry: CreateCaseEntryRequest = {
    title: '',
    text: '',
    visibility: { mode: 'internal_only' },
  };
  invite: InviteCaseMemberRequest = {
    email: '',
    displayName: '',
    rolePreset: 'client',
    permissions: ['case.read'],
  };

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
    });
  }

  updateStatus(): void {
    if (!this.selectedStatusId) {
      return;
    }
    this._caseService.updateCaseStatus(this.caseId, { statusId: this.selectedStatusId }).subscribe();
  }

  createEntry(): void {
    if (!this.newEntry.title || !this.newEntry.text) {
      return;
    }
    this._caseService.createEntry(this.caseId, { ...this.newEntry }).subscribe((response) => {
      this.entries = [response.item, ...this.entries];
    });
  }

  inviteMember(): void {
    if (!this.invite.email) {
      return;
    }
    this._caseService.inviteMember(this.caseId, { ...this.invite }).subscribe((response) => {
      this.members = [response.item, ...this.members];
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
}
