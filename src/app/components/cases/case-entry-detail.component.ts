import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-case-entry-detail',
  imports: [CommonModule, RouterLink],
  template: `
    <main class="case-entry-page">
      <a [routerLink]="['/casos', caseId]" class="case-entry-page__back">Volver al caso</a>
      <h1>Entrada del caso</h1>
      <p class="case-entry-page__reference">{{ entryId }}</p>
    </main>
  `,
  styles: [
    `
      .case-entry-page {
        width: min(1120px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 24px 0;
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
    `,
  ],
})
export class CaseEntryDetailComponent {
  readonly caseId: string;
  readonly entryId: string;

  constructor(private _route: ActivatedRoute) {
    this.caseId = this._route.snapshot.paramMap.get('caseId') || '';
    this.entryId = this._route.snapshot.paramMap.get('entryId') || '';
  }
}
