import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';

import { SafeRichHtmlPipe } from '../../pipes/safe-rich-html';
import { CaseComment, CaseEntry } from '../../models/case';
import { CaseService } from '../../services/case.service';
import { isVisibleToCaseClient } from '../../utils/case-visibility';

@Component({
  selector: 'app-case-entry-detail',
  imports: [CommonModule, RouterLink, SafeRichHtmlPipe],
  template: `
    <main class="case-entry-page">
      <a [routerLink]="['/casos', caseId]" class="case-entry-page__back">Volver al caso</a>
      @if (errorMessage) {
      <p class="case-entry-page__reference">{{ errorMessage }}</p>
      } @else if (entry) {
      <article class="case-entry-page__panel">
        <p class="case-entry-page__reference">{{ entryId }}</p>
        <h1>{{ entry.title }}</h1>
        <div [innerHTML]="entry.text | safeRichHtml"></div>
      </article>
      <section class="case-entry-page__panel">
        <h2>Comentarios</h2>
        @for (comment of comments; track comment.id) {
        <p>{{ comment.text }}</p>
        }
      </section>
      } @else {
      <p class="case-entry-page__reference">Cargando entrada...</p>
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
      .case-entry-page__panel,
      .case-entry-page__reference {
        overflow-wrap: anywhere;
      }
    `,
  ],
})
export class CaseEntryDetailComponent implements OnInit {
  readonly caseId: string;
  readonly entryId: string;
  entry: CaseEntry | null = null;
  comments: CaseComment[] = [];
  errorMessage = '';

  constructor(
    private _route: ActivatedRoute,
    private _caseService: CaseService
  ) {
    this.caseId = this._route.snapshot.paramMap.get('caseId') || '';
    this.entryId = this._route.snapshot.paramMap.get('entryId') || '';
  }

  ngOnInit(): void {
    this._caseService
      .listEntries(this.caseId)
      .pipe(
        switchMap((entries) => {
          const entry =
            (entries.items || []).find(
              (item) => item.id === this.entryId && isVisibleToCaseClient(item.visibility)
            ) || null;
          this.entry = entry;
          if (!entry) {
            this.errorMessage = 'No se encontró la entrada solicitada.';
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
}
