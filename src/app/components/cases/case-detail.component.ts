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
import { MainService } from '../../services/main.service';
import { AuthFacade } from '../../store/auth/auth.facade';
import { isVisibleToCaseClient } from '../../utils/case-visibility';
import { RichTextEditorComponent } from '../web-utility/rich-text-editor/rich-text-editor.component';

@Component({
  selector: 'app-case-detail',
  imports: [CommonModule, FormsModule, RouterLink, SafeRichHtmlPipe, RichTextEditorComponent],
  template: `
    <main class="case-detail-page">
      <a routerLink="/casos" class="case-detail-page__back">
        {{ text('casesBackLabel', 'Casos') }}
      </a>
      @if (loading) {
      <p class="case-detail-page__panel">{{ text('casesLoadingLabel', 'Cargando caso...') }}</p>
      } @else if (errorMessage) {
      <section class="case-detail-page__panel">
        <p>{{ errorMessage }}</p>
        <button type="button" (click)="load()">
          {{ text('casesRetryButtonLabel', 'Reintentar') }}
        </button>
      </section>
      } @else {
      <header class="case-detail-page__header">
        <div>
          <p class="case-detail-page__reference">{{ caseRecord?.reference || caseId }}</p>
          <h1>{{ caseRecord?.title || 'Caso' }}</h1>
          <div class="case-detail-page__description" [innerHTML]="caseDescription() | safeRichHtml"></div>
          @if (caseUpdatedLabel()) {
          <p class="case-detail-page__meta">{{ caseUpdatedLabel() }}</p>
          }
        </div>
        <a
          routerLink="/notificaciones"
          class="case-detail-page__notifications"
          [attr.aria-label]="notificationButtonAriaLabel()"
        >
          {{ text('casesNotificationsButtonLabel', 'Notificaciones') }}
          @if (hasUnreadNotifications()) {
          <span class="case-detail-page__badge" aria-hidden="true">
            {{ notificationBadgeText() }}
          </span>
          }
        </a>
      </header>

      <section class="case-detail-page__grid">
        <div class="case-detail-page__main">
          <section class="case-detail-page__panel">
            <h2>{{ text('casesUpdatesTitle', 'Actualizaciones') }}</h2>
            @if (entries.length === 0) {
            <p>
              {{
                text(
                  'casesEmptyUpdatesMessage',
                  'Aún no hay actualizaciones visibles para este caso.'
                )
              }}
            </p>
            } @for (entry of entries; track entry.id) {
            <article class="case-entry" [attr.data-entry-id]="entry.id">
              <header class="case-entry__header">
                <a class="case-entry__title" [routerLink]="['/casos', caseId, 'entrada', entry.id]">
                  {{ entry.title }}
                </a>
                <button
                  type="button"
                  class="case-entry__toggle"
                  (click)="toggleEntry(entry.id)"
                  [attr.aria-expanded]="isEntryExpanded(entry.id)"
                >
                  {{
                    isEntryExpanded(entry.id)
                      ? text('casesCollapseEntryLabel', 'Ocultar entrada')
                      : text('casesExpandEntryLabel', 'Ver entrada')
                  }}
                </button>
              </header>

              @if (isEntryExpanded(entry.id)) {
              <div class="case-entry__body" [innerHTML]="entry.text | safeRichHtml"></div>

              <section class="case-comments">
                <header class="case-comments__header">
                  <h3>{{ text('casesCommentsTitle', 'Comentarios') }}</h3>
                  <button
                    type="button"
                    class="case-comments__toggle"
                    (click)="toggleComments(entry.id)"
                    [attr.aria-expanded]="areCommentsExpanded(entry.id)"
                  >
                    {{
                      areCommentsExpanded(entry.id)
                        ? text('casesCollapseCommentsLabel', 'Ocultar comentarios')
                        : text('casesExpandCommentsLabel', 'Ver comentarios')
                    }}
                  </button>
                </header>

                @if (areCommentsExpanded(entry.id)) {
                @for (comment of commentsByEntry[entry.id] || []; track comment.id) {
                <div class="case-comment" [attr.data-comment-id]="comment.id">
                  <p class="case-comment__meta">
                    {{ commentAuthorLabel(comment) }} · {{ commentRelationLabel(comment) }}
                    @if (commentCreatedLabel(comment)) {
                    · {{ commentCreatedLabel(comment) }}
                    }
                  </p>
                  <div [innerHTML]="comment.text | safeRichHtml"></div>
                </div>
                }
                <form (ngSubmit)="submitComment(entry.id)">
                  <app-rich-text-editor
                    [label]="text('casesCommentLabel', 'Escribe un comentario')"
                    [placeholder]="text('casesCommentPlaceholder', 'Escribe un comentario')"
                    [(value)]="commentDrafts[entry.id]"
                    [disabled]="!canComment(entry) || commentBusyEntryId === entry.id"
                    minHeight="150px"
                  />
                  @if (!canComment(entry)) {
                  <p>
                    {{
                      text(
                        'casesCommentsDisabledMessage',
                        'Los comentarios no están habilitados para tu acceso actual.'
                      )
                    }}
                  </p>
                  } @if (commentErrors[entry.id]) {
                  <p class="case-detail-page__error">{{ commentErrors[entry.id] }}</p>
                  }
                  <button
                    type="submit"
                    data-testid="case-comment-submit"
                    [disabled]="!canComment(entry) || commentBusyEntryId === entry.id"
                  >
                    {{ text('casesCommentSubmitLabel', 'Comentar') }}
                  </button>
                </form>
                }
              </section>
              }
            </article>
            }
          </section>
        </div>

        <aside class="case-detail-page__side">
          <section class="case-detail-page__panel">
            <h2>{{ text('casesDocumentsTitle', 'Documentos') }}</h2>
            @if (!canUpload()) {
            <p>
              {{
                text(
                  'casesDocumentsDisabledMessage',
                  'La carga de documentos no está habilitada para tu acceso actual.'
                )
              }}
            </p>
            } @else {
            <form class="case-onedrive-form" (ngSubmit)="addOneDriveLink()">
              <label for="case-onedrive-name">
                {{ text('casesOneDriveNameLabel', 'Nombre del documento') }}
              </label>
              <input
                id="case-onedrive-name"
                name="caseOneDriveName"
                [(ngModel)]="oneDriveLink.fileName"
                [placeholder]="text('casesOneDriveNamePlaceholder', 'Ej. Contrato firmado')"
              />
              <label for="case-onedrive-url">
                {{ text('casesOneDriveUrlLabel', 'Enlace de OneDrive') }}
              </label>
              <input
                id="case-onedrive-url"
                name="caseOneDriveUrl"
                [(ngModel)]="oneDriveLink.linkUrl"
                [placeholder]="
                  text('casesOneDriveUrlPlaceholder', 'https://...sharepoint.com/...')
                "
                type="url"
              />
              <label for="case-onedrive-visibility">
                {{ text('casesOneDriveVisibilityLabel', 'Visibilidad') }}
              </label>
              <select
                id="case-onedrive-visibility"
                name="caseOneDriveVisibility"
                [(ngModel)]="oneDriveLink.visibilityMode"
              >
                <option value="case_members">
                  {{ text('casesOneDriveVisibleToClientOption', 'Visible para el cliente') }}
                </option>
                <option value="internal_only">
                  {{ text('casesOneDriveInternalOnlyOption', 'Sólo interno') }}
                </option>
              </select>
              <small>
                {{
                  text(
                    'casesOneDriveHelpText',
                    'Usa un enlace compartido de OneDrive o SharePoint con permisos revisados.'
                  )
                }}
              </small>
              @if (oneDriveError) {
              <p class="case-detail-page__error">{{ oneDriveError }}</p>
              }
              <button
                type="submit"
                data-testid="case-onedrive-submit"
                [disabled]="oneDriveBusy || !hasOneDriveInputs()"
              >
                {{
                  oneDriveBusy
                    ? text('casesOneDriveSavingLabel', 'Guardando...')
                    : text('casesOneDriveSubmitLabel', 'Agregar enlace')
                }}
              </button>
            </form>
            }

            <div class="case-files">
              @for (file of files; track file.id) {
              <article class="case-file">
                <strong>{{ displayFileName(file) }}</strong>
                <span>{{ fileTypeLabel(file) }}</span>
                <span>{{ fileReviewLabel(file) }}</span>
                @if (canDownloadFile(file)) {
                <a [href]="fileHref(file)" target="_blank" rel="noopener noreferrer">
                  {{ fileActionLabel(file) }}
                </a>
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
        align-items: start;
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

      .case-detail-page__description {
        margin-top: 8px;
        max-width: 760px;
      }

      .case-detail-page__description :where(p) {
        margin: 0 0 8px;
      }

      .case-detail-page__description :where(em, i) {
        font-style: italic;
      }

      .case-detail-page__meta {
        color: rgba(41, 48, 59, 0.68);
        margin: 8px 0 0;
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

      .case-entry__header,
      .case-comments__header {
        align-items: center;
        display: flex;
        gap: 12px;
        justify-content: space-between;
      }

      .case-detail-page__notifications,
      .case-file a,
      button {
        border: 1px solid #4b8ff5;
        color: #4b8ff5;
        background: #ffffff;
        text-decoration: none;
        padding: 8px 12px;
      }

      .case-detail-page__notifications:hover,
      .case-detail-page__notifications:focus-visible,
      .case-file a:hover,
      .case-file a:focus-visible,
      button:not(:disabled):hover,
      button:not(:disabled):focus-visible {
        background: #4b8ff5;
        color: #ffffff;
        outline: 0;
      }

      .case-detail-page__notifications {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .case-detail-page__badge {
        align-items: center;
        background: #4b8ff5;
        border: 2px solid #ffffff;
        border-radius: 999px !important;
        box-shadow: 0 8px 18px rgba(41, 48, 59, 0.18);
        color: #ffffff;
        display: inline-flex;
        font-size: 0.7rem;
        font-weight: 800;
        justify-content: center;
        line-height: 1;
        min-height: 20px;
        min-width: 20px;
        padding: 2px 5px;
        position: absolute;
        right: -10px;
        top: -10px;
      }

      .case-entry__title {
        display: block;
        color: #4b8ff5;
        line-height: 1.45;
        min-width: 0;
        text-decoration: none;
      }

      .case-entry__title:hover,
      .case-entry__title:focus-visible {
        text-decoration: underline;
      }

      .case-entry__body :where(em, i),
      .case-comment :where(em, i) {
        font-style: italic;
      }

      .case-entry__body {
        margin-top: 10px;
      }

      .case-entry__toggle,
      .case-comments__toggle {
        flex: 0 0 auto;
        font-size: 0.85rem;
        min-height: 36px;
        padding: 7px 10px;
      }

      .case-comments__header h3 {
        margin: 0;
      }

      .case-comment__meta {
        color: rgba(41, 48, 59, 0.66);
        font-size: 0.86rem;
        font-weight: 700;
        margin: 0 0 6px;
      }

      .case-comments form button {
        display: block;
        margin-left: auto;
        margin-top: 12px;
      }

      .case-onedrive-form {
        display: grid;
        gap: 8px;
      }

      .case-onedrive-form label {
        font-size: 0.9rem;
        font-weight: 700;
      }

      .case-onedrive-form small {
        color: rgba(41, 48, 59, 0.68);
        line-height: 1.45;
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

      .case-comment,
      .case-file {
        border-top: 1px solid rgba(41, 48, 59, 0.12);
      }

      .case-file {
        display: grid;
        gap: 6px;
      }

      .case-detail-page__error {
        color: #b42318;
      }

      @media (max-width: 860px) {
        .case-detail-page__grid {
          grid-template-columns: 1fr;
        }

        .case-detail-page__header {
          flex-direction: column;
        }

        .case-detail-page__header,
        .case-entry__header,
        .case-comments__header {
          align-items: stretch;
        }

        .case-entry__header,
        .case-comments__header {
          flex-direction: column;
        }

        .case-entry__toggle,
        .case-comments__toggle {
          width: 100%;
        }
      }
    `,
  ],
})
export class CaseDetailComponent implements OnInit {
  readonly caseId: string;
  main: any = null;
  caseRecord: CaseRecord | null = null;
  entries: CaseEntry[] = [];
  commentsByEntry: Record<string, CaseComment[]> = {};
  files: CaseFile[] = [];
  members: CaseMembership[] = [];
  commentDrafts: Record<string, string> = {};
  commentErrors: Record<string, string> = {};
  commentBusyEntryId = '';
  oneDriveLink = {
    fileName: '',
    linkUrl: '',
    visibilityMode: 'case_members',
  };
  oneDriveBusy = false;
  oneDriveError = '';
  unreadNotificationsCount: number | null = null;
  expandedEntryIds = new Set<string>();
  expandedCommentEntryIds = new Set<string>();
  loading = false;
  errorMessage = '';

