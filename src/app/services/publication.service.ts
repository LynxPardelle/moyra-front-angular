import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GlobalPublication } from './global';

@Injectable()
export class PublicationService {
  public urlPublication: string;
  public identity: any;
  public token: any;

  constructor(private _http: HttpClient) {
    this.urlPublication = GlobalPublication.url;
  }

  // Pruebas
  pruebas() {
    return 'Soy el servicio de publication.';
  }

  // Create
  createPublication(publication: any): Observable<any> {
    let body = JSON.stringify(publication);
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: this.getToken(),
    });

    return this._http.post(this.urlPublication + 'publication', body, {
      headers: headers,
    });
  }

  // Get
  getPublications(
    page: number = 0,
    ipp: number = 0,
    sort: string = '-create_at'
  ): Observable<any> {
    var publications = 'publications/' + page + '/' + ipp + '/' + sort;

    return this._http.get(this.urlPublication + publications);
  }

  getPublication(id: string): Observable<any> {
    return this._http.get(this.urlPublication + 'publication/' + id);
  }

  // Put
  updatePublication(id: string, publication: any): Observable<any> {
    let body = JSON.stringify(publication);
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: this.getToken(),
    });

    return this._http.put(this.urlPublication + 'publication/' + id, body, {
      headers: headers,
    });
  }

  // Delete
  deletePublication(id: string): Observable<any> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: this.getToken(),
    });

    return this._http.delete(this.urlPublication + 'publication/' + id, {
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
