import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import {
  ApiRuntime,
  GlobalUser,
  apiUrl,
  jsonAuthHeaders,
  storedToken,
  supportsCredentialedAuthCookies,
} from './global';
import { readStoredAuthSession } from '../store/auth/auth.storage';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  public urlUser: string;
  public identity: any;
  public token: any;

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
    const users = 'users/' + page + '/' + ipp + '/' + sort;

    return this._http.get(this.urlUser + users);
  }

  getUser(id: string): Observable<any> {
    return this._http.get(this.urlUser + 'user/' + id);
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

    return this._http.post(
      apiUrl('/auth/refresh'),
      {},
      {
        headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
        withCredentials: true,
      }
    );
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

  updateUser(id: string, user: any): Observable<any> {
    const body = JSON.stringify(user);
    const headers = this.authHeaders();

    return this._http.put(this.urlUser + 'user/' + id, body, {
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
}
