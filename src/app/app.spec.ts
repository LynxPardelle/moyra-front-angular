import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EMPTY, of } from 'rxjs';
import { App } from './app';
import { MainService } from './services/main.service';
import { UserService } from './services/user.service';
import { WebService } from './services/web.service';
import { SharedService } from './services/shared.service';
import { AuthFacade } from './store/auth/auth.facade';
import { NgxAngoraService } from 'ngx-angora-css';
import { CasesFeatureService } from './components/cases/cases-feature.service';

describe('App', () => {
  let isAdmin: boolean;
  let isAuthenticated: boolean;
  let casesEnabled: boolean;
  let logoutSpy: jasmine.Spy;

  beforeEach(async () => {
    isAdmin = false;
    isAuthenticated = false;
    casesEnabled = false;
    logoutSpy = jasmine.createSpy('logout');

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        {
          provide: MainService,
          useValue: {
            getMain: () => of({ main: {} }),
            createMain: () => of({ main: {} }),
          },
        },
        {
          provide: UserService,
          useValue: {
            refreshSession: () => of(null),
          },
        },
        {
          provide: WebService,
          useValue: {
            consoleLog: () => undefined,
          },
        },
        {
          provide: SharedService,
          useValue: {
            changeEmitted$: EMPTY,
            emitChange: () => undefined,
          },
        },
        {
          provide: AuthFacade,
          useValue: {
            hydrate: () => undefined,
            isAdmin: () => isAdmin,
            isAuthenticated: () => isAuthenticated,
            logout: logoutSpy,
            authStateOnceAfterHydration$: () => of({ isAuthenticated: false }),
          },
        },
        {
          provide: CasesFeatureService,
          useValue: {
            isEnabled: () => casesEnabled,
          },
        },
        {
          provide: NgxAngoraService,
          useValue: {
            pushColors: () => undefined,
            cssCreate: () => undefined,
          },
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('renders the brand title without consuming the page h1', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.site-header h1')).toBeNull();
    expect(compiled.querySelector('.titleMontano__name')?.textContent).toContain(
      'Montaño'
    );
  });

  it('lets an admin close the session from the main navigation', () => {
    isAdmin = true;
    isAuthenticated = true;
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const logoutButton = compiled.querySelector<HTMLButtonElement>(
      '[data-testid="site-logout"]'
    );

    expect(logoutButton?.textContent).toContain('Cerrar sesión');

    logoutButton?.click();

    expect(logoutSpy).toHaveBeenCalled();
  });

  it('shows account actions to authenticated non-admin users', () => {
    isAuthenticated = true;
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const links = Array.from(compiled.querySelectorAll('a')).map((link) =>
      link.textContent?.trim()
    );

    expect(links).toContain('Cambiar contraseña');
    expect(links).not.toContain('Panel');
    expect(compiled.querySelector('[data-testid="site-logout"]')?.textContent).toContain(
      'Cerrar sesión'
    );
  });

  it('shows the private cases link only when the feature is enabled for authenticated users', () => {
    casesEnabled = true;
    isAuthenticated = true;

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const links = Array.from(compiled.querySelectorAll('a')).map((link) =>
      link.textContent?.trim()
    );

    expect(links).toContain('Casos');
  });
});
