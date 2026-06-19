import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideStore } from '@ngrx/store';

import { AdminComponent } from './admin.component';
import { CasesFeatureService } from '../components/cases/cases-feature.service';
import { AuthEffects } from '../store/auth/auth.effects';
import { AuthFacade } from '../store/auth/auth.facade';
import { authFeatureKey, authReducer } from '../store/auth/auth.reducer';

describe('AdminComponent', () => {
  let component: AdminComponent;
  let fixture: ComponentFixture<AdminComponent>;
  let casesEnabled: boolean;

  beforeEach(async () => {
    casesEnabled = false;

    await TestBed.configureTestingModule({
      imports: [AdminComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideStore({ [authFeatureKey]: authReducer }),
        provideEffects([AuthEffects]),
        {
          provide: CasesFeatureService,
          useValue: {
            isEnabled: () => casesEnabled,
          },
        },
      ],
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the usage and cost dashboard link', () => {
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Uso y costos');
  });

  it('lets an admin close the session from the admin menu', () => {
    const authFacade = TestBed.inject(AuthFacade);
    const logoutSpy = spyOn(authFacade, 'logout');
    const logoutButton = fixture.nativeElement.querySelector(
      '[data-testid="admin-logout"]'
    ) as HTMLButtonElement | null;

    expect(logoutButton?.textContent).toContain('Cerrar sesión');

    logoutButton?.click();

    expect(logoutSpy).toHaveBeenCalled();
  });

  it('links password change to the standalone account route', () => {
    const link = fixture.nativeElement.querySelector(
      '[data-testid="admin-change-password-link"]'
    ) as HTMLAnchorElement | null;

    expect(link?.textContent).toContain('Cambiar contraseña');
    expect(link?.getAttribute('href')).toBe('/cambiar-contrasena');
  });

  it('shows the cases menu item only when the feature is enabled', () => {
    expect(fixture.nativeElement.textContent).not.toContain('Casos');

    casesEnabled = true;
    fixture = TestBed.createComponent(AdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector(
      '[data-testid="admin-cases-link"]'
    ) as HTMLAnchorElement | null;

    expect(link?.textContent).toContain('Casos');
    expect(link?.getAttribute('href')).toBe('/admin/casos');
  });
});
