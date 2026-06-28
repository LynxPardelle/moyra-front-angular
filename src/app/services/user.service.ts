import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, catchError, finalize, of, shareReplay, switchMap, throwError } from 'rxjs';
import {
  ApiRuntime,
  CognitoRuntime,
  GlobalUser,
  apiUrl,
  jsonAuthHeaders,
  storedToken,
  supportsCredentialedAuthCookies,
} from './global';
import { readStoredAuthSession } from '../store/auth/auth.storage';
import { decodeJwtPayload } from '../utils/auth-token';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  public urlUser: string;
  public identity: any;
  public token: any;
  private refreshSessionRequest$?: Observable<any>;

  constructor(private _http: HttpClient) {
    this.urlUser = GlobalUser.url;
  }

  pruebas() {
    return 'Soy el servicio de user.';
  }

  createUser(user: any): Observable<any> {
    const body = JSON.stringify(user);
    const headers = this.authHeaders();
    const createUserUrl = ApiRuntime.isV2
      ? apiUrl('/users')
      : this.urlUser + 'user';

    return this._http.post(createUserUrl, body, {
      headers: headers,
    });
  }

  getUsers(
    page: number = 0,
    ipp: number = 0,
    sort: string = '-create_at'
  ): Observable<any> {
    if (ApiRuntime.isV2) {
      const params = new HttpParams()
        .set('page', `${page}`)
        .set('ipp', `${ipp}`)
        .set('sort', sort);

      return this._http.get(apiUrl('/users'), {
        headers: this.authHeaders(),
        params,
      });
    }

    const users = 'users/' + page + '/' + ipp + '/' + sort;

    return this._http.get(this.urlUser + users);
  }

  getUser(id: string): Observable<any> {
    const getUserUrl = ApiRuntime.isV2
      ? apiUrl(`/users/${encodeURIComponent(id)}`)
      : this.urlUser + 'user/' + id;

    return this._http.get(getUserUrl, {
      headers: this.authHeaders(),
    });
  }

  login(userToLogin: any, gettoken: any = null): Observable<any> {
    const credentials = {
      email: userToLogin.email,
      password: userToLogin.password,
      ...(gettoken != null ? { gettoken } : {}),
    };
    const body = JSON.stringify(credentials);
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const loginUrl = ApiRuntime.isV2
      ? apiUrl('/auth/login')
      : this.urlUser + 'login';

    return this._http.post(loginUrl, body, {
      headers: headers,
      withCredentials: supportsCredentialedAuthCookies(),
    });
  }

  refreshSession(): Observable<any> {
    if (!ApiRuntime.isV2) {
      return this._http.post(this.urlUser + 'refresh', {});
    }

    if (!supportsCredentialedAuthCookies()) {
      return of(null);
    }

    if (this.refreshSessionRequest$) {
      return this.refreshSessionRequest$;
    }

    this.refreshSessionRequest$ = this._http.post(
      apiUrl('/auth/refresh'),
      {},
      {
        headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
        withCredentials: true,
      }
    ).pipe(
      finalize(() => {
        this.refreshSessionRequest$ = undefined;
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    return this.refreshSessionRequest$;
  }

  logoutSession(): Observable<any> {
    if (!ApiRuntime.isV2) {
      return this._http.post(this.urlUser + 'logout', {});
    }

    if (!supportsCredentialedAuthCookies()) {
      return of({ status: 'skipped' });
    }

    return this._http.post(
      apiUrl('/auth/logout'),
      {},
      {
        headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
        withCredentials: true,
      }
    );
  }

  completeNewPasswordChallenge(
    email: string,
    session: string,
    newPassword: string
  ): Observable<any> {
    const body = JSON.stringify({
      email,
      challengeName: 'NEW_PASSWORD_REQUIRED',
      session,
      newPassword,
    });
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    return this._http.post(apiUrl('/auth/login'), body, {
      headers: headers,
      withCredentials: supportsCredentialedAuthCookies(),
    });
  }

  requestPasswordReset(email: string): Observable<any> {
    const body = JSON.stringify({ email });
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    return this._http.post(apiUrl('/auth/forgot-password'), body, {
      headers,
      withCredentials: false,
    }).pipe(
      catchError((error: HttpErrorResponse) =>
        this.shouldFallbackToCognito(error)
          ? this.requestPasswordResetWithCognito(email)
          : throwError(() => error)
      )
    );
  }

  confirmPasswordReset(
    email: string,
    code: string,
    newPassword: string
  ): Observable<any> {
    const body = JSON.stringify({ email, code, newPassword });
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    return this._http.post(apiUrl('/auth/confirm-forgot-password'), body, {
      headers,
      withCredentials: false,
    }).pipe(
      catchError((error: HttpErrorResponse) =>
        this.shouldFallbackToCognito(error)
          ? this.confirmPasswordResetWithCognito(email, code, newPassword)
          : throwError(() => error)
      )
    );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    const body = JSON.stringify({ currentPassword, newPassword });
    const headers = this.authHeaders();

    return this._http.post(apiUrl('/auth/change-password'), body, {
      headers,
    }).pipe(
      catchError((error: HttpErrorResponse) =>
        this.shouldFallbackToCognito(error)
          ? this.changePasswordWithCognito(currentPassword, newPassword)
          : throwError(() => error)
      )
    );
  }

  updateUser(id: string, user: any): Observable<any> {
    const body = JSON.stringify(user);
    const headers = this.authHeaders();
    const updateUserUrl = ApiRuntime.isV2
      ? apiUrl(`/users/${encodeURIComponent(id)}`)
      : this.urlUser + 'user/' + id;

    return this._http.put(updateUserUrl, body, {
      headers: headers,
    });
  }

  deleteUser(id: string): Observable<any> {
    const headers = this.authHeaders();

    return this._http.delete(this.urlUser + 'user/' + id, {
      headers: headers,
    });
  }

  getIdentity() {
    this.identity = readStoredAuthSession()?.identity || null;
    return this.identity;
  }

  getToken() {
    this.token = storedToken();
    return this.token;
  }

  private authHeaders(): HttpHeaders {
    return new HttpHeaders(jsonAuthHeaders(this.getToken()));
  }

  private requestPasswordResetWithCognito(email: string): Observable<any> {
    return this._http.post(
      CognitoRuntime.endpoint,
      {
        ClientId: CognitoRuntime.userPoolClientId,
        Username: email,
      },
      {
        headers: this.cognitoHeaders('ForgotPassword'),
      }
    ).pipe(
      catchError((error: HttpErrorResponse) =>
        this.isCognitoAccountLookupError(error)
          ? of(this.passwordResetRequestedResponse())
          : throwError(() => error)
      )
    );
  }

  private confirmPasswordResetWithCognito(
    email: string,
    code: string,
    newPassword: string
  ): Observable<any> {
    return this._http.post(
      CognitoRuntime.endpoint,
      {
        ClientId: CognitoRuntime.userPoolClientId,
        Username: email,
        ConfirmationCode: code,
        Password: newPassword,
      },
      {
        headers: this.cognitoHeaders('ConfirmForgotPassword'),
      }
    );
  }

  private changePasswordWithCognito(
    currentPassword: string,
    newPassword: string
  ): Observable<any> {
    return this.cognitoAccessTokenForPasswordChange(currentPassword).pipe(
      switchMap((accessToken) =>
        this.sendCognitoChangePassword(accessToken, currentPassword, newPassword)
      )
    );
  }

  private sendCognitoChangePassword(
    accessToken: string,
    currentPassword: string,
    newPassword: string
  ): Observable<any> {
    return this._http.post(
      CognitoRuntime.endpoint,
      {
        AccessToken: accessToken,
        PreviousPassword: currentPassword,
        ProposedPassword: newPassword,
      },
      {
        headers: this.cognitoHeaders('ChangePassword'),
      }
    );
  }

  private cognitoAccessTokenForPasswordChange(
    currentPassword: string
  ): Observable<string> {
    const token = this.getToken();
    if (this.isCognitoAccessToken(token)) {
      return of(String(token));
    }

    const username = this.currentUsername();
    if (!username) {
      return throwError(() => new Error('No pudimos identificar la cuenta.'));
    }

    return this._http.post<any>(
      CognitoRuntime.endpoint,
      {
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: CognitoRuntime.userPoolClientId,
        AuthParameters: {
          USERNAME: username,
          PASSWORD: currentPassword,
        },
      },
      {
        headers: this.cognitoHeaders('InitiateAuth'),
      }
    ).pipe(
      switchMap((response) => {
        const accessToken = response?.AuthenticationResult?.AccessToken;
        return accessToken
          ? of(accessToken)
          : throwError(() => new Error('No pudimos renovar la sesión.'));
      })
    );
  }

  private cognitoHeaders(action: string): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': `AWSCognitoIdentityProviderService.${action}`,
    });
  }

  private shouldFallbackToCognito(error: HttpErrorResponse): boolean {
    return (
      ApiRuntime.isV2 &&
      Boolean(CognitoRuntime.userPoolClientId) &&
      (error.status === 404 || error.status === 0)
    );
  }

  private isCognitoAccessToken(token: string | null | undefined): boolean {
    const payload = decodeJwtPayload(String(token || ''));
    return payload?.['token_use'] === 'access';
  }

  private currentUsername(): string {
    const identity = this.getIdentity();
    const username =
      identity?.email ||
      identity?.mail ||
      identity?.username ||
      identity?.['cognito:username'];

    return typeof username === 'string' ? username.trim() : '';
  }

  private isCognitoAccountLookupError(error: HttpErrorResponse): boolean {
    const type = String(
      error.error?.__type ||
      error.headers?.get('x-amzn-ErrorType') ||
      ''
    );

    return (
      type.includes('UserNotFoundException') ||
      type.includes('InvalidParameterException')
    );
  }

  private passwordResetRequestedResponse(): any {
    return {
      status: 'success',
      message: 'Si el correo existe, enviaremos un código de recuperación.',
    };
  }
}
