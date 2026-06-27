import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { apiUrl } from './global';
import { UserService } from './user.service';

const COGNITO_ENDPOINT = 'https://cognito-idp.us-east-1.amazonaws.com/';

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

  it('lists users through the v2 users endpoint with auth query params', () => {
    service.getUsers(0, 200, '-create_at').subscribe();

    const request = http.expectOne(
      (candidate) =>
        candidate.url === apiUrl('/users') &&
        candidate.params.get('page') === '0' &&
        candidate.params.get('ipp') === '200' &&
        candidate.params.get('sort') === '-create_at'
    );
    expect(request.request.method).toBe('GET');

    request.flush({ status: 'success', users: [] });
  });

  it('updates users through the authenticated v2 users endpoint', () => {
    const token = jwt({ exp: 2000000000, token_use: 'access' });
    localStorage.setItem('token', token);

    service.updateUser('user-1', { displayName: 'Usuario editado' }).subscribe();

    const request = http.expectOne(apiUrl('/users/user-1'));
    expect(request.request.method).toBe('PUT');
    expect(request.request.headers.get('Authorization')).toBe(token);
    expect(request.request.body).toBe(JSON.stringify({ displayName: 'Usuario editado' }));

    request.flush({ status: 'success', item: { id: 'user-1', displayName: 'Usuario editado' } });
    localStorage.removeItem('token');
  });

  it('skips refresh calls locally when credentialed auth cookies are unavailable', (done) => {
    service.refreshSession().subscribe((response) => {
      expect(response).toBeNull();
      done();
    });

    http.expectNone(apiUrl('/auth/refresh'));
  });

  it('skips logout calls locally when credentialed auth cookies are unavailable', (done) => {
    service.logoutSession().subscribe((response) => {
      expect(response).toEqual({ status: 'skipped' });
      done();
    });

    http.expectNone(apiUrl('/auth/logout'));
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

  it('requests a Cognito password reset through the auth API', () => {
    service.requestPasswordReset('admin@example.com').subscribe();

    const request = http.expectOne(apiUrl('/auth/forgot-password'));
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBeFalse();
    expect(request.request.body).toBe(JSON.stringify({ email: 'admin@example.com' }));

    request.flush({ status: 'success' });
  });

  it('falls back to Cognito direct reset when the auth API route is not deployed', (done) => {
    service.requestPasswordReset('missing@example.com').subscribe((response) => {
      expect(response.status).toBe('success');
      done();
    });

    const apiRequest = http.expectOne(apiUrl('/auth/forgot-password'));
    apiRequest.flush(
      { message: 'Not Found' },
      { status: 404, statusText: 'Not Found' }
    );

    const cognitoRequest = http.expectOne(COGNITO_ENDPOINT);
    expect(cognitoRequest.request.method).toBe('POST');
    expect(cognitoRequest.request.headers.get('X-Amz-Target')).toBe(
      'AWSCognitoIdentityProviderService.ForgotPassword'
    );
    expect(cognitoRequest.request.body.Username).toBe('missing@example.com');
    expect(cognitoRequest.request.body.ClientId).toBe('4enfk4kbskekcodme7n80d10ju');

    cognitoRequest.flush(
      { __type: 'UserNotFoundException' },
      { status: 400, statusText: 'Bad Request' }
    );
  });

  it('falls back to Cognito direct reset when the auth API route fails before CORS exposes a status', (done) => {
    service.requestPasswordReset('missing@example.com').subscribe((response) => {
      expect(response.status).toBe('success');
      done();
    });

    const apiRequest = http.expectOne(apiUrl('/auth/forgot-password'));
    apiRequest.error(new ProgressEvent('error'), {
      status: 0,
      statusText: 'Unknown Error',
    });

    const cognitoRequest = http.expectOne(COGNITO_ENDPOINT);
    expect(cognitoRequest.request.method).toBe('POST');
    expect(cognitoRequest.request.headers.get('X-Amz-Target')).toBe(
      'AWSCognitoIdentityProviderService.ForgotPassword'
    );
    expect(cognitoRequest.request.body.Username).toBe('missing@example.com');

    cognitoRequest.flush(
      { __type: 'UserNotFoundException' },
      { status: 400, statusText: 'Bad Request' }
    );
  });

  it('confirms a Cognito password reset through the auth API', () => {
    service
      .confirmPasswordReset('admin@example.com', '123456', 'new-password')
      .subscribe();

    const request = http.expectOne(apiUrl('/auth/confirm-forgot-password'));
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBeFalse();
    expect(request.request.body).toBe(
      JSON.stringify({
        email: 'admin@example.com',
        code: '123456',
        newPassword: 'new-password',
      })
    );

    request.flush({ status: 'success' });
  });

  it('falls back to Cognito direct reset confirmation when the auth API route is not deployed', () => {
    service
      .confirmPasswordReset('admin@example.com', '123456', 'new-password')
      .subscribe();

    const apiRequest = http.expectOne(apiUrl('/auth/confirm-forgot-password'));
    apiRequest.flush(
      { message: 'Not Found' },
      { status: 404, statusText: 'Not Found' }
    );

    const cognitoRequest = http.expectOne(COGNITO_ENDPOINT);
    expect(cognitoRequest.request.method).toBe('POST');
    expect(cognitoRequest.request.headers.get('X-Amz-Target')).toBe(
      'AWSCognitoIdentityProviderService.ConfirmForgotPassword'
    );
    expect(cognitoRequest.request.body).toEqual({
      ClientId: '4enfk4kbskekcodme7n80d10ju',
      Username: 'admin@example.com',
      ConfirmationCode: '123456',
      Password: 'new-password',
    });

    cognitoRequest.flush({});
  });

  it('changes the current user password with the stored access token', () => {
    const token = 'eyJhbGciOiJub25lIn0.eyJleHAiOjIwMDAwMDAwMDB9.signature';
    localStorage.setItem('token', token);

    service.changePassword('old-password', 'new-password').subscribe();

    const request = http.expectOne(apiUrl('/auth/change-password'));
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Authorization')).toBe(token);
    expect(request.request.body).toBe(
      JSON.stringify({
        currentPassword: 'old-password',
        newPassword: 'new-password',
      })
    );

    request.flush({ status: 'success' });
    localStorage.removeItem('token');
  });

  it('falls back to Cognito direct password change with a stored access token when the auth API route is not deployed', () => {
    const token = jwt({ exp: 2000000000, token_use: 'access' });
    localStorage.setItem('token', token);

    service.changePassword('old-password', 'new-password').subscribe();

    const apiRequest = http.expectOne(apiUrl('/auth/change-password'));
    apiRequest.flush(
      { message: 'Not Found' },
      { status: 404, statusText: 'Not Found' }
    );

    const cognitoRequest = http.expectOne(COGNITO_ENDPOINT);
    expect(cognitoRequest.request.method).toBe('POST');
    expect(cognitoRequest.request.headers.get('X-Amz-Target')).toBe(
      'AWSCognitoIdentityProviderService.ChangePassword'
    );
    expect(cognitoRequest.request.body).toEqual({
      AccessToken: token,
      PreviousPassword: 'old-password',
      ProposedPassword: 'new-password',
    });

    cognitoRequest.flush({});
    localStorage.removeItem('token');
  });

  it('gets a Cognito access token before direct password change when only an id token is stored', () => {
    const idToken = jwt({
      exp: 2000000000,
      token_use: 'id',
      email: 'admin@example.com',
      'cognito:groups': ['ROLE_ADMIN'],
    });
    const accessToken = jwt({ exp: 2000000000, token_use: 'access' });
    localStorage.setItem('token', idToken);

    service.changePassword('old-password', 'new-password').subscribe();

    const apiRequest = http.expectOne(apiUrl('/auth/change-password'));
    apiRequest.flush(
      { message: 'Not Found' },
      { status: 404, statusText: 'Not Found' }
    );

    const authRequest = http.expectOne(COGNITO_ENDPOINT);
    expect(authRequest.request.headers.get('X-Amz-Target')).toBe(
      'AWSCognitoIdentityProviderService.InitiateAuth'
    );
    expect(authRequest.request.body).toEqual({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: '4enfk4kbskekcodme7n80d10ju',
      AuthParameters: {
        USERNAME: 'admin@example.com',
        PASSWORD: 'old-password',
      },
    });

    authRequest.flush({
      AuthenticationResult: {
        AccessToken: accessToken,
      },
    });

    const changeRequest = http.expectOne(COGNITO_ENDPOINT);
    expect(changeRequest.request.headers.get('X-Amz-Target')).toBe(
      'AWSCognitoIdentityProviderService.ChangePassword'
    );
    expect(changeRequest.request.body).toEqual({
      AccessToken: accessToken,
      PreviousPassword: 'old-password',
      ProposedPassword: 'new-password',
    });

    changeRequest.flush({});
    localStorage.removeItem('token');
  });
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
