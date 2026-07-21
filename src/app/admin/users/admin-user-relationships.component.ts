import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import Swal from 'sweetalert2';

import { UserRelationshipOption, UserService } from '../../services/user.service';

type RelationshipDraft = {
  label: string;
  active: boolean;
  order: number;
};

@Component({
  selector: 'app-admin-user-relationships',
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="admin-relationships">
      <a routerLink="/admin/usuarios" class="admin-relationships__back">Usuarios</a>
      <header class="admin-relationships__header">
        <div>
          <p>Usuarios</p>
          <h1>Relaciones</h1>
          <span>
            Define las relaciones globales que puedes asignar a usuarios y reutilizar en Casos.
          </span>
        </div>
      </header>

      <section class="admin-relationships__panel">
        <h2>Relaciones existentes</h2>
        @if (loading) {
        <p>Cargando relaciones...</p>
        } @else if (relationships.length === 0) {
        <p>No hay relaciones configuradas.</p>
        } @else {
        <div class="admin-relationships__table-wrap">
          <table class="admin-relationships__table">
            <thead>
              <tr>
                <th>Relación</th>
                <th>Orden</th>
                <th>Estado</th>
                <th>Usuarios</th>
                <th>Tipo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (relationship of relationships; track relationship.id) {
              <tr>
                <td>
                  @if (editingId === relationship.id) {
                  <input name="editLabel" [(ngModel)]="editDraft.label" />
                  } @else {
                  {{ relationship.label }}
                  }
                </td>
                <td>
                  @if (editingId === relationship.id) {
                  <input name="editOrder" type="number" [(ngModel)]="editDraft.order" />
                  } @else {
                  {{ relationship.order || 0 }}
                  }
                </td>
                <td>
                  @if (editingId === relationship.id) {
                  <label class="admin-relationships__inline">
                    <input name="editActive" type="checkbox" [(ngModel)]="editDraft.active" />
                    Activa
                  </label>
                  } @else {
                  {{ relationship.active === false ? 'Inactiva' : 'Activa' }}
                  }
                </td>
                <td>{{ relationship.usersCount || 0 }}</td>
                <td>{{ relationship.system ? 'Sistema' : 'Personalizada' }}</td>
                <td>
                  <div class="admin-relationships__actions">
                    @if (editingId === relationship.id) {
                    <button type="button" [disabled]="saving" (click)="saveRelationship(relationship)">
                      {{ saving ? 'Guardando...' : 'Guardar' }}
                    </button>
                    <button type="button" (click)="cancelEdit()">Cancelar</button>
                    } @else {
                    <button type="button" (click)="startEdit(relationship)">Editar</button>
                    <button
                      type="button"
                      class="admin-relationships__danger"
                      [disabled]="deletingId === relationship.id"
                      (click)="deleteRelationship(relationship)"
                    >
                      {{ deletingId === relationship.id ? 'Eliminando...' : 'Eliminar' }}
                    </button>
                    }
                  </div>
                </td>
              </tr>
              }
            </tbody>
          </table>
        </div>
        }
      </section>

      <section class="admin-relationships__panel">
        <h2>Crear relación</h2>
        <form class="admin-relationships__form" (ngSubmit)="createRelationship()">
          <label>
            Nombre
            <input name="newLabel" [(ngModel)]="newDraft.label" placeholder="Ej. Proveedor" />
          </label>
          <label>
            Orden
            <input name="newOrder" type="number" [(ngModel)]="newDraft.order" />
          </label>
          <label class="admin-relationships__inline">
            <input name="newActive" type="checkbox" [(ngModel)]="newDraft.active" />
            Activa
          </label>
          <button type="submit" [disabled]="saving || !newDraft.label.trim()">
            {{ saving ? 'Creando...' : 'Crear relación' }}
          </button>
        </form>
      </section>
    </section>
  `,
  styles: [
    `
      .admin-relationships {
        color: #29303b;
        margin: 0 auto;
        padding: 24px 0;
        width: min(1180px, calc(100vw - 32px));
      }

      .admin-relationships__back,
      a {
        color: #4b8ff5;
        text-decoration: none;
      }

      .admin-relationships__header,
      .admin-relationships__panel {
        background: #ffffff;
        border: 1px solid rgba(41, 48, 59, 0.18);
        margin-top: 12px;
        padding: 16px;
      }

      .admin-relationships__header p {
        color: #4b8ff5;
        margin: 0;
        text-transform: uppercase;
      }

      .admin-relationships__table-wrap {
        overflow-x: auto;
      }

      .admin-relationships__table {
        border-collapse: collapse;
        width: 100%;
      }

      th,
      td {
        border: 1px solid rgba(41, 48, 59, 0.18);
        padding: 10px;
        text-align: left;
        vertical-align: top;
      }

      th {
        background: #f5f7fa;
      }

      .admin-relationships__form {
        align-items: end;
        display: grid;
        gap: 12px;
        grid-template-columns: minmax(180px, 1fr) 120px auto auto;
      }

      label {
        color: rgba(41, 48, 59, 0.72);
        display: grid;
        font-size: 0.82rem;
        font-weight: 700;
        gap: 4px;
      }

      .admin-relationships__inline {
        align-items: center;
        display: flex;
        gap: 8px;
      }

      input:not([type='checkbox']) {
        background: #ffffff;
        border: 1px solid rgba(41, 48, 59, 0.28);
        box-shadow:
          0 8px 18px rgba(41, 48, 59, 0.06),
          inset 4px 0 0 rgba(75, 143, 245, 0.62);
        color: #29303b;
        font-size: 1rem;
        font-weight: 650;
        min-height: 42px;
        padding: 0.8rem 0.9rem 0.8rem 1rem;
        width: 100%;
      }

      button {
        background: #ffffff;
        border: 1px solid #4b8ff5;
        color: #4b8ff5;
        min-height: 38px;
        padding: 7px 10px;
      }

      button:not(:disabled):hover,
      button:not(:disabled):focus-visible,
      .admin-relationships__back:hover,
      .admin-relationships__back:focus-visible {
        background: #4b8ff5;
        color: #ffffff;
        outline: 0;
      }

      .admin-relationships__danger {
        border-color: #cf4b3b;
        color: #cf4b3b;
      }

      .admin-relationships__danger:not(:disabled):hover,
      .admin-relationships__danger:not(:disabled):focus-visible {
        background: #cf4b3b;
        color: #ffffff;
      }

      .admin-relationships__actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      @media (max-width: 720px) {
        .admin-relationships__form {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class AdminUserRelationshipsComponent implements OnInit {
  relationships: UserRelationshipOption[] = [];
  loading = true;
  saving = false;
  deletingId = '';
  editingId = '';
  editDraft: RelationshipDraft = this.emptyDraft();
  newDraft: RelationshipDraft = { label: '', active: true, order: 100 };

  constructor(private _userService: UserService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this._userService.getRelationships().subscribe({
      next: (response) => {
        this.relationships = this.sortRelationships(response.items || []);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        void Swal.fire({
          title: 'No se pudieron cargar las relaciones',
          text: 'Revisa tu sesión o intenta de nuevo.',
          icon: 'error',
        });
      },
    });
  }

  createRelationship(): void {
    const label = this.newDraft.label.trim();
    if (!label) {
      return;
    }
    this.saving = true;
    this._userService
      .createRelationship({
        label,
        active: this.newDraft.active,
        order: Number(this.newDraft.order) || 100,
      })
      .subscribe({
        next: (response) => {
          this.relationships = this.sortRelationships([...this.relationships, response.item]);
          this.newDraft = { label: '', active: true, order: 100 };
          this.saving = false;
          void Swal.fire({
            title: 'Relación creada',
            text: 'La relación ya puede asignarse a usuarios.',
            icon: 'success',
          });
        },
        error: (error) => {
          this.saving = false;
          void Swal.fire({
            title: 'No se pudo crear la relación',
            text: String(error?.error?.message || error?.message || 'Intenta nuevamente.'),
            icon: 'error',
          });
        },
      });
  }

  startEdit(relationship: UserRelationshipOption): void {
    this.editingId = relationship.id;
    this.editDraft = {
      label: relationship.label,
      active: relationship.active !== false,
      order: Number(relationship.order) || 100,
    };
  }

  cancelEdit(): void {
    this.editingId = '';
    this.editDraft = this.emptyDraft();
  }

  saveRelationship(relationship: UserRelationshipOption): void {
    const label = this.editDraft.label.trim();
    if (!label) {
      return;
    }
    this.saving = true;
    this._userService
      .updateRelationship(relationship.id, {
        label,
        active: this.editDraft.active,
        order: Number(this.editDraft.order) || 100,
      })
      .subscribe({
        next: (response) => {
          this.relationships = this.sortRelationships(
            this.relationships.map((item) =>
              item.id === relationship.id ? response.item : item
            )
          );
          this.cancelEdit();
          this.saving = false;
          void Swal.fire({
            title: 'Relación guardada',
            text: 'Los cambios quedaron disponibles para usuarios.',
            icon: 'success',
          });
        },
        error: (error) => {
          this.saving = false;
          void Swal.fire({
            title: 'No se pudo guardar la relación',
            text: String(error?.error?.message || error?.message || 'Intenta nuevamente.'),
            icon: 'error',
          });
        },
      });
  }

  async deleteRelationship(relationship: UserRelationshipOption): Promise<void> {
    const replacements = this.relationships.filter(
      (item) => item.id !== relationship.id && item.active !== false
    );
    if (replacements.length === 0) {
      await Swal.fire({
        title: 'No se puede eliminar',
        text: 'Primero crea otra relación activa para reasignar usuarios afectados.',
        icon: 'warning',
      });
      return;
    }

    const replacementOptions = replacements.reduce<Record<string, string>>((options, item) => {
      options[item.id] = item.label;
      return options;
    }, {});
    const affectedText =
      (relationship.usersCount || 0) > 0
        ? `Usuarios que cambiarán de relación: ${relationship.usersCount}.`
        : 'No hay usuarios asignados a esta relación.';

    const confirmation = await Swal.fire({
      title: 'Eliminar relación',
      html: `${affectedText}<br />Selecciona la relación a la que se moverán.`,
      input: 'select',
      inputOptions: replacementOptions,
      inputPlaceholder: 'Nueva relación',
      showCancelButton: true,
      confirmButtonText: 'Eliminar y reasignar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => (!value ? 'Selecciona una relación de reemplazo.' : null),
    });

    if (!confirmation.isConfirmed || !confirmation.value) {
      return;
    }

    this.deletingId = relationship.id;
    this._userService
      .deleteRelationship(relationship.id, {
        replacementRelationshipId: String(confirmation.value),
      })
      .subscribe({
        next: (response) => {
          this.relationships = this.relationships.filter((item) => item.id !== relationship.id);
          this.deletingId = '';
          const affectedUsers = response.affectedUsers || [];
          void Swal.fire({
            title: 'Relación eliminada',
            html:
              affectedUsers.length > 0
                ? `Usuarios actualizados:<br />${affectedUsers
                    .map((user) => user.displayName || user.name || user.email || user.id)
                    .join('<br />')}`
                : 'No había usuarios por reasignar.',
            icon: 'success',
          });
        },
        error: (error) => {
          this.deletingId = '';
          void Swal.fire({
            title: 'No se pudo eliminar la relación',
            text: String(error?.error?.message || error?.message || 'Intenta nuevamente.'),
            icon: 'error',
          });
        },
      });
  }

  private sortRelationships(items: UserRelationshipOption[]): UserRelationshipOption[] {
    return [...items].sort(
      (left, right) =>
        (Number(left.order) || 0) - (Number(right.order) || 0) ||
        left.label.localeCompare(right.label, 'es')
    );
  }

  private emptyDraft(): RelationshipDraft {
    return { label: '', active: true, order: 100 };
  }
}
