import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, of, switchMap } from 'rxjs';

import { SafeRichHtmlPipe } from '../../pipes/safe-rich-html';
import { CaseComment, CaseEntry, CaseFile, CaseMembership } from '../../models/case';
import { CaseService } from '../../services/case.service';
import { apiUrl } from '../../services/global';
import { MainService } from '../../services/main.service';
import { AuthFacade } from '../../store/auth/auth.facade';
import { isVisibleToCaseClient } from '../../utils/case-visibility';
import { RichTextEditorComponent } from '../web-utility/rich-text-editor/rich-text-editor.component';

@Component({
  selector: 'app-case-entry-detail',
  imports: [CommonModule, FormsModule, RouterLink, SafeRichHtmlPipe, RichTextEditorComponent],
  template: `
    <main class="case-entry-page">
      <a [routerLink]="['/casos', caseId]" class="case-entry-page__back">
        {{ text('casesEntryBackLabel', 'Volver al caso') }}
      </a>
      @if (errorMessage) {
      <p class="case-entry-page__reference">{{ errorMessage }}</p>
      } @else if (entry) {
      <article class="case-entry-page__panel">
        <h1>{{ entry.title }}</h1>
        <p class="case-entry-page__meta">
          {{ entryAuthorLabel(entry) }}
          @if (entryCreatedLabel(entry)) {
          · {{ entryCreatedLabel(entry) }}
          }
        </p>
        <div class="case-entry-page__body" [innerHTML]="entry.text | safeRichHtml"></div>
      </article>
      <section class="case-entry-page__panel">
        <h2>{{ text('casesDocumentsTitle', 'Documentos') }}</h2>
        @if (files.length === 0) {
        <p>{{ text('casesDocumentsEmptyMessage', 'No hay documentos para esta entrada.') }}</p>
        } @for (file of files; track file.id) {
        <article class="case-entry-file">
          <strong>{{ displayFileName(file) }}</strong>
          <span>{{ fileTypeLabel(file) }}</span>
          @if (canDownloadFile(file)) {
          <a [href]="fileHref(file)" target="_blank" rel="noopener noreferrer">
            {{ fileActionLabel(file) }}
          </a>
          }
        </article>
        }
      </section>
      @if (canReadComments()) {
      <section class="case-entry-page__panel">
        <h2>{{ text('casesCommentsTitle', 'Comentarios') }}</h2>
        @for (comment of comments; track comment.id) {
        <div class="case-entry-comment">
          <p class="case-entry-comment__meta">
            {{ commentAuthorLabel(comment) }} · {{ commentRelationLabel(comment) }}
            @if (commentCreatedLabel(comment)) {
            · {{ commentCreatedLabel(comment) }}
            }
          </p>
          <div [innerHTML]="comment.text | safeRichHtml"></div>
        </div>
        }
        <form class="case-entry-comments__form" (ngSubmit)="submitComment()">
          <app-rich-text-editor
            [label]="text('casesCommentLabel', 'Escribe un comentario')"
            [placeholder]="text('casesCommentPlaceholder', 'Escribe un comentario')"
            [(value)]="commentDraft"
            [disabled]="!canComment() || commentBusy"
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
          } @if (commentError) {
          <p class="case-entry-page__error">{{ commentError }}</p>
          }
          <button type="submit" [disabled]="!canComment() || commentBusy">
            {{ text('casesCommentSubmitLabel', 'Comentar') }}
          </button>
        </form>
      </section>
      } @else {
      <section class="case-entry-page__panel">
        <p>
          {{
            text(
              'casesCommentsRestrictedMessage',
              'Los comentarios de esta entrada están restringidos al equipo legal.'
            )
          }}
        </p>
      </section>
      }
      } @else {
      <p class="case-entry-page__reference">
        {{ text('casesEntryLoadingLabel', 'Cargando entrada...') }}
      </p>
      }
    </main>
  `,
  styles: [
    `
      .case-entry-page {
        width: min(1120px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 24px 0 calc(var(--site-footer-offset, 76px) + 24px);
        color: #29303b;
      }

      .case-entry-page__back {
        color: #4b8ff5;
        text-decoration: none;
      }

      .case-entry-page__reference {
        border: 1px solid rgba(41, 48, 59, 0.18);
        padding: 16px;
        background: #ffffff;
      }

      .case-entry-page__panel {
        border: 1px solid rgba(41, 48, 59, 0.18);
        margin-top: 12px;
        padding: 16px;
        background: #ffffff;
      }

      .case-entry-page h1,
      .case-entry-page__body,
      .case-entry-comment,
      .case-entry-page__panel,
      .case-entry-page__reference {
        overflow-wrap: anywhere;
      }

      .case-entry-page__body :where(em, i),
      .case-entry-comment :where(em, i) {
        font-style: italic;
      }

      .case-entry-comments__form {
        display: grid;
        gap: 10px;
        margin-top: 14px;
      }

      .case-entry-comment {
        border-top: 1px solid rgba(41, 48, 59, 0.12);
        padding: 10px 0;
      }

      .case-entry-page__meta,
      .case-entry-comment__meta {
        color: rgba(41, 48, 59, 0.66);
        font-size: 0.86rem;
        font-weight: 700;
        margin: 0 0 6px;
      }

      .case-entry-file {
        border-top: 1px solid rgba(41, 48, 59, 0.12);
        display: grid;
        gap: 6px;
        padding: 10px 0;
      }

      button,
      .case-entry-page__back,
      .case-entry-file a {
        border: 1px solid #4b8ff5;
        background: #ffffff;
        color: #4b8ff5;
        min-height: 44px;
        padding: 8px 12px;
        text-decoration: none;
      }

      button {
        justify-self: end;
      }

      button:not(:disabled):hover,
      button:not(:disabled):focus-visible,
      .case-entry-page__back:hover,
      .case-entry-page__back:focus-visible,
      .case-entry-file a:hover,
      .case-entry-file a:focus-visible {
        background: #4b8ff5;
        color: #ffffff;
        outline: 0;
      }

      button:disabled {
        border-color: rgba(41, 48, 59, 0.22);
        color: rgba(41, 48, 59, 0.45);
        cursor: not-allowed;
      }

      .case-entry-page__error {
        color: #b42318;
      }
    `,
  ],
})
export class CaseEntryDetailComponent implements OnInit {
  readonly caseId: string;
  readonly entryId: string;
  main: any = null;
  entry: CaseEntry | null = null;
  comments: CaseComment[] = [];
  files: CaseFile[] = [];
  members: CaseMembership[] = [];
  commentDraft = '';
  commentError = '';
  commentBusy = false;
  errorMessage = '';

