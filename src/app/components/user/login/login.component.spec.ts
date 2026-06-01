import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';

import { LoginComponent } from './login.component';
import { AuthFacade } from '../../../store/auth/auth.facade';
import { UserService } from '../../../services/user.service';
import { WebService } from '../../../services/web.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let queryParams: Record<string, string>;
  let queryParamMapSubject: BehaviorSubject<ParamMap>;
  let loginSpy: jasmine.Spy;
  let requestPasswordResetSpy: jasmine.Spy;
  let confirmPasswordResetSpy: jasmine.Spy;

  beforeEach(async () => {
    queryParams = {};
    queryParamMapSubject = new BehaviorSubject(convertToParamMap(queryParams));
    loginSpy = jasmine.createSpy('login').and.returnValue(
      of({
        user: { email: 'dev@example.com' },
        token: jwt({ exp: 2000000000, 'cognito:groups': ['ROLE_ADMIN'] }),
      })
    );
    requestPasswordResetSpy = jasmine
      .createSpy('requestPasswordReset')
      .and.returnValue(of({ status: 'success' }));
    confirmPasswordResetSpy = jasmine
      .createSpy('confirmPasswordReset')
      .and.returnValue(of({ status: 'success' }));

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: queryParamMapSubject.asObservable(),
            snapshot: {
              get queryParamMap() {
                return convertToParamMap(queryParams);
              },
            },
          },
        },
        {
          provide: UserService,
          useValue: {
            login: loginSpy,
            requestPasswordReset: requestPasswordResetSpy,
            confirmPasswordReset: confirmPasswordResetSpy,
          },
        },
        {
          provide: WebService,
          useValue: {
            consoleLog: () => undefined,
          },
        },
        {
          provide: AuthFacade,
          useValue: {
            setCredentials: () => undefined,
          },
        },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('uses the page title as the only login heading level one', () => {
    const loginHeading = fixture.nativeElement.querySelector(
      '.login-panel__title'
    ) as HTMLHeadingElement | null;
    expect(loginHeading?.tagName).toBe('H1');
    expect(loginHeading?.textContent).toContain('Acceso');
  });

  it('shows a logged-out confirmation when redirected after logout', () => {
    setQueryParams({ auth: 'loggedout' });
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Sesión cerrada correctamente');
  });

  it('updates the access notice when login query params change on a reused route', () => {
    setQueryParams({ auth: 'loggedout' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Sesión cerrada correctamente');
  });

  it('opens the password recovery panel from the login form', () => {
    const button = fixture.nativeElement.querySelector(
      '[data-testid="password-recovery-toggle"]'
    ) as HTMLButtonElement | null;

    expect(button?.textContent).toContain('Recuperar contraseña');

    button?.click();
    fixture.detectChanges();

    expect(component.showPasswordRecovery).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Enviar código');
  });

  it('advances password recovery to code confirmation after a reset request', async () => {
    component.openPasswordRecovery();
    component.passwordReset.email = 'dev@example.com';

    await component.requestPasswordReset();
    fixture.detectChanges();

    expect(requestPasswordResetSpy).toHaveBeenCalledWith('dev@example.com');
    expect(component.passwordResetStep).toBe('confirm');
    expect(fixture.nativeElement.textContent).toContain('Código de recuperación');
  });

  it('blocks password recovery confirmation when passwords do not match', async () => {
    component.passwordReset = {
      email: 'dev@example.com',
      code: '123456',
      newPassword: 'new-password-1',
      confirmPassword: 'new-password-2',
    };

    await component.confirmPasswordReset();

    expect(component.passwordResetMessage).toBe('Las contraseñas no coinciden.');
    expect(confirmPasswordResetSpy).not.toHaveBeenCalled();
  });

  it('confirms password recovery and returns to the login form', async () => {
    component.showPasswordRecovery = true;
    component.passwordResetStep = 'confirm';
    component.passwordReset = {
      email: 'dev@example.com',
      code: '123456',
      newPassword: 'new-password-123',
      confirmPassword: 'new-password-123',
    };

    await component.confirmPasswordReset();

    expect(confirmPasswordResetSpy).toHaveBeenCalledWith(
      'dev@example.com',
      '123456',
      'new-password-123'
    );
    expect(component.showPasswordRecovery).toBeFalse();
    expect(component.passwordResetMessage).toBe('Contraseña actualizada. Ya puedes iniciar sesión.');
  });

  it('returns admins to the requested account route after login', async () => {
    setQueryParams({ returnUrl: '/cambiar-contrasena' });
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const navigateByUrlSpy = spyOn(router, 'navigateByUrl');
    component.user.email = 'dev@example.com';
    component.user.password = 'password';

    await component.onSubmit();

    expect(navigateByUrlSpy).toHaveBeenCalledWith('/cambiar-contrasena');
  });

  function setQueryParams(params: Record<string, string>): void {
    queryParams = params;
    queryParamMapSubject.next(convertToParamMap(params));
  }
});

function jwt(payload: Record<string, any>): string {
  return [
    encode({ alg: 'none' }),
    encode(payload),
    'signature',
  ].join('.');
}

function encode(value: Record<string, any>): string {
  return btoa(JSON.stringify(value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}