  constructor(
    private _route: ActivatedRoute,
    private _caseService: CaseService,
    private _mainService: MainService,
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
      main: this._mainService
        .getMain()
        .pipe(catchError(() => of({ main: null }))),
      caseRecord: this._caseService.getCase(this.caseId),
      entries: this._caseService.listEntries(this.caseId),
      files: this._caseService.listFiles(this.caseId),
      members: this._caseService
        .listMembers(this.caseId)
        .pipe(catchError(() => of({ status: 'success', items: [], nextToken: null }))),
      unread: this._caseService
        .getUnreadNotificationCount()
        .pipe(catchError(() => of({ status: 'error', count: 0 }))),
    })
      .pipe(
        switchMap(({ main, caseRecord, entries, files, members, unread }) => {
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
              main: main?.main || null,
              caseRecord: caseRecord.item,
              entries: visibleEntries,
              files: (files.items || []).filter((file) => this.canShowFile(file)),
              members: members.items || [],
              unreadCount: unread.status === 'success' ? unread.count : null,
              comments,
            }))
          );
        })
      )
      .subscribe({
        next: ({ main, caseRecord, entries, files, members, unreadCount, comments }) => {
          this.main = main;
          this.caseRecord = caseRecord;
          this.entries = entries;
          this.files = files;
          this.members = members;
          this.unreadNotificationsCount =
            unreadCount === null ? null : Math.max(0, Number(unreadCount) || 0);
          this.commentsByEntry = comments.reduce((current, item) => {
            current[item.entryId] = item.comments;
            return current;
          }, {} as Record<string, CaseComment[]>);
          this.syncExpandedState();
          this.loading = false;
          this.autoMarkCaseNotificationsRead();
          this.scrollToNotificationTarget();
        },
        error: () => {
          this.loading = false;
          this.errorMessage = 'No se pudo cargar el caso';
        },
      });
  }

  canComment(entry?: CaseEntry): boolean {
    if (this._authFacade.isAdmin()) {
      return true;
    }
    const membership = this.currentMembership();
    if (!membership) {
      return false;
    }
    if (membership.permissions?.includes('case.comment') === true) {
      return true;
    }
    return Boolean(
      entry &&
        membership.permissions?.includes('case.read') === true &&
        isVisibleToCaseClient(entry.visibility)
    );
  }

  canUpload(): boolean {
    return this.hasPermission('case.upload_file');
  }

  canCreateOneDriveLink(): boolean {
    return (
      this.hasOneDriveInputs() &&
      this.looksLikeMicrosoftLink(this.oneDriveLink.linkUrl)
    );
  }

  hasOneDriveInputs(): boolean {
    return (
      this.oneDriveLink.fileName.trim().length > 0 &&
      this.oneDriveLink.linkUrl.trim().length > 0
    );
  }

  commentControlId(entryId: string): string {
    return `case-comment-${entryId.replace(/[^A-Za-z0-9_-]/g, '-')}`;
  }

  submitComment(entryId: string): void {
    const entry = this.entries.find((item) => item.id === entryId);
    if (!this.canComment(entry)) {
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

  addOneDriveLink(): void {
    if (!this.canUpload() || !this.canCreateOneDriveLink()) {
      this.oneDriveError = this.text(
        'casesOneDriveInvalidMessage',
        'Revisa el nombre y usa un enlace de OneDrive o SharePoint válido.'
      );
      return;
    }

    this.oneDriveBusy = true;
    this.oneDriveError = '';
    this._caseService.createOneDriveLink(this.caseId, {
      fileName: this.oneDriveLink.fileName.trim(),
      linkUrl: this.oneDriveLink.linkUrl.trim(),
      visibility: { mode: this.oneDriveLink.visibilityMode },
    }).subscribe({
      next: (response) => {
        this.files = [response.item, ...this.files];
        this.oneDriveLink = {
          fileName: '',
          linkUrl: '',
          visibilityMode: 'case_members',
        };
        this.oneDriveBusy = false;
      },
      error: () => {
        this.oneDriveBusy = false;
        this.oneDriveError = this.text(
          'casesOneDriveErrorMessage',
          'No se pudo agregar el enlace de OneDrive'
        );
      },
    });
  }

  isEntryExpanded(entryId: string): boolean {
    return this.expandedEntryIds.has(entryId);
  }

  toggleEntry(entryId: string): void {
    if (this.expandedEntryIds.has(entryId)) {
      this.expandedEntryIds.delete(entryId);
      return;
    }
    this.expandedEntryIds.add(entryId);
  }

  areCommentsExpanded(entryId: string): boolean {
    return this.expandedCommentEntryIds.has(entryId);
  }

  toggleComments(entryId: string): void {
    if (this.expandedCommentEntryIds.has(entryId)) {
      this.expandedCommentEntryIds.delete(entryId);
      return;
    }
    this.expandedCommentEntryIds.add(entryId);
  }

  fileReviewLabel(file: CaseFile): string {
    return file.externalVisibilityStatus === 'approved'
      ? this.text('casesFileVisibleLabel', 'Visible para el cliente')
      : this.text('casesFileReviewLabel', 'En revisión interna');
  }

  fileActionLabel(file: CaseFile): string {
    return this.isOneDriveFile(file)
      ? this.text('casesOpenDocumentLabel', 'Abrir documento')
      : this.text('casesDownloadDocumentLabel', 'Descargar');
  }

  displayFileName(file: CaseFile): string {
    return file.title || file.originalName || file.fileName;
  }

  fileTypeLabel(file: CaseFile): string {
    if (this.isOneDriveFile(file)) {
      return this.text('casesOneDriveFileTypeLabel', 'Enlace de OneDrive o SharePoint');
    }
    return file.contentType || file.type || this.text('casesFileTypeFallbackLabel', 'Documento');
  }

  fileHref(file: CaseFile): string {
    const linkUrl = String(file.webUrl || file.linkUrl || '').trim();
    if (this.isOneDriveFile(file) && linkUrl) {
      return linkUrl;
    }
    return this.downloadUrl(file.id);
  }

  caseDescription(): string {
    return this.caseRecord?.description?.trim() || '';
  }

  caseUpdatedLabel(): string {
    const value = this.caseRecord?.lastActivityAt || this.caseRecord?.updatedAt;
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return `Última actividad: ${new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Mexico_City',
    }).format(date)}`;
  }

  commentAuthorLabel(comment: CaseComment): string {
    const member = this.memberForComment(comment);
    return (
      this.humanName(comment.authorDisplayName, comment.authorUserId) ||
      this.humanName(member?.displayName, member?.userId) ||
      member?.email ||
      (comment.authorUserId ? 'Administrador' : 'Usuario')
    );
  }

  commentRelationLabel(comment: CaseComment): string {
    const member = this.memberForComment(comment);
    if (!member) {
      return comment.authorUserId ? 'Administrador' : 'Usuario';
    }
    return `${this.roleLabel(member.rolePreset)} / ${this.memberTypeLabel(member.memberType)}`;
  }

  commentCreatedLabel(comment: CaseComment): string {
    return this.formatDate(comment.createdAt);
  }

  canDownloadFile(file: CaseFile): boolean {
    return (
      this._authFacade.isAdmin() ||
      file.externalVisibilityStatus === 'approved' ||
      this.isOwnFile(file)
    );
  }

  downloadUrl(fileId: string): string {
    return `/api/v2/cases/${encodeURIComponent(this.caseId)}/files/${encodeURIComponent(
      fileId
    )}/download`;
  }

  private canShowFile(file: CaseFile): boolean {
    if (this._authFacade.isAdmin()) {
      return true;
    }
    if (this.isOwnFile(file)) {
      return true;
    }
    return (
      file.externalVisibilityStatus === 'approved' && isVisibleToCaseClient(file.visibility)
    );
  }

  private syncExpandedState(): void {
    const entryIds = new Set(this.entries.map((entry) => entry.id));
    if (this.expandedEntryIds.size === 0) {
      this.expandedEntryIds = new Set(entryIds);
    } else {
      this.expandedEntryIds = new Set(
        Array.from(this.expandedEntryIds).filter((entryId) => entryIds.has(entryId))
      );
    }

    if (this.expandedCommentEntryIds.size === 0) {
      this.expandedCommentEntryIds = new Set(entryIds);
    } else {
      this.expandedCommentEntryIds = new Set(
        Array.from(this.expandedCommentEntryIds).filter((entryId) => entryIds.has(entryId))
      );
    }

    const targetCommentId = this.queryParam('commentId');
    const targetEntryId = this.queryParam('entryId') || this.entryIdForComment(targetCommentId);
    if (targetEntryId && entryIds.has(targetEntryId)) {
      this.expandedEntryIds.add(targetEntryId);
      this.expandedCommentEntryIds.add(targetEntryId);
    }
  }

  private autoMarkCaseNotificationsRead(): void {
    this._caseService
      .listNotifications()
      .pipe(
        switchMap((response) => {
          const unreadForCase = (response.items || []).filter(
            (notification) =>
              notification.caseId === this.caseId &&
              !notification.readAt &&
              !notification.manualUnreadAt
          );
          if (unreadForCase.length === 0) {
            return of([]);
          }
          return forkJoin(
            unreadForCase.map((notification) =>
              this._caseService
                .markNotificationRead(notification.id)
                .pipe(catchError(() => of(null)))
            )
          );
        }),
        catchError(() => of([]))
      )
      .subscribe((results) => {
        const marked = results.filter(Boolean).length;
        if (marked > 0 && this.unreadNotificationsCount !== null) {
          this.unreadNotificationsCount = Math.max(0, this.unreadNotificationsCount - marked);
        }
      });
  }

  private scrollToNotificationTarget(): void {
    const targetCommentId = this.queryParam('commentId');
    const targetEntryId = this.queryParam('entryId') || this.entryIdForComment(targetCommentId);
    const targetName = targetCommentId ? 'data-comment-id' : targetEntryId ? 'data-entry-id' : '';
    const targetValue = targetCommentId || targetEntryId;
    if (!targetName || !targetValue || typeof document === 'undefined') {
      return;
    }

    setTimeout(() => {
      const target = Array.from(document.querySelectorAll<HTMLElement>(`[${targetName}]`)).find(
        (element) => element.getAttribute(targetName) === targetValue
      );
      target?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
  }

  private entryIdForComment(commentId: string): string {
    if (!commentId) {
      return '';
    }
    return (
      Object.entries(this.commentsByEntry).find(([, comments]) =>
        comments.some((comment) => comment.id === commentId)
      )?.[0] || ''
    );
  }

  private queryParam(name: string): string {
    return (this._route.snapshot as any).queryParamMap?.get(name) || '';
  }

  private hasPermission(permission: string): boolean {
    if (this._authFacade.isAdmin()) {
      return true;
    }
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

  private memberForComment(comment: CaseComment): CaseMembership | undefined {
    return this.members.find((member) => member.userId && member.userId === comment.authorUserId);
  }

  private isOwnFile(file: CaseFile): boolean {
    const identity = this._authFacade.identity?.();
    const userId = identity?.id || identity?.sub || identity?.userId;
    return Boolean(userId && (file.uploadedByUserId === userId || file.uploaderUserId === userId));
  }

  text(key: string, fallback: string): string {
    const value = this.main?.pageTexts?.[key];
    return typeof value === 'string' && value.trim() ? value : fallback;
  }

  hasUnreadNotifications(): boolean {
    return (this.unreadNotificationsCount ?? 0) > 0;
  }

  notificationBadgeText(): string {
    const count = this.unreadNotificationsCount ?? 0;
    return count > 99 ? '99+' : `${count}`;
  }

  notificationButtonAriaLabel(): string {
    const label = this.text('casesNotificationsButtonLabel', 'Notificaciones');
    if (!this.hasUnreadNotifications()) {
      return label;
    }
    const count = this.unreadNotificationsCount ?? 0;
    const unreadLabel = count === 1 ? 'notificación sin leer' : 'notificaciones sin leer';
    return `${label}. ${count} ${unreadLabel}`;
  }

  private isOneDriveFile(file: CaseFile): boolean {
    return file.storageProvider === 'onedrive' || file.type === 'onedrive-link';
  }

  private formatDate(value?: string): string {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Mexico_City',
    }).format(date);
  }

  private roleLabel(role?: string): string {
    return (
      {
        attorney: 'Abogado',
        pasante: 'Pasante',
        client: 'Cliente',
        external_observer: 'Observador',
        observer: 'Observador',
      }[String(role || '')] || role || 'Miembro'
    );
  }

  private memberTypeLabel(type?: string): string {
    return type === 'internal' ? 'Equipo Moyra' : 'Cliente o invitado externo';
  }

  private humanName(value?: string, id?: string): string {
    const name = String(value || '').trim();
    return name && name !== id && !/^[0-9a-f-]{24,}$/i.test(name) ? name : '';
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
