import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-case-detail',
  imports: [CommonModule, RouterLink],
  template: `
    <main class="case-detail-page">
      <a routerLink="/casos" class="case-detail-page__back">Casos</a>
      <h1>Detalle del caso</h1>
      <p class="case-detail-page__reference">{{ caseId }}</p>
    </main>
  `,
  styles: [
    `
      .case-detail-page {
        width: min(1120px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 24px 0;
        color: #29303b;
      }

      .case-detail-page__back {
        color: #4b8ff5;
        text-decoration: none;
      }

      .case-detail-page__reference {
        border: 1px solid rgba(41, 48, 59, 0.18);
        padding: 16px;
        background: #ffffff;
      }
    `,
  ],
})
export class CaseDetailComponent {
  readonly caseId: string;

  constructor(private _route: ActivatedRoute) {
    this.caseId = this._route.snapshot.paramMap.get('caseId') || '';
  }
}
