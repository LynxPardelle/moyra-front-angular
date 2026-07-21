import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';

import { CasesFeatureService } from './cases-feature.service';
import { CasesGuard } from './cases.guard';
import { UserService } from '../../services/user.service';
import { AuthFacade } from '../../store/auth/auth.facade';

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

describe('CasesGuard', () => {
  let featureEnabled: boolean;
  let authState: { hydrated: boolean; isAuthenticated: boolean; isAdmin?: boolean };
  let authState$: BehaviorSubject<any>;
  let refreshResponse: any;
  let refreshFails: boolean;
  let setCredentialsSpy: jasmine.Spy;
  let guard: CasesGuard;
  let router: Router;

  beforeEach(() => {
    featureEnabled = true;
    authState = { hydrated: true, isAuthenticated: false };
    authState$ = new BehaviorSubject(authState);
    refreshResponse = null;
    refreshFails = false;
    setCredentialsSpy = jasmine.createSpy('setCredentials');

    TestBed.configureTestingModule({
      providers: [
        CasesGuard,
        provideRouter([]),
        {
          provide: CasesFeatureService,
          useValue: {
            isEnabled: () => featureEnabled,
          },
        },
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

    guard = TestBed.inject(CasesGuard);
    router = TestBed.inject(Router);
  });

  it('blocks cases routes when the feature flag is disabled', (done) => {
    featureEnabled = false;
    authState = { hydrated: true, isAuthenticated: true };

    guard.authorize('/casos').subscribe((result) => {
      expect(result instanceof UrlTree).toBeTrue();
      expect(router.serializeUrl(result as UrlTree)).toBe('/?feature=cases');
      done();
    });
  });

  it('allows authenticated users without requiring admin role', (done) => {
    authState = { hydrated: true, isAuthenticated: true, isAdmin: false };

    guard.authorize('/casos').subscribe((result) => {
      expect(result).toBeTrue();
      expect(setCredentialsSpy).not.toHaveBeenCalled();
      done();
    });
  });

  it('refreshes a valid Cognito session before allowing a private case route', (done) => {
    refreshResponse = {
      token: validToken(),
      user: { id: 'client-1', email: 'client@moyra.org' },
    };

    guard.authorize('/casos/case-1').subscribe((result) => {
      expect(result).toBeTrue();
      expect(setCredentialsSpy).toHaveBeenCalledWith(
        jasmine.objectContaining({
          id: 'client-1',
          email: 'client@moyra.org',
          role: 'ROLE_USER',
        }),
        refreshResponse.token
      );
      done();
    });
  });

  it('waits briefly for app-level cookie refresh before redirecting unauthenticated users', fakeAsync(() => {
    refreshFails = true;
    let result: boolean | UrlTree | undefined;

    guard.authorize('/casos/case-1').subscribe((nextResult) => {
      result = nextResult;
    });

    tick(799);
    expect(result).toBeUndefined();
    tick(1);
    expect(result instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(result as UrlTree)).toBe('/login?returnUrl=%2Fcasos%2Fcase-1');
  }));

  it('allows the route when app-level refresh authenticates during the guard grace window', fakeAsync(() => {
    refreshFails = true;
    let result: boolean | UrlTree | undefined;

    guard.authorize('/casos/case-1').subscribe((nextResult) => {
      result = nextResult;
    });

    tick(250);
    authState$.next({ hydrated: true, isAuthenticated: true });
    tick(1);
    expect(result).toBeTrue();
  }));
});
