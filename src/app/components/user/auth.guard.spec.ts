import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { UserService } from '../../services/user.service';
import { AuthFacade } from '../../store/auth/auth.facade';
import { AuthGuard } from './auth.guard';

function validToken(): string {
  const payload = {
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  const encodedPayload = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `header.${encodedPayload}.signature`;
}

describe('AuthGuard', () => {
  let authState: { hydrated: boolean; isAuthenticated: boolean };
  let authState$: BehaviorSubject<any>;
  let refreshResponse: any;
  let refreshFails: boolean;
  let setCredentialsSpy: jasmine.Spy;
  let guard: AuthGuard;
  let router: Router;

  beforeEach(() => {
    authState = { hydrated: true, isAuthenticated: false };
    authState$ = new BehaviorSubject(authState);
    refreshResponse = null;
    refreshFails = false;
    setCredentialsSpy = jasmine.createSpy('setCredentials');

    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        provideRouter([]),
        {
          provide: AuthFacade,
          useValue: {
            authStateOnceAfterHydration$: () => of(authState),
            state$: authState$.asObservable(),
            setCredentials: setCredentialsSpy,
          },
        },
        {
          provide: UserService,
          useValue: {
            refreshSession: () =>
              refreshFails ? throwError(() => new Error('refresh failed')) : of(refreshResponse),
          },
        },
      ],
    });

    guard = TestBed.inject(AuthGuard);
    router = TestBed.inject(Router);
  });

  it('allows an already authenticated user', (done) => {
    authState = { hydrated: true, isAuthenticated: true };

    guard.canActivate({} as any, { url: '/mi-perfil' } as any).subscribe((result) => {
      expect(result).toBeTrue();
      expect(setCredentialsSpy).not.toHaveBeenCalled();
      done();
    });
  });

  it('refreshes a valid cookie session before allowing the route', (done) => {
    refreshResponse = {
      token: validToken(),
      user: { id: 'user-1', email: 'cliente@moyra.org' },
    };

    guard.canActivate({} as any, { url: '/mi-perfil' } as any).subscribe((result) => {
      expect(result).toBeTrue();
      expect(setCredentialsSpy).toHaveBeenCalledWith(
        jasmine.objectContaining({
          id: 'user-1',
          email: 'cliente@moyra.org',
          role: 'ROLE_USER',
        }),
        refreshResponse.token
      );
      done();
    });
  });

  it('waits briefly for app-level cookie refresh before redirecting', fakeAsync(() => {
    refreshFails = true;
    let result: boolean | UrlTree | undefined;

    guard.canActivate({} as any, { url: '/mi-perfil' } as any).subscribe((nextResult) => {
      result = nextResult;
    });

    tick(799);
    expect(result).toBeUndefined();
    tick(1);
    expect(result instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(result as UrlTree)).toBe('/login?returnUrl=%2Fmi-perfil');
  }));

  it('allows the profile route when global app refresh authenticates in the grace window', fakeAsync(() => {
    refreshFails = true;
    let result: boolean | UrlTree | undefined;

    guard.canActivate({} as any, { url: '/mi-perfil' } as any).subscribe((nextResult) => {
      result = nextResult;
    });

    tick(250);
    authState$.next({ hydrated: true, isAuthenticated: true });
    tick(1);
    expect(result).toBeTrue();
  }));
});
