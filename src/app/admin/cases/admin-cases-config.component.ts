import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-cases-config',
  imports: [CommonModule, RouterLink],
  template: `
    <section class="admin-cases-config">
      <a routerLink="/admin/casos" class="admin-cases-config__back">Casos</a>
      <h1>Configuración de casos</h1>
      <p>Los tipos y estados configurables se administrarán desde aquí.</p>
    </section>
  `,
  styles: [
    `
      .admin-cases-config {
        width: min(1180px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 24px 0;
        color: #29303b;
      }

      .admin-cases-config__back {
        color: #4b8ff5;
        text-decoration: none;
      }
    `,
  ],
})
export class AdminCasesConfigComponent {}