  constructor(
    private _route: ActivatedRoute,
    private _caseService: CaseService,
    private _mainService: MainService,
    private _authFacade: AuthFacade
  ) {
    this.caseId = this._route.snapshot.paramMap.get('caseId') || '';
    this.entryId = this._route.snapshot.paramMap.get('entryId') || '';
  }

  ngOnInit(): void {
    forkJoin({
      main: this._mainService
        .getMain()
        .pipe(catchError(() => of({ main: null }))),
      entries: this._caseService.listEntries(this.caseId),
      files: this._caseService.listFiles(this.caseId),
      members: this._caseService
        .listMembers(this.caseId)
        .pipe(catchError(() => of({ status: 'success', items: [], nextToken: null }))),
    })
      .pipe(
        switchMap(({ main, entries, files, members }) => {
          this.main = main?.main || null;
          this.members = members.items || [];
          const entry =
            (entries.items || []).find(
              (item) => item.id === this.entryId && this.canSeeEntry(item)
            ) || null;
          this.entry = entry;
          this.files = (files.items || []).filter(
            (file) => this.fileEntryIds(file).includes(this.entryId) && this.canShowFile(file)
          );
          if (!entry) {
            this.errorMessage = this.text(
              'casesEntryNotFoundMessage',
              'No se encontró la entrada solicitada.'
            );
          }
          if (!entry || !this.canReadComments()) {
            return of({ status: 'success', items: [], nextToken: null });
          }
          return this._caseService.listComments(this.caseId, this.entryId);
        })
      )
      .subscribe((comments) => {
        this.comments = this.sortedComments(
          (comments.items || []).filter((comment) => this.canSeeComment(comment))
        );
      });
  }

  canComment(): boolean {
    return this.canWriteComments();
  }

  submitComment(): void {
    if (!this.canComment()) {
      return;
    }
    const text = this.commentDraft.trim();
    if (!text) {
      return;
    }

    this.commentBusy = true;
    this.commentError = '';
    this._caseService
      .createComment(this.caseId, this.entryId, {
        text,
        visibility: { mode: 'case_members' },
      })
      .subscribe({
        next: (response) => {
          this.comments = [response.item, ...this.comments];
          this.commentDraft = '';
          this.commentBusy = false;
        },
        error: () => {
          this.commentError = this.text(
            'casesCommentErrorMessage',
            'No se pudo enviar el comentario'
          );
          this.commentBusy = false;
        },
      });
  }

