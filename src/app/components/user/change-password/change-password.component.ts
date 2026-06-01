import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { UserService } from '../../../services/user.service';
import { AuthFacade } from '../../../store/auth/auth.facade';

@Component({
  selector: 'app-change-password',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.scss',
})
export class ChangePasswordComponent implements OnDestroy, OnInit {
  public pending = false;
  public message: string | null = null;
  public error: string | null = null;
  public passwordChange = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  };

  private authSubscription?: Subscription;

  constructor(
    private _authFacade: AuthFacade,
    private _router: Router,
    private _userService: UserService,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.authSubscription = this._authFacade
      .authStateOnceAfterHydration$()
      .subscribe((state) => {
        if (!state.isAuthenticated) {
          void this._router.navigate(['/login'], {
            queryParams: { returnUrl: '/cambiar-contrasena' },
          });
        }
      });
  }

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
  }

  submitPasswordChange(): void {
    this.message = null;
    this.error = null;

    if (
      !this.passwordChange.currentPassword ||
      !this.passwordChange.newPassword ||
      !this.passwordChange.confirmPassword
    ) {
      this.error = 'Completa todos los campos.';
      return;
    }

    if (this.passwordChange.newPassword.length < 10) {
      this.error = 'La nueva contraseña debe tener al menos 10 caracteres.';
      return;
    }

    if (this.passwordChange.newPassword !== this.passwordChange.confirmPassword) {
      this.error = 'Las contraseñas no coinciden.';
      return;
    }

    this.pending = true;
    this._userService
      .changePassword(
        this.passwordChange.currentPassword,
        this.passwordChange.newPassword
      )
      .subscribe({
        next: () => {
          this.pending = false;
          this.message = 'Contraseña actualizada.';
          this.passwordChange = {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          };
        },
        error: (e) => {
          this.pending = false;
          this.error = this.passwordChangeErrorMessage(e);
        },
      });
  }

  private passwordChangeErrorMessage(e: any): string {
    const type = String(e?.error?.__type || e?.headers?.get?.('x-amzn-ErrorType') || '');
    const message = e?.error?.message;

    if (type.includes('NotAuthorizedException')) {
      return 'La contraseña actual no es correcta o la sesión expiró.';
    }

    if (type.includes('InvalidPasswordException')) {
      return 'La nueva contraseña no cumple la política de seguridad.';
    }

    if (type.includes('LimitExceededException')) {
      return 'Se alcanzó el límite de intentos. Intenta más tarde.';
    }

    return message || 'No pudimos cambiar la contraseña.';
  }
}
