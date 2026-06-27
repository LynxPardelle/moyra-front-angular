import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { UserService } from '../../services/user.service';

type AdminUser = {
  id?: string;
  _id?: string;
  sub?: string;
  name?: string;
  displayName?: string;
  email?: string;
  role?: string;
};

@Component({
  selector: 'app-admin-users-list',
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="admin-users-list">
      <header class="admin-users-list__header">
        <div>
          <p>Usuarios</p>
          <h1>Directorio</h1>
        </div>
        <a routerLink="/admin/usuarios/nuevo">Crear usuario</a>
      </header>

      <label class="admin-users-list__search">
        Buscar usuario
        <input name="userSearch" [(ngModel)]="searchTerm" placeholder="Nombre, correo o rol" />
      </label>

      @if (loading) {
      <p class="admin-users-list__state">Cargando usuarios...</p>
      } @else if (filteredUsers().length === 0) {
      <p class="admin-users-list__state">No hay usuarios para mostrar.</p>
      } @else {
      <div class="admin-users-list__table-wrap">
        <table class="admin-users-list__table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Rol global</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (user of filteredUsers(); track userKey(user)) {
            <tr>
              <td>{{ userLabel(user) }}</td>
              <td>{{ user.email || 'Sin correo' }}</td>
              <td>{{ roleLabel(user.role) }}</td>
              <td>
                <a [routerLink]="['/admin/usuarios', userKey(user)]">Ver perfil</a>
              </td>
            </tr>
            }
          </tbody>
        </table>
      </div>
      }
    </section>
  `,
  styles: [
    `
      .admin-users-list {
        color: #29303b;
        margin: 0 auto;
        padding: 24px 0;
        width: min(1180px, calc(100vw - 32px));
      }

      .admin-users-list__header,
      .admin-users-list__search,
      .admin-users-list__state,
      .admin-users-list__table {
        background: #ffffff;
        border: 1px solid rgba(41, 48, 59, 0.18);
      }

      .admin-users-list__header {
        align-items: end;
        display: flex;
        gap: 12px;
        justify-content: space-between;
        margin-bottom: 16px;
        padding: 16px;
      }

      .admin-users-list__header p {
        color: #4b8ff5;
        margin: 0;
        text-transform: uppercase;
      }

      .admin-users-list__search {
        color: rgba(41, 48, 59, 0.72);
        display: grid;
        font-size: 0.82rem;
        font-weight: 700;
        gap: 4px;
        margin-bottom: 16px;
        padding: 12px 16px;
      }

      input {
        border: 1px solid rgba(41, 48, 59, 0.28);
        box-shadow: inset 4px 0 0 rgba(75, 143, 245, 0.62);
        min-height: 42px;
        padding: 0.8rem 0.9rem 0.8rem 1rem;
      }

      .admin-users-list__table-wrap {
        overflow-x: auto;
      }

      .admin-users-list__table {
        border-collapse: collapse;
        width: 100%;
      }

      th,
      td {
        border: 1px solid rgba(41, 48, 59, 0.18);
        padding: 10px;
        text-align: left;
      }

      a {
        border: 1px solid #4b8ff5;
        color: #4b8ff5;
        display: inline-block;
        padding: 8px 10px;
        text-decoration: none;
      }

      a:hover,
      a:focus-visible {
        background: #4b8ff5;
        color: #ffffff;
        outline: 0;
      }
    `,
  ],
})
export class AdminUsersListComponent implements OnInit {
  users: AdminUser[] = [];
  searchTerm = '';
  loading = true;

  constructor(private _userService: UserService) {}

  ngOnInit(): void {
    this._userService.getUsers(0, 200, '-create_at').subscribe({
      next: (response) => {
        this.users = this.withCurrentUser(this.normalizeUsers(response));
        this.loading = false;
      },
      error: () => {
        this.users = [];
        this.loading = false;
      },
    });
  }

  filteredUsers(): AdminUser[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      return this.users;
    }
    return this.users.filter((user) =>
      [this.userLabel(user), user.email, this.roleLabel(user.role)]
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }

  userKey(user: AdminUser): string {
    return String(user.id || user._id || user.sub || user.email || '').trim();
  }

  userLabel(user: AdminUser): string {
    return String(user.displayName || user.name || user.email || 'Usuario').trim();
  }

  roleLabel(role?: string): string {
    return (
      {
        ROLE_ADMIN: 'Administrador',
        ROLE_LEGAL_STAFF: 'Equipo legal',
        ROLE_USER: 'Usuario',
      }[String(role || '')] || role || 'Sin rol'
    );
  }

  private normalizeUsers(response: any): AdminUser[] {
    const list = Array.isArray(response)
      ? response
      : response?.users || response?.items || response?.data || [];
    return Array.isArray(list) ? list : [];
  }

  private withCurrentUser(users: AdminUser[]): AdminUser[] {
    const current = this._userService.getIdentity() as AdminUser | null;
    if (!current || users.some((user) => this.userKey(user) === this.userKey(current))) {
      return users;
    }
    return [current, ...users];
  }
}
