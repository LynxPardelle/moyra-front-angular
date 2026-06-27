import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EMPTY, defer, of } from 'rxjs';
import { App } from './app';
import { MainService } from './services/main.service';
import { UserService } from './services/user.service';
import { WebService } from './services/web.service';
import { SharedService } from './services/shared.service';
import { AuthFacade } from './store/auth/auth.facade';
import { NgxAngoraService } from 'ngx-angora-css';
import { CasesFeatureService } from './components/cases/cases-feature.service';
import { CaseService } from './services/case.service';
import { CaseWebPushService } from './components/notifications/case-web-push.service';

describe('App', () => {
  let isAdmin: boolean;
  let isLegalStaff: boolean;
  let isAuthenticated: boolean;
  let casesEnabled: boolean;
  let unreadCount: number;
  let logoutSpy: jasmine.Spy;
  let startNotificationClickRoutingSpy: jasmine.Spy;

  beforeEach(async () => {
    isAdmin = false;
    isLegalStaff = false;
    isAuthenticated = false;
    casesEnabled = false;
    unreadCount = 0;
    logoutSpy = jasmine.createSpy('logout');
    startNotificationClickRoutingSpy = jasmine.createSpy('startNotificationClickRouting');

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
            state$: defer(() => of({ hydrated: true, isAuthenticated })),
            isAdmin: () => isAdmin,
            isLegalStaff: () => isLegalStaff,
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
          provide: CaseService,
          useValue: {
            getUnreadNotificationCount: () => of({ status: 'success', count: unreadCount }),
          },
        },
        {
          provide: CaseWebPushService,
          useValue: {
            startNotificationClickRouting: startNotificationClickRoutingSpy,
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
    expect(compiled.querySelector('.titleMontano__name')?.textContent).toContain('Montaño');
  });

  it('lets an admin close the session from the menu navigation', () => {
    isAdmin = true;
    isAuthenticated = true;
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const logoutButton = compiled.querySelector<HTMLButtonElement>(
      '[data-testid="site-logout-offcanvas"]'
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
    expect(compiled.querySelector('[data-testid="site-logout-offcanvas"]')?.textContent).toContain(
      'Cerrar sesión'
    );
  });

  it('keeps the header compact behind a modal menu trigger with an unread badge', () => {
    casesEnabled = true;
    isAuthenticated = true;
    unreadCount = 2;

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const menuButton = compiled.querySelector<HTMLButtonElement>(
      '[data-testid="site-menu-toggle"]'
    );

    expect(compiled.querySelector('.site-nav')).toBeNull();
    expect(menuButton?.getAttribute('aria-controls')).toBe('offcanvasMenu');
    expect(menuButton?.getAttribute('aria-label')).toContain('2 notificaciones sin leer');
    expect(menuButton?.querySelector('.site-header__menuBadge')?.textContent?.trim()).toBe('2');
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

  it('starts private case notification click routing when the cases feature is enabled', async () => {
    casesEnabled = true;

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    await Promise.resolve();

    expect(startNotificationClickRoutingSpy).toHaveBeenCalledTimes(1);
  });
});
