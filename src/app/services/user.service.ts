import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GlobalUser } from './global';

@Injectable()
export class UserService {
  public urlUser: string;
  public identity: any;
  public token: any;

  constructor(private _http: HttpClient) {
    this.urlUser = GlobalUser.url;
  }

  // Pruebas
  pruebas() {
    return 'Soy el servicio de user.';
  }

  // Create
  createUser(user: any): Observable<any> {
    let body = JSON.stringify(user);
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: this.getToken(),
    });

    return this._http.post(this.urlUser + 'user', body, {
      headers: headers,
    });
  }

  // Get
  getUsers(
    page: number = 0,
    ipp: number = 0,
    sort: string = '-create_at'
  ): Observable<any> {
    var users = 'users/' + page + '/' + ipp + '/' + sort;

    return this._http.get(this.urlUser + users);
  }

  getUser(id: string): Observable<any> {
    return this._http.get(this.urlUser + 'user/' + id);
  }

  login(user_to_login: any, gettoken: any = null): Observable<any> {
    if (gettoken != null) {
      user_to_login.gettoken = gettoken;
    }

    let body = JSON.stringify(user_to_login);

    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    return this._http.post(this.urlUser + 'login', body, {
      headers: headers,
    });
  }

  // Put
  updateUser(id: string, user: any): Observable<any> {
    let body = JSON.stringify(user);
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: this.getToken(),
    });

    return this._http.put(this.urlUser + 'user/' + id, body, {
      headers: headers,
    });
  }

  // Delete
  deleteUser(id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: this.getToken(),
    });

    return this._http.delete(this.urlUser + 'user/' + id, {
      headers: headers,
    });
  }

  // LocalStorage
  getIdentity() {
    let identity = localStorage.getItem('identity');
    if (identity != null) {
      identity = JSON.parse(identity);
      if (identity != 'undefined') {
        this.identity = identity;
      } else {
        this.identity = null;
      }

      return this.identity;
    } else {
      let identity = sessionStorage.getItem('identity');
      if (identity != null) {
        identity = JSON.parse(identity);
        if (identity != 'undefined') {
          this.identity = identity;
        } else {
          this.identity = null;
        }

        return this.identity;
      } else {
        return null;
      }
    }
  }

  getToken() {
    this.token = localStorage.getItem('token');

    if (!this.token) {
      this.token = sessionStorage.getItem('token');
    }

    return this.token;
  }
}
