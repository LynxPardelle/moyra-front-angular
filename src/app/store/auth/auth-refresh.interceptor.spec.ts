import { HttpClient, HttpHeaders, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { apiUrl } from '../../services/global';
import { UserService } from '../../services/user.service';
import { AuthFacade } from './auth.facade';
import { authRefreshInterceptor } from './auth-refresh.interceptor';

describe('authRefreshInterceptor', () => {
  let http: HttpTestingController;
  let httpClient: HttpClient;
  let authFacade: jasmine.SpyObj<AuthFacade>;
  let userService: jasmine.SpyObj<UserService>;
  let refreshedToken: string;

  beforeEach(() => {
    refreshedToken = fakeJwt({
      sub: 'admin-user',
      exp: futureExpiration(),
      'cognito:groups': ['ROLE_ADMIN'],
    });
    authFacade = jasmine.createSpyObj<AuthFacade>('AuthFacade', ['setCredentials', 'logout']);
    userService = jasmine.createSpyObj<UserService>('UserService', ['refreshSession']);
    userService.refreshSession.and.returnValue(
      of({
        user: { email: 'admin@moyra.org' },
        token: refreshedToken,
      })
    );

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authRefreshInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthFacade, useValue: authFacade },
        { provide: UserService, useValue: userService },
      ],
    });

    http = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
  });

  afterEach(() => {
    http.verify();
  });

  it('refreshes the session once and retries a protected request after 401', (done) => {
    httpClient
      .get<{ ok: boolean }>(apiUrl('/admin/protected'), {
        headers: new HttpHeaders({ Authorization: 'expired-token' }),
      })
      .subscribe((response) => {
        expect(response.ok).toBeTrue();
        expect(userService.refreshSession).toHaveBeenCalledTimes(1);
        expect(authFacade.setCredentials).toHaveBeenCalledWith(
          jasmine.objectContaining({ role: 'ROLE_ADMIN' }),
          refreshedToken
        );
        done();
      });

    const firstRequest = http.expectOne(apiUrl('/admin/protected'));
    expect(firstRequest.request.headers.get('Authorization')).toBe('expired-token');
    firstRequest.flush({ message: 'expired' }, { status: 401, statusText: 'Unauthorized' });

    const retryRequest = http.expectOne(apiUrl('/admin/protected'));
    expect(retryRequest.request.headers.get('Authorization')).toBe(refreshedToken);
    retryRequest.flush({ ok: true });
  });
});

function fakeJwt(payload: Record<string, unknown>): string {
  return `${base64Url({ alg: 'none', typ: 'JWT' })}.${base64Url(payload)}.signature`;
}

function base64Url(value: Record<string, unknown>): string {
  return btoa(JSON.stringify(value))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function futureExpiration(): number {
  return Math.floor(Date.now() / 1000) + 3600;
}
