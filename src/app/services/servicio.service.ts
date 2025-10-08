import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GlobalServicio } from './global';

@Injectable()
export class ServicioService {
  public urlServicio: string;
  public identity: any;
  public token: any;

  constructor(private _http: HttpClient) {
    this.urlServicio = GlobalServicio.url;
  }

  // Pruebas
  pruebas() {
    return 'Soy el servicio de servicio.';
  }

  // Create
  createServicio(servicio: any): Observable<any> {
    let body = JSON.stringify(servicio);
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: this.getToken(),
    });

    return this._http.post(this.urlServicio + 'servicio', body, {
      headers: headers,
    });
  }

  // Get
  getServicios(
    page: number = 0,
    ipp: number = 0,
    sort: string = '-create_at'
  ): Observable<any> {
    var servicios = 'servicios/' + page + '/' + ipp + '/' + sort;

    return this._http.get(this.urlServicio + servicios);
  }

  getServicio(id: string): Observable<any> {
    return this._http.get(this.urlServicio + 'servicio/' + id);
  }

  // Put
  updateServicio(id: string, servicio: any): Observable<any> {
    let body = JSON.stringify(servicio);
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: this.getToken(),
    });

    return this._http.put(this.urlServicio + 'servicio/' + id, body, {
      headers: headers,
    });
  }

  // Delete
  deleteServicio(id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: this.getToken(),
    });

    return this._http.delete(this.urlServicio + 'servicio/' + id, {
      headers: headers,
    });
  }

  // LocalStorage
  getToken() {
    this.token = localStorage.getItem('token');

    if (!this.token) {
      this.token = sessionStorage.getItem('token');
    }

    return this.token;
  }
}
