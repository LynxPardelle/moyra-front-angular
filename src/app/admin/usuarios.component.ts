import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import Swal from 'sweetalert2';
import { UserService } from '../services/user.service';

type UserRole = 'ROLE_USER' | 'ROLE_LEGAL_STAFF' | 'ROLE_ADMIN';

type NewUserForm = {
  name: string;
  email: string;
  role: UserRole;
  relationship: string;
  temporaryPassword: string;
  confirmTemporaryPassword: string;
};

@Component({
  selector: 'admin-usuarios',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.scss'],
})
export class UsuariosComponent implements OnInit {
  public readonly customRelationshipValue = '__custom__';
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
  public readonly caseRoleOptions = [
    {
      name: 'Cliente',
      description: 'Ve sus casos asignados y abre documentos aprobados cuando tenga permiso.',
    },
    {
      name: 'Abogado',
      description: 'Colabora como miembro interno del caso con permisos operativos.',
    },
    {
      name: 'Pasante',
      description: 'Apoya internamente con lectura, comentarios y documentos del caso.',
    },
    {
      name: 'Observador',
      description: 'Consulta información y documentos visibles sin intervenir.',
    },
  ];
  public saving = false;
  public user: NewUserForm = this.emptyUser();
  public relationshipPreset = '';
  public relationshipOptions: string[] = [];

  constructor(private _userService: UserService) {}

  ngOnInit(): void {
    this.loadRelationshipOptions();
  }

  passwordMeetsPolicy(): boolean {
    const password = this.user.temporaryPassword || '';
    return (
      password.length >= 10 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /\d/.test(password)
    );
  }

  passwordsMatch(): boolean {
    return this.user.temporaryPassword === this.user.confirmTemporaryPassword;
  }

  canSubmit(): boolean {
    return (
      this.user.name.trim().length > 0 &&
      this.isValidEmail(this.user.email) &&
      this.passwordMeetsPolicy() &&
      this.passwordsMatch() &&
      !this.saving
    );
  }

  async createUser(): Promise<void> {
    if (!this.canSubmit()) {
      await Swal.fire({
        title: 'Datos incompletos',
        html: 'Revisa nombre, correo y contraseña temporal antes de crear el usuario.',
        icon: 'warning',
      });
      return;
    }

    this.saving = true;
    try {
      const payload = {
        name: this.user.name.trim(),
        email: this.user.email.trim().toLowerCase(),
        role: this.user.role,
        relationship: this.user.relationship.trim(),
        temporaryPassword: this.user.temporaryPassword,
      };

      const response = await this._userService.createUser(payload).toPromise();
      const createdUser = response?.user || payload;

      await Swal.fire({
        title: 'Usuario creado',
        html: `${createdUser.email} ya fue creado. Deberá cambiar su contraseña temporal al iniciar sesión.`,
        icon: 'success',
      });

      this.user = this.emptyUser();
      this.relationshipPreset = '';
    } catch (error: any) {
      await Swal.fire({
        title: 'No se pudo crear el usuario',
        html: error?.error?.message || error?.message || 'Error desconocido.',
        icon: 'error',
      });
    } finally {
      this.saving = false;
    }
  }

  onRelationshipPresetChange(value: string): void {
    if (value === this.customRelationshipValue) {
      if (this.relationshipOptions.includes(this.user.relationship)) {
        this.user.relationship = '';
      }
      return;
    }
    this.user.relationship = value;
  }

  private emptyUser(): NewUserForm {
    return {
      name: '',
      email: '',
      role: 'ROLE_USER',
      relationship: '',
      temporaryPassword: '',
      confirmTemporaryPassword: '',
    };
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
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
      },
      error: () => {
        this.relationshipOptions = [...this.fallbackRelationshipOptions];
      },
    });
  }
}
