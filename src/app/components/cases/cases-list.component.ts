import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-cases-list',
  imports: [CommonModule],
  template: `
    <main class="cases-page">
      <header class="cases-page__header">
        <h1>Casos</h1>
      </header>
      <p class="cases-page__empty">Tus casos aparecerán aquí cuando estén disponibles.</p>
    </main>
  `,
  styles: [
    `
      .cases-page {
        width: min(1120px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 24px 0;
        color: #29303b;
      }

      .cases-page__header {
        border-bottom: 1px solid rgba(41, 48, 59, 0.18);
        margin-bottom: 16px;
      }

      .cases-page__empty {
        border: 1px solid rgba(41, 48, 59, 0.18);
        padding: 16px;
        background: #ffffff;
      }
    `,
  ],
})
export class CasesListComponent {}
