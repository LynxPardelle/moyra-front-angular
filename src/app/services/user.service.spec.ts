import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { apiUrl } from './global';
import { UserService } from './user.service';

describe('UserService auth transport', () => {
  let service: UserService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), UserService],
    });

    service = TestBed.inject(UserService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('does not send credentialed cookies from localhost to the remote API login route', () => {
    service.login({ email: 'admin@example.com', password: 'secret' }).subscribe();

    const request = http.expectOne(apiUrl('/auth/login'));
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBeFalse();
    expect(request.request.body).toBe(
      JSON.stringify({ email: 'admin@example.com', password: 'secret' })
    );

    request.flush({
      status: 'success',
      user: { email: 'admin@example.com', role: 'ROLE_ADMIN' },
      token: 'token',
    });
  });

  it('skips refresh calls locally when credentialed auth cookies are unavailable', (done) => {
    service.refreshSession().subscribe((response) => {
      expect(response).toBeNull();
      done();
    });

    http.expectNone(apiUrl('/auth/refresh'));
  });

  it('does not send credentialed cookies from localhost when completing a Cognito challenge', () => {
    service
      .completeNewPasswordChallenge('admin@example.com', 'challenge-session', 'new-password')
      .subscribe();

    const request = http.expectOne(apiUrl('/auth/login'));
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBeFalse();
    expect(request.request.body).toBe(
      JSON.stringify({
        email: 'admin@example.com',
        challengeName: 'NEW_PASSWORD_REQUIRED',
        session: 'challenge-session',
        newPassword: 'new-password',
      })
    );

    request.flush({
      status: 'success',
      user: { email: 'admin@example.com', role: 'ROLE_ADMIN' },
      token: 'token',
    });
  });
});
