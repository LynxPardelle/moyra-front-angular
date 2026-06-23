import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';

import { SafeRichHtmlPipe } from '../../pipes/safe-rich-html';
import {
  CaseComment,
  CaseEntry,
  CaseFile,
  CaseMembership,
  CaseRecord,
} from '../../models/case';
import { CaseService } from '../../services/case.service';
import { AuthFacade } from '../../store/auth/auth.facade';
import { isVisibleToCaseClient } from '../../utils/case-visibility';

@Component({
  selector: 'app-case-detail',
  imports: [CommonModule, FormsModule, RouterLink, SafeRichHtmlPipe],
  template: `
    <main class="case-detail-page">
      <a routerLink="/casos" class="case-detail-page__back">Casos</a>
      @if (loading) {
      <p class="case-detail-page__panel">Cargando caso...</p>
      } @else if (errorMessage) {
      <section class="case-detail-page__panel">
        <p>{{ errorMessage }}</p>
        <button type="button" (click)="load()">Reintentar</button>
      </section>
      } @else {
      <header class="case-detail-page__header">
        <div>
          <p class="case-detail-page__reference">{{ caseRecord?.reference || caseId }}</p>
          <h1>{{ caseRecord?.title || 'Caso' }}</h1>
        </div>
        <a routerLink="/notificaciones">Notificaciones</a>
      </header>

      <section class="case-detail-page__grid">
        <div class="case-detail-page__main">
          <section class="case-detail-page__panel">
            <h2>Actualizaciones</h2>
            @if (entries.length === 0) {
            <p>Aún no hay actualizaciones visibles para este caso.</p>
            } @for (entry of entries; track entry.id) {
            <article class="case-entry">
              <a class="case-entry__title" [routerLink]="['/casos', caseId, 'entrada', entry.id]">
                {{ entry.title }}
              </a>
              <div class="case-entry__body" [innerHTML]="entry.text | safeRichHtml"></div>

              <section class="case-comments">
                <h3>Comentarios</h3>
                @for (comment of commentsByEntry[entry.id] || []; track comment.id) {
                <p class="case-comment">{{ comment.text }}</p>
                }
                <form (ngSubmit)="submitComment(entry.id)">
                  <label class="case-comments__label" [for]="commentControlId(entry.id)">
                    Escribe un comentario
                  </label>
                  <textarea
                    [id]="commentControlId(entry.id)"
                    [name]="'comment-' + entry.id"
                    [attr.name]="'comment-' + entry.id"
                    [(ngModel)]="commentDrafts[entry.id]"
                    [disabled]="!canComment() || commentBusyEntryId === entry.id"
                    placeholder="Escribe un comentario"
                  ></textarea>
                  @if (!canComment()) {
                  <p>Los comentarios no están habilitados para tu acceso actual.</p>
                  } @if (commentErrors[entry.id]) {
                  <p class="case-detail-page__error">{{ commentErrors[entry.id] }}</p>
                  }
                  <button
                    type="submit"
                    data-testid="case-comment-submit"
                    [disabled]="!canComment() || commentBusyEntryId === entry.id"
                  >
                    Comentar
                  </button>
                </form>
              </section>
            </article>
            }
          </section>
        </div>

        <aside class="case-detail-page__side">
          <section class="case-detail-page__panel">
            <h2>Documentos</h2>
            @if (!canUpload()) {
            <p>La carga de documentos no está habilitada para tu acceso actual.</p>
            } @else {
            <label for="case-upload">Agregar documento</label>
            <input id="case-upload" type="file" (change)="handleFileSelection($event)" />
            <button type="button" (click)="uploadSelectedFile()" [disabled]="!selectedFile || uploadState === 'uploading'">
              Subir
            </button>
            @if (uploadState !== 'idle') {
            <p>{{ uploadProgress }}%</p>
            } @if (uploadError) {
            <p class="case-detail-page__error">{{ uploadError }}</p>
            }
            }

            <div class="case-files">
              @for (file of files; track file.id) {
              <article class="case-file">
                <strong>{{ file.fileName }}</strong>
                <span>{{ fileReviewLabel(file) }}</span>
                @if (canDownloadFile(file)) {
                <a [href]="downloadUrl(file.id)">Descargar</a>
                }
              </article>
              }
            </div>
          </section>
        </aside>
      </section>
      }
    </main>
  `,
  styles: [
    `
      .case-detail-page {
        width: min(1120px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 24px 0 calc(var(--site-footer-offset, 76px) + 24px);
        color: #29303b;
      }

      .case-detail-page__back {
        color: #4b8ff5;
        text-decoration: none;
      }

      .case-detail-page__header,
      .case-detail-page__panel,
      .case-entry,
      .case-file {
        border: 1px solid rgba(41, 48, 59, 0.18);
        padding: 16px;
        background: #ffffff;
      }

      .case-detail-page__header {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 16px;
        margin: 12px 0 16px;
      }

      .case-detail-page__header > div {
        min-width: 0;
      }

      .case-detail-page h1,
      .case-detail-page__reference,
      .case-entry__title,
      .case-entry__body,
      .case-comment,
      .case-file strong {
        overflow-wrap: anywhere;
      }

      .case-detail-page__reference {
        margin: 0;
        color: #4b8ff5;
        text-transform: uppercase;
      }

      .case-detail-page__grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 320px;
        gap: 16px;
      }

      .case-entry,
      .case-file,
      .case-comments {
        margin-top: 12px;
      }

      .case-detail-page__header a,
      .case-file a,
      button {
        border: 1px solid #4b8ff5;
        color: #4b8ff5;
        background: #ffffff;
        text-decoration: none;
        padding: 8px 12px;
      }

      .case-entry__title {
        display: block;
        color: #4b8ff5;
        line-height: 1.45;
        margin-bottom: 10px;
        text-decoration: none;
      }

      .case-entry__title:hover,
      .case-entry__title:focus-visible {
        text-decoration: underline;
      }

      .case-comments__label {
        display: block;
        font-size: 0.9rem;
        margin-bottom: 6px;
      }

      textarea,
      input {
        width: 100%;
        border: 1px solid rgba(41, 48, 59, 0.35);
        min-height: 42px;
        padding: 8px;
      }

      textarea {
        min-height: 90px;
      }

      .case-comment,
      .case-file {
        border-top: 1px solid rgba(41, 48, 59, 0.12);
      }

      .case-detail-page__error {
        color: #b42318;
      }

      @media (max-width: 860px) {
        .case-detail-page__grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class CaseDetailComponent implements OnInit {
  readonly caseId: string;
  caseRecord: CaseRecord | null = null;
  entries: CaseEntry[] = [];
  commentsByEntry: Record<string, CaseComment[]> = {};
  files: CaseFile[] = [];
  members: CaseMembership[] = [];
  commentDrafts: Record<string, string> = {};
  commentErrors: Record<string, string> = {};
  commentBusyEntryId = '';
  selectedFile: File | null = null;
  uploadState: 'idle' | 'uploading' | 'done' | 'error' = 'idle';
  uploadProgress = 0;
  uploadError = '';
  loading = false;
  errorMessage = '';

  constructor(
    private _route: ActivatedRoute,
    private _caseService: CaseService,
    private _authFacade: AuthFacade
  ) {
    this.caseId = this._route.snapshot.paramMap.get('caseId') || '';
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      caseRecord: this._caseService.getCase(this.caseId),
      entries: this._caseService.listEntries(this.caseId),
      files: this._caseService.listFiles(this.caseId),
      members: this._caseService
        .listMembers(this.caseId)
        .pipe(catchError(() => of({ status: 'success', items: [], nextToken: null }))),
    })
      .pipe(
        switchMap(({ caseRecord, entries, files, members }) => {
          const visibleEntries = (entries.items || []).filter((entry) =>
            isVisibleToCaseClient(entry.visibility)
          );
          const commentRequests = visibleEntries.map((entry) =>
            this._caseService.listComments(this.caseId, entry.id).pipe(
              map((response) => ({
                entryId: entry.id,
                comments: (response.items || []).filter((comment) =>
                  isVisibleToCaseClient(comment.visibility)
                ),
              })),
              catchError(() => of({ entryId: entry.id, comments: [] as CaseComment[] }))
            )
          );

          return (commentRequests.length > 0 ? forkJoin(commentRequests) : of([])).pipe(
            map((comments) => ({
              caseRecord: caseRecord.item,
              entries: visibleEntries,
              files: (files.items || []).filter((file) => this.canShowFile(file)),
              members: members.items || [],
              comments,
            }))
          );
        })
      )
      .subscribe({
        next: ({ caseRecord, entries, files, members, comments }) => {
          this.caseRecord = caseRecord;
          this.entries = entries;
          this.files = files;
          this.members = members;
          this.commentsByEntry = comments.reduce((current, item) => {
            current[item.entryId] = item.comments;
            return current;
          }, {} as Record<string, CaseComment[]>);
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.errorMessage = 'No se pudo cargar el caso';
        },
      });
  }

  canComment(): boolean {
    return this.hasPermission('case.comment');
  }

  canUpload(): boolean {
    return this.hasPermission('case.upload_file');
  }

  commentControlId(entryId: string): string {
    return `case-comment-${entryId.replace(/[^A-Za-z0-9_-]/g, '-')}`;
  }

  submitComment(entryId: string): void {
    if (!this.canComment()) {
      return;
    }
    const text = (this.commentDrafts[entryId] || '').trim();
    if (!text) {
      return;
    }

    this.commentBusyEntryId = entryId;
    this.commentErrors[entryId] = '';
    this._caseService
      .createComment(this.caseId, entryId, {
        text,
        visibility: { mode: 'case_members' },
      })
      .subscribe({
        next: (response) => {
          this.commentsByEntry[entryId] = [
            ...(this.commentsByEntry[entryId] || []),
            response.item,
          ];
          this.commentDrafts[entryId] = '';
          this.commentBusyEntryId = '';
        },
        error: () => {
          this.commentErrors[entryId] = 'No se pudo enviar el comentario';
          this.commentBusyEntryId = '';
        },
      });
  }

  handleFileSelection(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.selectedFile = input?.files?.[0] || null;
    this.uploadState = 'idle';
    this.uploadProgress = 0;
    this.uploadError = '';
  }

  uploadSelectedFile(): void {
    if (!this.selectedFile || !this.canUpload()) {
      return;
    }

    this.uploadState = 'uploading';
    this.uploadProgress = 15;
    this.uploadError = '';
    this._caseService.uploadCaseFile(this.caseId, this.selectedFile).subscribe({
      next: (response) => {
        this.files = [response.item, ...this.files];
        this.selectedFile = null;
        this.uploadProgress = 100;
        this.uploadState = 'done';
      },
      error: () => {
        this.uploadProgress = 0;
        this.uploadState = 'error';
        this.uploadError = 'No se pudo subir el documento';
      },
    });
  }

  fileReviewLabel(file: CaseFile): string {
    return file.externalVisibilityStatus === 'approved'
      ? 'Visible para el cliente'
      : 'En revisión interna';
  }

  canDownloadFile(file: CaseFile): boolean {
    return file.externalVisibilityStatus === 'approved' || this.isOwnFile(file);
  }

  downloadUrl(fileId: string): string {
    return `/api/v2/cases/${encodeURIComponent(this.caseId)}/files/${encodeURIComponent(
      fileId
    )}/download`;
  }

  private canShowFile(file: CaseFile): boolean {
    if (this.isOwnFile(file)) {
      return true;
    }
    return (
      file.externalVisibilityStatus === 'approved' && isVisibleToCaseClient(file.visibility)
    );
  }

  private hasPermission(permission: string): boolean {
    const membership = this.currentMembership();
    if (!membership) {
      return false;
    }
    return membership.permissions?.includes(permission) === true;
  }

  private currentMembership(): CaseMembership | undefined {
    const identity = this._authFacade.identity?.();
    const userId = identity?.id || identity?.sub || identity?.userId;
    const email = identity?.email;
    return this.members.find(
      (member) =>
        (userId && member.userId === userId) || (email && member.email === email)
    );
  }

  private isOwnFile(file: CaseFile): boolean {
    const identity = this._authFacade.identity?.();
    const userId = identity?.id || identity?.sub || identity?.userId;
    return Boolean(userId && (file.uploadedByUserId === userId || file.uploaderUserId === userId));
  }
}
