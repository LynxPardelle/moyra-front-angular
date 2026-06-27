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
            <article class="case-entry">
              <a class="case-entry__title" [routerLink]="['/casos', caseId, 'entrada', entry.id]">
                {{ entry.title }}
              </a>
              <div class="case-entry__body" [innerHTML]="entry.text | safeRichHtml"></div>

              <section class="case-comments">
                <h3>{{ text('casesCommentsTitle', 'Comentarios') }}</h3>
                @for (comment of commentsByEntry[entry.id] || []; track comment.id) {
                <div class="case-comment" [innerHTML]="comment.text | safeRichHtml"></div>
                }
                <form (ngSubmit)="submitComment(entry.id)">
                  <app-rich-text-editor
                    [label]="text('casesCommentLabel', 'Escribe un comentario')"
                    [placeholder]="text('casesCommentPlaceholder', 'Escribe un comentario')"
                    [(value)]="commentDrafts[entry.id]"
                    [disabled]="!canComment() || commentBusyEntryId === entry.id"
                    minHeight="150px"
                  />
                  @if (!canComment()) {
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
                    [disabled]="!canComment() || commentBusyEntryId === entry.id"
                  >
                    {{ text('casesCommentSubmitLabel', 'Comentar') }}
                  </button>
                </form>
              </section>
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
                [disabled]="oneDriveBusy || !canCreateOneDriveLink()"
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
                <span>{{ fileReviewLabel(file) }}</span>
                @if (canDownloadFile(file)) {
                <a [href]="downloadUrl(file.id)" target="_blank" rel="noopener noreferrer">
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

      .case-detail-page__notifications,
      .case-file a,
      button {
        border: 1px solid #4b8ff5;
        color: #4b8ff5;
        background: #ffffff;
        text-decoration: none;
        padding: 8px 12px;
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
        margin-bottom: 10px;
        text-decoration: none;
      }

      .case-entry__title:hover,
      .case-entry__title:focus-visible {
        text-decoration: underline;
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
  };
  oneDriveBusy = false;
  oneDriveError = '';
  unreadNotificationsCount: number | null = null;
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

  canCreateOneDriveLink(): boolean {
    return (
      this.oneDriveLink.fileName.trim().length > 0 &&
      this.oneDriveLink.linkUrl.trim().length > 0 &&
      this.looksLikeMicrosoftLink(this.oneDriveLink.linkUrl)
    );
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
      visibility: { mode: 'case_members' },
    }).subscribe({
      next: (response) => {
        this.files = [response.item, ...this.files];
        this.oneDriveLink = { fileName: '', linkUrl: '' };
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
