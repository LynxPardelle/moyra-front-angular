import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, of, switchMap } from 'rxjs';

import { SafeRichHtmlPipe } from '../../pipes/safe-rich-html';
import { CaseComment, CaseEntry, CaseMembership } from '../../models/case';
import { CaseService } from '../../services/case.service';
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
        <div class="case-entry-page__body" [innerHTML]="entry.text | safeRichHtml"></div>
      </article>
      <section class="case-entry-page__panel">
        <h2>{{ text('casesCommentsTitle', 'Comentarios') }}</h2>
        @for (comment of comments; track comment.id) {
        <div class="case-entry-comment" [innerHTML]="comment.text | safeRichHtml"></div>
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

      button,
      .case-entry-page__back {
        border: 1px solid #4b8ff5;
        background: #ffffff;
        color: #4b8ff5;
        padding: 8px 12px;
        text-decoration: none;
      }

      button {
        justify-self: end;
      }

      button:not(:disabled):hover,
      button:not(:disabled):focus-visible,
      .case-entry-page__back:hover,
      .case-entry-page__back:focus-visible {
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
      members: this._caseService
        .listMembers(this.caseId)
        .pipe(catchError(() => of({ status: 'success', items: [], nextToken: null }))),
    })
      .pipe(
        switchMap(({ main, entries, members }) => {
          this.main = main?.main || null;
          this.members = members.items || [];
          const entry =
            (entries.items || []).find(
              (item) => item.id === this.entryId && isVisibleToCaseClient(item.visibility)
            ) || null;
          this.entry = entry;
          if (!entry) {
            this.errorMessage = this.text(
              'casesEntryNotFoundMessage',
              'No se encontró la entrada solicitada.'
            );
          }
          return this._caseService.listComments(this.caseId, this.entryId);
        })
      )
      .subscribe((comments) => {
        this.comments = (comments.items || []).filter((comment) =>
          isVisibleToCaseClient(comment.visibility)
        );
      });
  }

  canComment(): boolean {
    return this.hasPermission('case.comment');
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
          this.comments = [...this.comments, response.item];
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
}
