import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ChangePasswordComponent } from './change-password.component';
import { AuthFacade } from '../../../store/auth/auth.facade';
import { UserService } from '../../../services/user.service';

describe('ChangePasswordComponent', () => {
  let component: ChangePasswordComponent;
  let fixture: ComponentFixture<ChangePasswordComponent>;
  let isAuthenticated: boolean;
  let changePasswordSpy: jasmine.Spy;

  beforeEach(async () => {
    isAuthenticated = true;
    changePasswordSpy = jasmine
      .createSpy('changePassword')
      .and.returnValue(of({ status: 'success' }));

    await TestBed.configureTestingModule({
      imports: [ChangePasswordComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthFacade,
          useValue: {
            authStateOnceAfterHydration$: () =>
              of({
                hydrated: true,
                isAuthenticated,
                isAdmin: false,
                identity: null,
                token: null,
                role: null,
                expiresAt: null,
              }),
          },
        },
        {
          provide: UserService,
          useValue: {
            changePassword: changePasswordSpy,
          },
        },
      ],
    }).compileComponents();
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(ChangePasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('renders the standalone account password form', () => {
    createComponent();

    expect(fixture.nativeElement.textContent).toContain('Cambiar contraseña');
    expect(fixture.nativeElement.textContent).toContain('Contraseña actual');
  });

  it('redirects anonymous users to login with the account return URL', () => {
    isAuthenticated = false;
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');

    createComponent();

    expect(navigateSpy).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/cambiar-contrasena' },
    });
  });

  it('blocks mismatched password confirmation before calling the service', () => {
    createComponent();
    component.passwordChange = {
      currentPassword: 'current-password',
      newPassword: 'new-password-1',
      confirmPassword: 'new-password-2',
    };

    component.submitPasswordChange();

    expect(component.error).toBe('Las contraseñas no coinciden.');
    expect(changePasswordSpy).not.toHaveBeenCalled();
  });

  it('blocks short passwords before calling the service', () => {
    createComponent();
    component.passwordChange = {
      currentPassword: 'current-password',
      newPassword: 'short',
      confirmPassword: 'short',
    };

    component.submitPasswordChange();

    expect(component.error).toBe('La nueva contraseña debe tener al menos 10 caracteres.');
    expect(changePasswordSpy).not.toHaveBeenCalled();
  });

  it('changes the current authenticated user password', () => {
    createComponent();
    component.passwordChange = {
      currentPassword: 'current-password',
      newPassword: 'new-password-123',
      confirmPassword: 'new-password-123',
    };

    component.submitPasswordChange();

    expect(changePasswordSpy).toHaveBeenCalledWith(
      'current-password',
      'new-password-123'
    );
    expect(component.message).toBe('Contraseña actualizada.');
  });

  it('maps direct Cognito authorization errors into a readable message', () => {
    changePasswordSpy.and.returnValue(
      throwError(() => ({
        error: { __type: 'NotAuthorizedException' },
      }))
    );
    createComponent();
    component.passwordChange = {
      currentPassword: 'bad-password',
      newPassword: 'new-password-123',
      confirmPassword: 'new-password-123',
    };

    component.submitPasswordChange();

    expect(component.error).toBe('La contraseña actual no es correcta o la sesión expiró.');
  });
});
