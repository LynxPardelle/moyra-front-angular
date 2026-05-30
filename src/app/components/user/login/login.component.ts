import {
  Component,
  OnInit,
  Input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';


// Services
import { MainService } from '../../../services/main.service';
import { UserService } from '../../../services/user.service';
import { WebService } from '../../../services/web.service';
import { SharedService } from '../../../services/shared.service';
import { AuthFacade } from '../../../store/auth/auth.facade';
import { createAuthSession } from '../../../store/auth/auth.storage';

// Models
import { Main } from '../../../models/main';
import { User } from '../../../models/user';

// Extras
import Swal from 'sweetalert2';

@Component({
  selector: 'login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  public user: User = new User('', '', '', '', '', new Date());
  public identity: any;
  public token: any;
  public accessNotice: string | null = null;
  public showPasswordRecovery: boolean = false;
  public passwordResetStep: 'request' | 'confirm' = 'request';
  public passwordResetPending: boolean = false;
  public passwordResetMessage: string | null = null;
  public passwordReset = {
    email: '',
    code: '',
    newPassword: '',
    confirmPassword: '',
  };

  // Console Settings
  public document: string = 'login.component.ts';
  public customConsoleCSS =
    'background-color: red; color: white; padding: 1em;';

  constructor(
    private _userService: UserService,

    private _route: ActivatedRoute,
    private _router: Router,
    private _webService: WebService,
    private _authFacade: AuthFacade
  ) {}

  ngOnInit(): void {
    this.accessNotice = this.resolveAccessNotice();
  }

  async onSubmit() {
    try {
      const returnUrl = this._route.snapshot.queryParamMap.get('returnUrl');
      const wantsAdmin = Boolean(returnUrl && returnUrl.startsWith('/admin'));
      const safeReturnUrl =
        returnUrl && returnUrl.startsWith('/') ? returnUrl : null;
      let auth = await this.loginWithCognitoChallengeSupport();
      if (!auth || !auth.user) {
        throw new Error('No se encontró el usuario.');
      }

      let token = auth.token
        ? { token: auth.token }
        : await this._userService.login(this.user, true).toPromise();
      if (!token?.token) {
        throw new Error('No se pudo conseguir el token.');
      }

      this.identity = auth.user;
      this.token = token.token;
      const authSession = createAuthSession(this.identity, this.token);
      if (!authSession) {
        throw new Error('No se pudo validar la sesión recibida.');
      }

      this._authFacade.setCredentials(authSession.identity, authSession.token);
      if (authSession.role === 'ROLE_ADMIN') {
        this._router.navigateByUrl(safeReturnUrl || '/admin');
      } else if (wantsAdmin) {
        this._router.navigate(['/inicio']);
        Swal.fire({
          title: 'Cuenta sin permisos de administración',
          html: 'La cuenta se identificó correctamente, pero no tiene permisos para entrar al panel de administración.',
          icon: 'warning',
          customClass: {
            popup: 'bg-bg1M',
            title: 'text-titleM',
            closeButton: 'bg-titleM',
            confirmButton: 'bg-titleM',
          }
        });
        return;
      } else {
        this._router.navigateByUrl(safeReturnUrl || '/inicio');
      }

      //Alerta
      Swal.fire({
        title: 'Usuario logueado correctamente',
        html: 'El usuario se ha identificado correctamente.',
        icon: 'success',
        customClass: {
          popup: 'bg-bg1M',
          title: 'text-bg-whatsApp',
          closeButton: 'bg-whatsApp',
          confirmButton: 'bg-whatsApp',
        }
      });
    } catch (e: any) {
      const message = e?.error?.message || 'Revisa tus credenciales.';

      //Alerta
      Swal.fire({
        title: 'Usuario no logueado',
        html:
          'El usuario no se ha logueado correctamente. <br/> ' +
          message,
        icon: 'error',
        customClass: {
          popup: 'bg-bg1M',
          title: 'text-titleM',
          closeButton: 'bg-titleM',
          confirmButton: 'bg-titleM',
        }
      });
    }
  }

  openPasswordRecovery(): void {
    this.showPasswordRecovery = true;
    this.passwordResetStep = 'request';
    this.passwordResetMessage = null;
    this.passwordReset.email = this.user.email || this.passwordReset.email;
  }

  cancelPasswordRecovery(): void {
    this.showPasswordRecovery = false;
    this.passwordResetPending = false;
    this.passwordResetMessage = null;
    this.passwordResetStep = 'request';
    this.passwordReset.code = '';
    this.passwordReset.newPassword = '';
    this.passwordReset.confirmPassword = '';
  }

  async requestPasswordReset(): Promise<void> {
    if (!this.passwordReset.email) {
      this.passwordResetMessage = 'Ingresa tu correo electrónico.';
      return;
    }

    this.passwordResetPending = true;
    this.passwordResetMessage = null;

    try {
      await this._userService
        .requestPasswordReset(this.passwordReset.email)
        .toPromise();
      this.passwordResetStep = 'confirm';
      this.passwordResetMessage =
        'Si el correo existe, enviaremos un código de recuperación.';
    } catch (e: any) {
      this.passwordResetMessage =
        e?.error?.message || 'No pudimos iniciar la recuperación.';
    } finally {
      this.passwordResetPending = false;
    }
  }

  async confirmPasswordReset(): Promise<void> {
    if (
      !this.passwordReset.email ||
      !this.passwordReset.code ||
      !this.passwordReset.newPassword
    ) {
      this.passwordResetMessage = 'Completa correo, código y nueva contraseña.';
      return;
    }

    if (this.passwordReset.newPassword !== this.passwordReset.confirmPassword) {
      this.passwordResetMessage = 'Las contraseñas no coinciden.';
      return;
    }

    this.passwordResetPending = true;
    this.passwordResetMessage = null;

    try {
      await this._userService
        .confirmPasswordReset(
          this.passwordReset.email,
          this.passwordReset.code,
          this.passwordReset.newPassword
        )
        .toPromise();
      this.user.email = this.passwordReset.email;
      this.passwordResetMessage = 'Contraseña actualizada. Ya puedes iniciar sesión.';
      this.passwordResetStep = 'request';
      this.showPasswordRecovery = false;
      this.passwordReset.code = '';
      this.passwordReset.newPassword = '';
      this.passwordReset.confirmPassword = '';
      Swal.fire({
        title: 'Contraseña actualizada',
        html: 'Ya puedes iniciar sesión con tu nueva contraseña.',
        icon: 'success',
        customClass: {
          popup: 'bg-bg1M',
          title: 'text-bg-whatsApp',
          closeButton: 'bg-whatsApp',
          confirmButton: 'bg-whatsApp',
        },
      });
    } catch (e: any) {
      this.passwordResetMessage =
        e?.error?.message || 'No pudimos actualizar la contraseña.';
    } finally {
      this.passwordResetPending = false;
    }
  }

  private async loginWithCognitoChallengeSupport(): Promise<any> {
    try {
      return await this._userService.login(this.user).toPromise();
    } catch (e: any) {
      if (
        e?.status !== 409 ||
        e?.error?.challengeName !== 'NEW_PASSWORD_REQUIRED' ||
        !e?.error?.session
      ) {
        throw e;
      }

      const result = await Swal.fire({
        title: 'Crea tu contraseña',
        html: 'Tu usuario de AWS Cognito requiere una contraseña permanente.',
        input: 'password',
        inputPlaceholder: 'Nueva contraseña',
        inputAttributes: {
          autocomplete: 'new-password',
        },
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cancelar',
        customClass: {
          popup: 'bg-bg1M',
          title: 'text-bg-whatsApp',
          closeButton: 'bg-whatsApp',
          confirmButton: 'bg-whatsApp',
        },
        preConfirm: (value) => {
          if (!value || value.length < 10) {
            Swal.showValidationMessage('La contraseña debe tener al menos 10 caracteres.');
            return false;
          }
          return value;
        },
      });

      if (!result.isConfirmed || !result.value) {
        throw new Error('No se completó el cambio de contraseña.');
      }

      return await this._userService
        .completeNewPasswordChallenge(this.user.email, e.error.session, result.value)
        .toPromise();
    }
  }

  private resolveAccessNotice(): string | null {
    const authReason = this._route.snapshot.queryParamMap.get('auth');
    const returnUrl = this._route.snapshot.queryParamMap.get('returnUrl');

    if (authReason === 'expired') {
      return 'Tu sesión expiró. Por seguridad, vuelve a iniciar sesión para continuar.';
    }

    if (authReason === 'invalid') {
      return 'No pudimos validar la sesión guardada. Vuelve a iniciar sesión para continuar.';
    }

    if (authReason === 'loggedout') {
      return 'Sesión cerrada correctamente.';
    }

    if (returnUrl && returnUrl.startsWith('/admin')) {
      return 'Esta zona requiere una cuenta con permisos de administración.';
    }

    return null;
  }
}