  text(key: string, fallback: string): string {
    const value = this.main?.pageTexts?.[key];
    return typeof value === 'string' && value.trim() ? value : fallback;
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
    return this.roleLabel(member.rolePreset);
  }

  commentCreatedLabel(comment: CaseComment): string {
    return this.formatDate(comment.createdAt);
  }

  entryAuthorLabel(entry: CaseEntry): string {
    const member = this.memberForUserId(entry.authorUserId);
    const name =
      this.humanName(entry.authorDisplayName, entry.authorUserId) ||
      this.humanName(member?.displayName, member?.userId) ||
      member?.email ||
      (entry.authorUserId ? 'Administrador' : 'Usuario');
    const relation = member
      ? this.roleLabel(member.rolePreset)
      : entry.authorUserId
        ? 'Administrador'
        : 'Usuario';
    return `${name} · ${relation}`;
  }

  entryCreatedLabel(entry: CaseEntry): string {
    return this.formatDate(entry.createdAt || entry.updatedAt);
  }

  canReadComments(): boolean {
    if (!this.entry || !this.canSeeEntry(this.entry)) {
      return false;
    }
    if (this._authFacade.isAdmin()) {
      return true;
    }
    const membership = this.currentMembership();
    if (this.isLegalMembership(membership)) {
      return true;
    }
    return membership?.permissions?.includes('case.comment') === true;
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

  fileActionLabel(file: CaseFile): string {
    return this.isOneDriveFile(file)
      ? this.text('casesOpenDocumentLabel', 'Abrir documento')
      : this.text('casesDownloadDocumentLabel', 'Descargar');
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
    if (this._authFacade.isAdmin()) {
      return true;
    }
    return this.hasPermission('case.download_file') && this.canShowFile(file);
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
    return this.memberForUserId(comment.authorUserId);
  }

  private memberForUserId(userId?: string): CaseMembership | undefined {
    return this.members.find((member) => userId && member.userId === userId);
  }

  private canSeeEntry(entry: CaseEntry): boolean {
    if (this._authFacade.isAdmin()) {
      return true;
    }
    const membership = this.currentMembership();
    if (!membership || membership.permissions?.includes('case.read') !== true) {
      return false;
    }
    if (this.isLegalMembership(membership)) {
      return true;
    }
    return isVisibleToCaseClient(entry.visibility, membership);
  }

  private canWriteComments(): boolean {
    if (!this.entry || !this.canSeeEntry(this.entry)) {
      return false;
    }
    if (this._authFacade.isAdmin()) {
      return true;
    }
    const membership = this.currentMembership();
    if (this.isLegalMembership(membership)) {
      return true;
    }
    return membership?.permissions?.includes('case.comment') === true;
  }

  private isLegalMembership(membership?: CaseMembership): boolean {
    return Boolean(
      membership?.rolePreset === 'attorney' ||
        membership?.rolePreset === 'pasante'
    );
  }

  private isOwnFile(file: CaseFile): boolean {
    const identity = this._authFacade.identity?.();
    const userId = identity?.id || identity?.sub || identity?.userId;
    return Boolean(userId && (file.uploadedByUserId === userId || file.uploaderUserId === userId));
  }

  private canShowFile(file: CaseFile): boolean {
    if (this._authFacade.isAdmin()) {
      return true;
    }
    const linkedToEntry = this.fileEntryIds(file).includes(this.entryId);
    if (!linkedToEntry || !this.entry || !this.canSeeEntry(this.entry)) {
      return false;
    }
    if (this.isOwnFile(file)) {
      return true;
    }
    const membership = this.currentMembership();
    return (
      file.externalVisibilityStatus === 'approved' &&
      isVisibleToCaseClient(file.visibility, membership)
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

  private humanName(value?: string, id?: string): string {
    const name = String(value || '').trim();
    return name && name !== id && !/^[0-9a-f-]{24,}$/i.test(name) ? name : '';
  }

  private canSeeComment(comment: CaseComment): boolean {
    if (this._authFacade.isAdmin()) {
      return true;
    }
    const membership = this.currentMembership();
    if (!membership || membership.permissions?.includes('case.read') !== true) {
      return false;
    }
    if (this.isLegalMembership(membership)) {
      return true;
    }
    return (
      membership?.permissions?.includes('case.comment') === true &&
      isVisibleToCaseClient(comment.visibility, membership)
    );
  }

  private sortedComments(comments: CaseComment[]): CaseComment[] {
    return [...comments].sort((left, right) => {
      const leftTime = Date.parse(left.createdAt || left.updatedAt || '') || 0;
      const rightTime = Date.parse(right.createdAt || right.updatedAt || '') || 0;
      return rightTime - leftTime;
    });
  }
}
