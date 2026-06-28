import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';

import { CaseMembership, CaseRecord } from '../../models/case';
import { CaseService } from '../../services/case.service';
import { UserService } from '../../services/user.service';
import { AuthFacade } from '../../store/auth/auth.facade';

type AdminUser = {
  id?: string;
  _id?: string;
  sub?: string;
  name?: string;
  displayName?: string;
  email?: string;
  role?: string;
  relationship?: string;
  relation?: string;
};

type UserCaseMembership = {
  caseItem: CaseRecord;
  member: CaseMembership;
};

@Component({
  selector: 'app-admin-user-profile',
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="admin-user-profile">
      <a [routerLink]="profileBackLink()" class="admin-user-profile__back">
        {{ profileBackLabel() }}
      </a>

      <header class="admin-user-profile__header">
        <div>
          <p>Perfil</p>
          <h1>{{ userLabel(user) }}</h1>
          <span>{{ user?.email || userId }}</span>
        </div>
        <span class="admin-user-profile__role">{{ roleLabel(user?.role) }}</span>
      </header>

      @if (loading) {
      <p class="admin-user-profile__state">Cargando perfil...</p>
      } @else if (!user && memberships.length === 0) {
      <p class="admin-user-profile__state">
        No se encontró información para este usuario en los datos disponibles.
      </p>
      } @else {
      @if (user) {
      <section class="admin-user-profile__panel">
        <h2>Datos del usuario</h2>
        <form class="admin-user-profile__form" (ngSubmit)="saveProfile()">
          <label>
            Nombre
            <input name="profileDisplayName" [(ngModel)]="profileDraft.displayName" />
          </label>
          <label>
            Correo
            <input name="profileEmail" type="email" [(ngModel)]="profileDraft.email" />
          </label>
          <label>
            Rol global
            @if (canEditGlobalUser()) {
            <select name="profileRole" [(ngModel)]="profileDraft.role">
              <option value="ROLE_USER">Usuario</option>
              <option value="ROLE_LEGAL_STAFF">Equipo legal</option>
              <option value="ROLE_ADMIN">Administrador</option>
            </select>
            } @else {
            <input [value]="roleLabel(user.role)" disabled />
            }
          </label>
          <label>
            Relación
            <select
              name="profileRelationshipPreset"
              [(ngModel)]="profileRelationshipPreset"
              (ngModelChange)="onProfileRelationshipPresetChange($event)"
            >
              <option value="">Sin relación definida</option>
              @for (option of relationshipOptions; track option) {
              <option [value]="option">{{ option }}</option>
              }
              <option [value]="customRelationshipValue">Otra relación</option>
            </select>
          </label>
          @if (profileRelationshipPreset === customRelationshipValue) {
          <label>
            Especificar relación
            <input
              name="profileRelationshipCustom"
              [(ngModel)]="profileDraft.relationship"
              placeholder="Ej. Representante legal"
            />
          </label>
          }
          <button type="submit" [disabled]="savingProfile || !canSaveProfile()">
            {{ savingProfile ? 'Guardando...' : 'Guardar perfil' }}
          </button>
          @if (profileMessage) {
          <small class="admin-user-profile__success">{{ profileMessage }}</small>
          }
          @if (profileError) {
          <small class="admin-user-profile__error">{{ profileError }}</small>
          }
        </form>
      </section>
      }
      <section class="admin-user-profile__panel">
        <h2>Casos asignados</h2>
        @if (memberships.length === 0) {
        <p>Este usuario no aparece como miembro de casos activos.</p>
        } @else {
        <div class="admin-user-profile__table-wrap">
          <table class="admin-user-profile__table">
            <thead>
              <tr>
                <th>Caso</th>
                <th>Referencia</th>
                <th>Rol en el caso</th>
                <th>Permisos</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              @for (membership of memberships; track membership.member.id) {
              <tr>
                <td>
                  <a [routerLink]="caseProfileLink(membership.caseItem)">
                    {{ membership.caseItem.title }}
                  </a>
                </td>
                <td>{{ membership.caseItem.reference || 'Sin referencia' }}</td>
                <td>{{ caseRoleLabel(membership.member.rolePreset) }}</td>
                <td>{{ permissionsSummary(membership.member.permissions) }}</td>
                <td>{{ membership.member.status || 'Sin estado' }}</td>
              </tr>
              }
            </tbody>
          </table>
        </div>
        }
      </section>
      }
    </section>
  `,
  styles: [
    `
      .admin-user-profile {
        color: #29303b;
        margin: 0 auto;
        padding: 24px 0;
        width: min(1180px, calc(100vw - 32px));
      }

      .admin-user-profile__back,
      a {
        color: #4b8ff5;
        text-decoration: none;
      }

      .admin-user-profile__header,
      .admin-user-profile__panel,
      .admin-user-profile__state {
        background: #ffffff;
        border: 1px solid rgba(41, 48, 59, 0.18);
        margin-top: 12px;
        padding: 16px;
      }

      .admin-user-profile__header {
        align-items: end;
        display: flex;
        gap: 12px;
        justify-content: space-between;
      }

      .admin-user-profile__header p {
        color: #4b8ff5;
        margin: 0;
        text-transform: uppercase;
      }

      .admin-user-profile__header h1 {
        margin: 4px 0;
      }

      .admin-user-profile__role {
        border-left: 3px solid rgba(75, 143, 245, 0.62);
        font-weight: 800;
        padding-left: 10px;
      }

      .admin-user-profile__table-wrap {
        overflow-x: auto;
      }

      .admin-user-profile__table {
        border-collapse: collapse;
        width: 100%;
      }

      .admin-user-profile__form {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(4, minmax(160px, 1fr)) auto;
        align-items: end;
      }

      .admin-user-profile__form label {
        color: rgba(41, 48, 59, 0.72);
        display: grid;
        font-size: 0.82rem;
        font-weight: 700;
        gap: 4px;
      }

      input,
      select {
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

      select {
        min-width: 180px;
      }

      button {
        background: #ffffff;
        border: 1px solid #4b8ff5;
        color: #4b8ff5;
        min-height: 38px;
        padding: 7px 10px;
      }

      .admin-user-profile__success {
        color: #1f7a4d;
      }

      .admin-user-profile__error {
        color: #b42318;
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

      a:hover,
      a:focus-visible,
      button:not(:disabled):hover,
      button:not(:disabled):focus-visible {
        background: #4b8ff5;
        color: #ffffff;
        outline: 0;
      }

      @media (max-width: 720px) {
        .admin-user-profile__header {
          align-items: stretch;
          flex-direction: column;
        }

        .admin-user-profile__form {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class AdminUserProfileComponent implements OnInit {
  userId = '';
  user: AdminUser | null = null;
  memberships: UserCaseMembership[] = [];
  loading = true;
  savingProfile = false;
  profileMessage = '';
  profileError = '';
  profileDraft = {
    displayName: '',
    email: '',
    role: 'ROLE_USER',
    relationship: '',
  };
  readonly customRelationshipValue = '__custom__';
  private readonly fallbackRelationshipOptions = [
    'Equipo Moyra',
    'Cliente o invitado externo',
    'Cliente',
    'Proveedor',
    'Familiar',
    'Representante legal',
    'Perito',
    'Testigo',
  ];
  relationshipOptions: string[] = [];
  profileRelationshipPreset = '';

  constructor(
    private _route: ActivatedRoute,
    private _router: Router,
    private _userService: UserService,
    private _caseService: CaseService,
    private _authFacade: AuthFacade
  ) {}

  ngOnInit(): void {
    this.userId = this._route.snapshot.paramMap.get('userId') || '';
    this.loadRelationshipOptions();
    this._authFacade.hydratedOnce$().subscribe(() => this.load());
  }

  load(): void {
    this.loading = true;
    this._userService
      .getUsers(0, 200, '-create_at')
      .pipe(
        catchError(() => of([])),
        switchMap((usersResponse) => {
          const users = this.withCurrentUser(this.normalizeUsers(usersResponse));
          const requestedUserId = this.resolvedUserId();
          this.user = users.find((user) => this.matchesUser(user, requestedUserId)) || null;
          this.resetProfileDraft();
          return this._caseService.listCases().pipe(
            catchError(() => of({ status: 'error', items: [] })),
            switchMap((casesResponse) => {
              const cases = casesResponse.items || [];
              if (cases.length === 0) {
                return of([]);
              }
              return forkJoin(
                cases.map((caseItem) =>
                  this._caseService.listMembers(caseItem.id).pipe(
                    catchError(() => of({ status: 'error', items: [] })),
                    map((membersResponse) =>
                      (membersResponse.items || [])
                        .filter((member) => this.matchesMember(member))
                        .map((member) => ({ caseItem, member }))
                    )
                  )
                )
              ).pipe(map((items) => items.flat()));
            })
          );
        })
      )
      .subscribe((memberships) => {
        this.memberships = memberships;
        if (!this.user && memberships[0]) {
          this.user = this.userFromMember(memberships[0].member);
          this.resetProfileDraft();
        }
        this.loading = false;
      });
  }

  canSaveProfile(): boolean {
    return (
      Boolean(this.user) &&
      this.profileDraft.displayName.trim().length > 0 &&
      this.isValidEmail(this.profileDraft.email) &&
      Boolean(this.profileDraft.role)
    );
  }

  canEditGlobalUser(): boolean {
    return this._authFacade.isAdmin?.() === true;
  }

  saveProfile(): void {
    if (!this.user || !this.canSaveProfile()) {
      return;
    }

    const targetId = this.userKey(this.user) || this.resolvedUserId();
    this.savingProfile = true;
    this.profileMessage = '';
    this.profileError = '';
    const payload = {
        name: this.profileDraft.displayName.trim(),
        displayName: this.profileDraft.displayName.trim(),
        email: this.profileDraft.email.trim().toLowerCase(),
        relationship: this.profileDraft.relationship.trim(),
        ...(this.canEditGlobalUser() ? { role: this.profileDraft.role } : {}),
      };

    this._userService
      .updateUser(targetId, payload)
      .subscribe({
        next: (response) => {
          const updated = this.normalizeUser(response) || {
            ...this.user,
            ...payload,
          };
          this.user = updated;
          this.resetProfileDraft();
          this.profileMessage = 'Perfil guardado.';
          this.savingProfile = false;
        },
        error: (error) => {
          this.profileError = this.profileSaveErrorMessage(error);
          this.savingProfile = false;
        },
      });
  }

  onProfileRelationshipPresetChange(value: string): void {
    if (value === this.customRelationshipValue) {
      if (this.relationshipOptions.includes(this.profileDraft.relationship)) {
        this.profileDraft.relationship = '';
      }
      return;
    }
    this.profileDraft.relationship = value;
  }

  userLabel(user: AdminUser | null): string {
    return this.humanName(user?.displayName) || this.humanName(user?.name) || user?.email || 'Usuario';
  }

  roleLabel(role?: string): string {
    return (
      {
        ROLE_ADMIN: 'Administrador',
        ROLE_LEGAL_STAFF: 'Equipo legal',
        ROLE_USER: 'Usuario',
      }[String(role || '')] || role || 'Sin rol global'
    );
  }

  caseRoleLabel(role?: string): string {
    return (
      {
        attorney: 'Abogado',
        pasante: 'Pasante',
        client: 'Cliente',
        external_observer: 'Observador',
        observer: 'Observador',
      }[String(role || '')] || role || 'Sin rol'
    );
  }

  profileBackLink(): string {
    return this.isStandaloneProfileRoute() ? '/' : '/admin/usuarios';
  }

  profileBackLabel(): string {
    return this.isStandaloneProfileRoute() ? 'Inicio' : 'Usuarios';
  }

  caseProfileLink(caseItem: CaseRecord): string[] {
    return this.isStandaloneProfileRoute()
      ? ['/casos', caseItem.id]
      : ['/admin/casos', caseItem.id];
  }

  permissionsSummary(permissions?: string[]): string {
    if (!permissions?.length) {
      return 'Sin permisos';
    }
    return permissions
      .map(
        (permission) =>
          ({
            'case.read': 'Ver caso',
            'case.write_entry': 'Publicar entradas',
            'case.comment': 'Comentar',
            'case.upload_file': 'Agregar documentos',
            'case.download_file': 'Abrir documentos',
            'case.manage_members': 'Administrar miembros',
            'case.manage_permissions': 'Administrar permisos',
            'case.manage_status': 'Cambiar estado',
            'case.approve_file_visibility': 'Aprobar documentos',
            'case.read_audit': 'Ver auditoría',
            'case.manage_notifications': 'Administrar notificaciones',
          }[permission] || permission)
      )
      .join(', ');
  }

  private matchesMember(member: CaseMembership): boolean {
    const requestedUserId = this.resolvedUserId();
    const requested = requestedUserId.toLowerCase();
    const email = (this.user?.email || requestedUserId).toLowerCase();
    const userKey = (this.user ? this.userKey(this.user) : requestedUserId).toLowerCase();
    const memberUserId = String(member.userId || '').toLowerCase();
    const memberEmail = String(member.email || '').toLowerCase();
    return (
      Boolean(userKey && memberUserId === userKey) ||
      Boolean(email && memberEmail === email) ||
      Boolean(requested && memberEmail === requested) ||
      Boolean(member.id && member.id === this.userId)
    );
  }

  private matchesUser(user: AdminUser, idOrEmail: string): boolean {
    const key = this.userKey(user).toLowerCase();
    const email = String(user.email || '').toLowerCase();
    const requested = idOrEmail.toLowerCase();
    return key === requested || email === requested;
  }

  private userKey(user: AdminUser): string {
    return String(user.id || user._id || user.sub || user.email || '').trim();
  }

  private normalizeUsers(response: any): AdminUser[] {
    const list = Array.isArray(response)
      ? response
      : response?.users || response?.items || response?.data || [];
    return Array.isArray(list) ? list : [];
  }

  private normalizeUser(response: any): AdminUser | null {
    return response?.user || response?.item || response?.data || null;
  }

  private userFromMember(member: CaseMembership): AdminUser {
    return {
      id: member.userId || member.email || member.id,
      name: this.humanName(member.displayName) || member.email || 'Usuario',
      displayName: this.humanName(member.displayName),
      email: member.email,
      role: this.legalCaseRole(member.rolePreset) ? 'ROLE_LEGAL_STAFF' : 'ROLE_USER',
      relationship: '',
    };
  }

  private legalCaseRole(rolePreset?: string): boolean {
    return rolePreset === 'attorney' || rolePreset === 'pasante';
  }

  private withCurrentUser(users: AdminUser[]): AdminUser[] {
    const current = this.currentIdentity();
    if (!current || !this.userKey(current)) {
      return users;
    }
    return [
      current,
      ...users.filter(
        (user) => this.userKey(user) !== this.userKey(current) && user.email !== current.email
      ),
    ];
  }

  private currentIdentity(): AdminUser | null {
    return (this._authFacade.identity() || this._userService.getIdentity?.()) as AdminUser | null;
  }

  private resolvedUserId(): string {
    if (this.userId && this.userId !== 'me') {
      return this.userId;
    }
    const current = this.currentIdentity();
    return current ? this.userKey(current) || current.email || 'me' : 'me';
  }

  private isStandaloneProfileRoute(): boolean {
    return this._router.url.startsWith('/mi-perfil');
  }

  private resetProfileDraft(): void {
    this.profileDraft = {
      displayName: this.userLabel(this.user),
      email: this.user?.email || '',
      role: this.user?.role || 'ROLE_USER',
      relationship: this.userRelationship(this.user),
    };
    this.profileRelationshipPreset = this.relationshipPresetFor(
      this.profileDraft.relationship
    );
  }

  private relationshipPresetFor(value: string): string {
    if (!value) {
      return '';
    }
    return this.relationshipOptions.includes(value) ? value : this.customRelationshipValue;
  }

  private userRelationship(user: AdminUser | null): string {
    return String(user?.relationship || user?.relation || '').trim();
  }

  private humanName(value?: string): string {
    const name = String(value || '').trim();
    return name && !/^[0-9a-f-]{24,}$/i.test(name) ? name : '';
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  private profileSaveErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const backendMessage =
        typeof error.error?.message === 'string'
          ? error.error.message.trim()
          : typeof error.error === 'string'
            ? error.error.trim()
            : '';
      if (backendMessage) {
        return backendMessage;
      }
      if (error.status === 0) {
        return 'No se pudo conectar con la API. Revisa tu sesión y confirma que el backend de test tenga desplegada la edición de usuarios.';
      }
      if (error.status === 401) {
        return 'Tu sesión expiró o no es válida. Cierra sesión e inicia de nuevo.';
      }
      if (error.status === 403) {
        return 'No tienes permiso para editar este usuario.';
      }
      if (error.status === 404) {
        return 'No se encontró el usuario o la ruta de edición de usuarios no está desplegada.';
      }
      return `No se pudo guardar el perfil. La API respondió ${error.status}.`;
    }

    const message = error instanceof Error ? error.message : String(error || '');
    return message && message !== 'Failed to fetch'
      ? message
      : 'No se pudo guardar el perfil por un error de conexión con la API.';
  }

  private loadRelationshipOptions(): void {
    this._userService.getRelationships().subscribe({
      next: (response) => {
        const options = (response.items || [])
          .filter((item) => item.active !== false)
          .sort((left, right) => (left.order || 0) - (right.order || 0))
          .map((item) => item.label)
          .filter(Boolean);
        this.relationshipOptions = options.length ? options : [...this.fallbackRelationshipOptions];
        if (this.user) {
          this.resetProfileDraft();
        }
      },
      error: () => {
        this.relationshipOptions = [...this.fallbackRelationshipOptions];
      },
    });
  }
}
