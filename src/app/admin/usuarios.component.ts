import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { UserService } from '../services/user.service';

type UserRole = 'ROLE_USER' | 'ROLE_ADMIN';

type NewUserForm = {
  name: string;
  email: string;
  role: UserRole;
  temporaryPassword: string;
  confirmTemporaryPassword: string;
};

@Component({
  selector: 'admin-usuarios',
  imports: [FormsModule],
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.scss'],
})
export class UsuariosComponent {
  public readonly caseRoleOptions = [
    {
      name: 'Cliente',
      description: 'Ve sus casos asignados, comenta y abre documentos aprobados.',
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

  constructor(private _userService: UserService) {}

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

  private emptyUser(): NewUserForm {
    return {
      name: '',
      email: '',
      role: 'ROLE_USER',
      temporaryPassword: '',
      confirmTemporaryPassword: '',
    };
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }
}
